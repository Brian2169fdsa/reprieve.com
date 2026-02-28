// POST /api/ai-chat
// Real-time AI chat for the compliance agent slideout panels.
// Each agent has a system prompt calibrated to its role and the org's data context.

import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentPeriod } from '@/lib/agents/index';

// ── Per-agent system prompts ───────────────────────────────────────────────────

function buildSystemPrompt(
  agent: string,
  orgName: string,
  contextData: Record<string, unknown>
): string {
  const today = new Date().toISOString().split('T')[0];
  const period = getCurrentPeriod();
  const baseContext = `You are an AI compliance assistant embedded in REPrieve.ai for ${orgName}.
Today: ${today} | Current period: ${period}
Organization context: ${JSON.stringify(contextData, null, 2)}

Rules:
- Be direct and specific. Use data from the context above when answering.
- Keep responses concise (2-4 paragraphs max unless listing items).
- If asked about something not in your context, say so and offer to run a deeper analysis.
- Never make up specific numbers or dates that aren't in the context.
- Format lists with dashes, not bullets. Use **bold** for emphasis.`;

  switch (agent) {
    case 'policy_guardian':
      return `${baseContext}

You are the Policy Guardian agent. Your expertise:
- Policy conflict detection and cross-referencing
- Review cadence tracking and deadline management
- Regulatory change impact assessment (AHCCCS, HIPAA, OIG, TJC, CARF)
- Policy approval workflow guidance
You do NOT edit policies directly — you flag issues and recommend actions for humans.`;

    case 'compliance_monitor':
      return `${baseContext}

You are the Compliance Monitor agent. Your expertise:
- Monthly checkpoint completion tracking and analysis
- Overdue item detection and escalation guidance
- Staff assignment and accountability patterns
- Regulatory requirement mapping (AHCCCS, OIG, HIPAA, Safety)
- Evidence requirement enforcement ("passed without proof" = compliance gap)`;

    case 'evidence_librarian':
      return `${baseContext}

You are the Evidence Librarian agent. Your expertise:
- Evidence gap identification by standard, period, and staff
- Audit binder organization and coverage analysis
- Document type requirements per checkpoint
- "We did it but can't prove it" risk identification
- Evidence naming and tagging best practices for audit readiness`;

    case 'qm_orchestrator':
      return `${baseContext}

You are the QM Orchestrator agent. Your expertise:
- Monthly QM meeting packet assembly
- Audit readiness score calculation and interpretation
- Finding severity assessment and committee escalation
- CAPA tracking and trend analysis
- Executive summary drafting for leadership review`;

    default:
      return `${baseContext}

You are a compliance AI assistant helping the team manage regulatory requirements and quality management.`;
  }
}

// ── Fetch org context for the agent ───────────────────────────────────────────

async function fetchOrgContext(
  orgId: string,
  agent: string
): Promise<Record<string, unknown>> {
  const admin = createAdminClient();
  const period = getCurrentPeriod();

  try {
    if (agent === 'compliance_monitor') {
      const [{ data: checkpoints }, { data: recentRuns }] = await Promise.all([
        admin
          .from('checkpoints')
          .select('status, due_date, assignee_name, control:controls(title, standard)')
          .eq('org_id', orgId)
          .eq('period', period)
          .limit(50),
        admin
          .from('ai_agent_runs')
          .select('created_at, status, output_summary')
          .eq('org_id', orgId)
          .eq('agent', 'compliance_monitor')
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const now = new Date();
      const statuses = { pending: 0, in_progress: 0, passed: 0, failed: 0, overdue: 0 };
      (checkpoints ?? []).forEach((c) => {
        const s = c.status as keyof typeof statuses;
        if (s in statuses) statuses[s]++;
        if (c.status === 'pending' && new Date(c.due_date) < now) statuses.overdue++;
      });

      return {
        period,
        checkpoints: {
          total: (checkpoints ?? []).length,
          ...statuses,
        },
        lastRunSummary: recentRuns?.[0]?.output_summary ?? 'No recent run',
      };
    }

    if (agent === 'evidence_librarian') {
      const { data: evidenceCount } = await admin
        .from('evidence')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId);

      const { data: passedCheckpoints } = await admin
        .from('checkpoints')
        .select('id')
        .eq('org_id', orgId)
        .eq('status', 'passed');

      return {
        period,
        totalEvidence: (evidenceCount as unknown as number) ?? 0,
        passedCheckpoints: (passedCheckpoints ?? []).length,
      };
    }

    if (agent === 'policy_guardian') {
      const { data: policies } = await admin
        .from('policies')
        .select('title, code, status, next_review_date, category')
        .eq('org_id', orgId)
        .order('next_review_date', { ascending: true })
        .limit(20);

      const now = new Date();
      const overdue = (policies ?? []).filter(
        (p) => p.next_review_date && new Date(p.next_review_date) < now
      ).length;

      return {
        totalPolicies: (policies ?? []).length,
        overdueReview: overdue,
        policies: (policies ?? []).slice(0, 10).map((p) => ({
          code: p.code,
          title: p.title,
          status: p.status,
          nextReview: p.next_review_date,
        })),
      };
    }

    if (agent === 'qm_orchestrator') {
      const [{ data: meeting }, { data: findings }, { data: capas }] =
        await Promise.all([
          admin
            .from('qm_meetings')
            .select('status, audit_readiness_score, executive_summary')
            .eq('org_id', orgId)
            .eq('period', period)
            .maybeSingle(),
          admin
            .from('findings')
            .select('severity, title')
            .eq('org_id', orgId)
            .limit(10),
          admin
            .from('capas')
            .select('status, title, due_date')
            .eq('org_id', orgId)
            .neq('status', 'closed')
            .limit(10),
        ]);

      return {
        period,
        meeting: meeting ?? null,
        openFindings: (findings ?? []).length,
        activeCAPAs: (capas ?? []).length,
        recentFindings: (findings ?? []).slice(0, 5).map((f) => ({
          severity: f.severity,
          title: f.title,
        })),
      };
    }
  } catch {
    // If context fetch fails, return minimal data
  }

  return { period };
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      agent = 'compliance_monitor',
      orgId,
    } = body as { message: string; agent: string; orgId?: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get user + org if not provided
    let resolvedOrgId = orgId;
    let orgName = 'Your Organization';

    try {
      const userClient = await createClient();
      const { data: { user } } = await userClient.auth.getUser();

      if (user) {
        const admin = createAdminClient();
        const { data: membership } = await admin
          .from('org_members')
          .select('org_id, organizations(name)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (membership?.org_id) {
          resolvedOrgId = resolvedOrgId ?? membership.org_id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orgName = (membership as any).organizations?.name ?? orgName;
        }
      }
    } catch {
      // Continue without org context
    }

    // Fetch agent-specific context
    const contextData = resolvedOrgId
      ? await fetchOrgContext(resolvedOrgId, agent)
      : {};

    // Build system prompt
    const systemPrompt = buildSystemPrompt(agent, orgName, contextData);

    // Call Claude
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      prompt: message,
      maxTokens: 1000,
    });

    return NextResponse.json({ message: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // API key not configured — return a helpful error message in chat format
    if (message.includes('API key') || message.includes('ANTHROPIC')) {
      return NextResponse.json({
        message:
          'AI chat is not configured yet. To enable it, add your **ANTHROPIC_API_KEY** to Vercel environment variables and redeploy.',
      });
    }

    return NextResponse.json({ message: `Error: ${message}` });
  }
}
