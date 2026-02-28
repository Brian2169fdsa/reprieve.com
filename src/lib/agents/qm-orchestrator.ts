// QM Orchestrator Agent
// Assembles monthly QM meeting packets: calculates audit readiness scores,
// compiles findings, and drafts executive summaries for leadership review.

import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getCurrentPeriod,
  startAgentRun,
  completeAgentRun,
  failAgentRun,
  extractJSON,
  type AgentSuggestionInput,
} from './index';

export async function runQMOrchestrator(
  orgId: string,
  triggerType: 'manual' | 'scheduled' | 'event' = 'manual',
  targetPeriod?: string
): Promise<{ summary: string; suggestions: number; meetingId?: string }> {
  const admin = createAdminClient();
  const period = targetPeriod ?? getCurrentPeriod();

  const { runId, startTime } = await startAgentRun(
    orgId,
    'qm_orchestrator',
    triggerType,
    `QM meeting packet assembly for ${period}`
  );

  try {
    // ── Gather period data ────────────────────────────────────────────────────
    const periodStart = period + '-01';
    const [yr, mo] = period.split('-').map(Number);
    const lastDay = new Date(yr, mo, 0).getDate();
    const periodEnd = `${period}-${lastDay}`;

    const [
      { data: checkpoints },
      { data: findings },
      { data: capas },
      { data: scoreHistory },
      { data: existingMeeting },
    ] = await Promise.all([
      admin
        .from('checkpoints')
        .select(
          'id, status, attestation, due_date, control:controls(title, standard)'
        )
        .eq('org_id', orgId)
        .gte('due_date', periodStart)
        .lte('due_date', periodEnd),
      admin
        .from('findings')
        .select('id, title, severity, standard, description, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(20),
      admin
        .from('capas')
        .select('id, title, status, due_date, owner_id')
        .eq('org_id', orgId)
        .neq('status', 'closed')
        .order('due_date', { ascending: true }),
      admin
        .from('audit_readiness_scores')
        .select(
          'period, overall_score, checkpoint_score, evidence_score, policy_score, capa_score, calculated_at'
        )
        .eq('org_id', orgId)
        .order('period', { ascending: false })
        .limit(6),
      admin
        .from('qm_meetings')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('period', period)
        .maybeSingle(),
    ]);

    // ── Calculate audit readiness score ───────────────────────────────────────
    const totalCP = (checkpoints ?? []).length;
    const passedCP = (checkpoints ?? []).filter(
      (c) => c.status === 'passed'
    ).length;
    const failedCP = (checkpoints ?? []).filter(
      (c) => c.status === 'failed' || c.status === 'overdue'
    ).length;

    // Evidence coverage for passed checkpoints
    const passedIds = (checkpoints ?? [])
      .filter((c) => c.status === 'passed')
      .map((c) => c.id);
    let evidenceCount = 0;
    if (passedIds.length > 0) {
      const { data: evidence } = await admin
        .from('evidence')
        .select('checkpoint_id')
        .in('checkpoint_id', passedIds);
      const coveredIds = new Set((evidence ?? []).map((e) => e.checkpoint_id));
      evidenceCount = coveredIds.size;
    }

    // Policy score: % of policies that are effective and not overdue for review
    const { data: policies } = await admin
      .from('policies')
      .select('status, next_review_date')
      .eq('org_id', orgId);

    const effectivePolicies = (policies ?? []).filter(
      (p) => p.status === 'effective'
    ).length;
    const totalPolicies = (policies ?? []).length;
    const overdueReview = (policies ?? []).filter(
      (p) =>
        p.next_review_date && new Date(p.next_review_date) < new Date()
    ).length;

    // CAPA score: % closed on time (approximate — track against due dates)
    const { data: allCapas } = await admin
      .from('capas')
      .select('status, due_date')
      .eq('org_id', orgId);
    const closedCapas = (allCapas ?? []).filter(
      (c) => c.status === 'closed'
    ).length;
    const overdueCapas = (allCapas ?? []).filter(
      (c) =>
        c.status !== 'closed' && c.due_date && new Date(c.due_date) < new Date()
    ).length;

    // Calculate component scores
    const checkpointScore =
      totalCP > 0 ? Math.round((passedCP / totalCP) * 100) : 0;
    const evidenceScore =
      passedIds.length > 0
        ? Math.round((evidenceCount / passedIds.length) * 100)
        : 0;
    const policyScore =
      totalPolicies > 0
        ? Math.round(
            ((effectivePolicies - overdueReview) / totalPolicies) * 100
          )
        : 0;
    const capaScore =
      (allCapas ?? []).length > 0
        ? Math.round(
            (closedCapas / (closedCapas + (capas ?? []).length + overdueCapas)) *
              100
          )
        : 100;

    const overallScore = Math.round(
      checkpointScore * 0.35 +
        evidenceScore * 0.25 +
        Math.max(0, policyScore) * 0.25 +
        capaScore * 0.15
    );

    // Write audit readiness score
    await admin.from('audit_readiness_scores').upsert(
      {
        org_id: orgId,
        period,
        overall_score: overallScore,
        checkpoint_score: checkpointScore,
        evidence_score: evidenceScore,
        policy_score: Math.max(0, policyScore),
        capa_score: capaScore,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,period' }
    );

    // ── Build prompt for executive summary ───────────────────────────────────
    const prompt = `You are the QM Orchestrator AI agent for REPrieve.ai, assembling the monthly Quality Management meeting packet for ${period}.

AUDIT READINESS SCORE (${period}): ${overallScore}%
- Checkpoint completion: ${checkpointScore}% (${passedCP}/${totalCP} passed)
- Evidence coverage: ${evidenceScore}% of passed checkpoints have evidence
- Policy health: ${Math.max(0, policyScore)}% (effective and current)
- CAPA closure rate: ${capaScore}%

SCORE HISTORY (last 6 periods):
${(scoreHistory ?? [])
  .reverse()
  .map((s) => `- ${s.period}: ${s.overall_score?.toFixed(1) ?? '?'}%`)
  .join('\n')}

OPEN FINDINGS (${(findings ?? []).length} total):
${(findings ?? [])
  .slice(0, 8)
  .map((f) => `- [${f.severity?.toUpperCase()}] ${f.title} (${f.standard ?? 'N/A'})`)
  .join('\n')}

OPEN CAPAs (${(capas ?? []).length} active):
${(capas ?? [])
  .slice(0, 8)
  .map(
    (c) =>
      `- ${c.title} | Status: ${c.status} | Due: ${c.due_date ?? 'No date'}`
  )
  .join('\n')}

CHECKPOINT FAILURES (${failedCP} failed this period):
${(checkpoints ?? [])
  .filter((c) => c.status === 'failed' || c.status === 'overdue')
  .slice(0, 6)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .map((c) => `- ${(c as any).control?.title ?? 'Unknown'} (${(c as any).control?.standard ?? '?'})`)
  .join('\n')}

Your task: Generate the QM meeting packet content.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "summary": "3-4 sentence executive summary suitable for leadership review. Include the overall audit readiness score, key trend (improving/declining/stable), and the most critical issue requiring committee attention.",
  "agenda": [
    "Review audit readiness score (${overallScore}% for ${period})",
    "Checkpoint completion review — ${failedCP} failures this period",
    "Evidence gap analysis",
    "Open findings review",
    "CAPA status update",
    "Action items and assignments"
  ],
  "suggestions": [
    {
      "entity_type": "qm_meeting",
      "suggestion_type": "review",
      "title": "Short, specific title about a finding that needs committee attention",
      "description": "Detailed description of the issue and recommended committee action",
      "confidence": 0.85
    }
  ]
}

Generate 2-4 suggestions focused on items that REQUIRE committee discussion and decision. These are escalations, not routine items.`;

    const { text, usage } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt,
      maxTokens: 2500,
    });

    // ── Parse results ─────────────────────────────────────────────────────────
    const parsed = extractJSON(text);
    const suggestions: AgentSuggestionInput[] =
      (parsed?.suggestions as AgentSuggestionInput[]) ?? [];
    const executiveSummary =
      (parsed?.summary as string) ??
      `QM packet for ${period}. Overall audit readiness: ${overallScore}%. ${passedCP}/${totalCP} checkpoints passed. ${(findings ?? []).length} open findings, ${(capas ?? []).length} active CAPAs.`;
    const agenda = (parsed?.agenda as string[]) ?? [
      'Review audit readiness score',
      'Checkpoint completion review',
      'Findings review',
      'CAPA status update',
    ];

    // ── Create or update QM meeting record ───────────────────────────────────
    let meetingId: string | undefined;

    if (existingMeeting) {
      // Update existing meeting with new packet data
      await admin
        .from('qm_meetings')
        .update({
          executive_summary: executiveSummary,
          audit_readiness_score: overallScore,
          agenda: agenda,
          status: 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMeeting.id);
      meetingId = existingMeeting.id;
    } else {
      // Create new meeting record
      const { data: newMeeting } = await admin
        .from('qm_meetings')
        .insert({
          org_id: orgId,
          period,
          status: 'ready',
          executive_summary: executiveSummary,
          audit_readiness_score: overallScore,
          agenda: agenda,
        })
        .select('id')
        .single();
      meetingId = newMeeting?.id;
    }

    await completeAgentRun(
      runId,
      orgId,
      'qm_orchestrator',
      suggestions,
      executiveSummary,
      usage.totalTokens ?? 0,
      startTime
    );

    return { summary: executiveSummary, suggestions: suggestions.length, meetingId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await failAgentRun(runId, msg, startTime);
    throw err;
  }
}
