// POST /api/agents
// Triggers an AI agent run for the authenticated user's organization.
// Body: { agent: 'compliance_monitor' | 'evidence_librarian' | 'policy_guardian' | 'qm_orchestrator' }

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { runComplianceMonitor } from '@/lib/agents/compliance-monitor';
import { runEvidenceLibrarian } from '@/lib/agents/evidence-librarian';
import { runPolicyGuardian } from '@/lib/agents/policy-guardian';
import { runQMOrchestrator } from '@/lib/agents/qm-orchestrator';

const VALID_AGENTS = [
  'compliance_monitor',
  'evidence_librarian',
  'policy_guardian',
  'qm_orchestrator',
] as const;

type ValidAgent = (typeof VALID_AGENTS)[number];

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const userClient = await createClient();
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { agent, period } = body as { agent: string; period?: string };

    if (!agent || !VALID_AGENTS.includes(agent as ValidAgent)) {
      return NextResponse.json(
        {
          error: `Invalid agent. Must be one of: ${VALID_AGENTS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get org
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!membership?.org_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Only admins and compliance role can trigger agents manually
    const allowedRoles = ['admin', 'compliance', 'supervisor'];
    if (!allowedRoles.includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to run agents' },
        { status: 403 }
      );
    }

    const orgId = membership.org_id;

    // Run the requested agent
    let result: { summary: string; suggestions: number; meetingId?: string };

    switch (agent as ValidAgent) {
      case 'compliance_monitor':
        result = await runComplianceMonitor(orgId, 'manual');
        break;
      case 'evidence_librarian':
        result = await runEvidenceLibrarian(orgId, 'manual');
        break;
      case 'policy_guardian':
        result = await runPolicyGuardian(orgId, 'manual');
        break;
      case 'qm_orchestrator':
        result = await runQMOrchestrator(orgId, 'manual', period);
        break;
      default:
        return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      agent,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent run failed';
    // Check for missing API key
    if (message.includes('API key') || message.includes('ANTHROPIC')) {
      return NextResponse.json(
        {
          error:
            'ANTHROPIC_API_KEY is not configured. Add it to your Vercel environment variables.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
