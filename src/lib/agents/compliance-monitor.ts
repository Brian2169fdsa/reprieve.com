// Compliance Monitor Agent
// Analyzes checkpoint completion rates, detects overdue items, and surfaces
// evidence gaps. Triggered monthly (1st) and daily for overdue detection.

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

export async function runComplianceMonitor(
  orgId: string,
  triggerType: 'manual' | 'scheduled' | 'event' = 'manual'
): Promise<{ summary: string; suggestions: number }> {
  const admin = createAdminClient();
  const period = getCurrentPeriod();

  const { runId, startTime } = await startAgentRun(
    orgId,
    'compliance_monitor',
    triggerType,
    `Monthly compliance checkpoint analysis for ${period}`
  );

  try {
    // ── Gather data ───────────────────────────────────────────────────────────
    const [{ data: checkpoints }, { data: controls }, { data: allCheckpoints }] =
      await Promise.all([
        // Current period checkpoints
        admin
          .from('checkpoints')
          .select(
            'id, status, due_date, assignee_name, period, control:controls(code, title, standard, frequency)'
          )
          .eq('org_id', orgId)
          .eq('period', period)
          .order('due_date'),
        // All active controls
        admin
          .from('controls')
          .select('code, title, standard, frequency, is_active')
          .eq('org_id', orgId)
          .eq('is_active', true),
        // All checkpoints (for pattern analysis across periods)
        admin
          .from('checkpoints')
          .select('status, period, control_id')
          .eq('org_id', orgId)
          .order('period', { ascending: false })
          .limit(200),
      ]);

    // Check evidence coverage for passed checkpoints
    const passedIds = (checkpoints ?? [])
      .filter((c) => c.status === 'passed')
      .map((c) => c.id);

    const evidenceCoverage: Record<string, number> = {};
    if (passedIds.length > 0) {
      const { data: evidence } = await admin
        .from('evidence')
        .select('checkpoint_id')
        .in('checkpoint_id', passedIds);
      (evidence ?? []).forEach((e) => {
        if (e.checkpoint_id)
          evidenceCoverage[e.checkpoint_id] =
            (evidenceCoverage[e.checkpoint_id] || 0) + 1;
      });
    }

    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdue = (checkpoints ?? []).filter(
      (c) => c.status === 'pending' && new Date(c.due_date) < now
    );
    const passed = (checkpoints ?? []).filter((c) => c.status === 'passed');
    const failed = (checkpoints ?? []).filter((c) => c.status === 'failed');
    const passedNoEvidence = passed.filter((c) => !evidenceCoverage[c.id]);

    // Detect repeat failures (same control failing in multiple periods)
    const failuresByControl: Record<string, number> = {};
    (allCheckpoints ?? [])
      .filter((c) => c.status === 'failed' || c.status === 'overdue')
      .forEach((c) => {
        failuresByControl[c.control_id] =
          (failuresByControl[c.control_id] || 0) + 1;
      });
    const repeatFailures = Object.entries(failuresByControl)
      .filter(([, count]) => count >= 2)
      .map(([id, count]) => ({ control_id: id, count }));

    // ── Build prompt ──────────────────────────────────────────────────────────
    const prompt = `You are the Compliance Monitor AI agent for REPrieve.ai, a compliance management system for Arizona behavioral health organizations (IOP and Residential programs).

Current period: ${period}
Today: ${now.toISOString().split('T')[0]}

CHECKPOINT SUMMARY (${period}):
- Total checkpoints: ${(checkpoints ?? []).length}
- Passed: ${passed.length}
- Failed: ${failed.length}
- Overdue (pending + past due date): ${overdue.length}
- Passed but missing evidence: ${passedNoEvidence.length}

OVERDUE CHECKPOINTS:
${
  overdue.length === 0
    ? 'None'
    : overdue
        .slice(0, 10)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(
          (c) =>
            `- ${(c as any).control?.code ?? 'N/A'}: ${(c as any).control?.title ?? 'Unknown'} | Due: ${c.due_date} | Assigned: ${c.assignee_name ?? 'Unassigned'}`
        )
        .join('\n')
}

PASSED WITH NO EVIDENCE (COMPLIANCE RISK):
${
  passedNoEvidence.length === 0
    ? 'None'
    : passedNoEvidence
        .slice(0, 8)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(
          (c) =>
            `- ${(c as any).control?.code ?? 'N/A'}: ${(c as any).control?.title ?? 'Unknown'}`
        )
        .join('\n')
}

REPEAT FAILURE PATTERN (same control failing across multiple periods):
${repeatFailures.length === 0 ? 'None detected' : `${repeatFailures.length} controls have failed 2+ times`}

ACTIVE CONTROLS (${(controls ?? []).length} total):
${(controls ?? [])
  .slice(0, 20)
  .map((c) => `- ${c.code}: ${c.title} (${c.standard}, ${c.frequency})`)
  .join('\n')}

Your task: Analyze this compliance data and generate actionable suggestions for the compliance team. Focus on:
1. Overdue items that need immediate escalation
2. "Passed without evidence" items — these are a regulatory audit risk
3. Patterns (repeat failures, unassigned checkpoints)
4. Missing checkpoints for controls that should have been generated

Return ONLY a valid JSON object (no markdown, no explanation before/after):
{
  "summary": "2-3 sentence plain-text summary of compliance status for ${period}",
  "suggestions": [
    {
      "entity_type": "checkpoint",
      "suggestion_type": "flag",
      "title": "Short, specific title (under 80 chars)",
      "description": "Clear description of the issue and recommended action",
      "confidence": 0.75
    }
  ]
}

Generate 3-6 high-value suggestions. Prioritize by regulatory risk. Do not include generic advice.`;

    const { text, usage } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt,
      maxTokens: 2000,
    });

    // ── Parse and write results ───────────────────────────────────────────────
    const parsed = extractJSON(text);
    const suggestions: AgentSuggestionInput[] =
      (parsed?.suggestions as AgentSuggestionInput[]) ?? [];
    const summary =
      (parsed?.summary as string) ??
      `Analyzed ${(checkpoints ?? []).length} checkpoints for ${period}. Found ${overdue.length} overdue and ${passedNoEvidence.length} missing evidence.`;

    await completeAgentRun(
      runId,
      orgId,
      'compliance_monitor',
      suggestions,
      summary,
      usage.totalTokens ?? 0,
      startTime
    );

    return { summary, suggestions: suggestions.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await failAgentRun(runId, msg, startTime);
    throw err;
  }
}
