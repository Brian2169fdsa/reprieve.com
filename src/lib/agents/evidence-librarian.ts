// Evidence Librarian Agent
// Scans checkpoints for missing required evidence. Prevents "we did it but
// can't prove it" failures that cause audit citations.

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

export async function runEvidenceLibrarian(
  orgId: string,
  triggerType: 'manual' | 'scheduled' | 'event' = 'manual'
): Promise<{ summary: string; suggestions: number }> {
  const admin = createAdminClient();
  const period = getCurrentPeriod();

  const { runId, startTime } = await startAgentRun(
    orgId,
    'evidence_librarian',
    triggerType,
    `Weekly evidence coverage scan for ${period}`
  );

  try {
    // ── Gather data ───────────────────────────────────────────────────────────
    const [{ data: checkpoints }, { data: evidence }] = await Promise.all([
      admin
        .from('checkpoints')
        .select(
          'id, status, attestation, due_date, assignee_name, period, control:controls(code, title, standard, required_evidence)'
        )
        .eq('org_id', orgId)
        .in('status', ['passed', 'failed', 'in_progress'])
        .order('due_date', { ascending: false })
        .limit(100),
      admin
        .from('evidence')
        .select('id, checkpoint_id, file_name, file_type, tags, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    // Build checkpoint → evidence mapping
    const evidenceByCheckpoint: Record<
      string,
      { count: number; files: string[] }
    > = {};
    (evidence ?? []).forEach((e) => {
      if (!e.checkpoint_id) return;
      if (!evidenceByCheckpoint[e.checkpoint_id]) {
        evidenceByCheckpoint[e.checkpoint_id] = { count: 0, files: [] };
      }
      evidenceByCheckpoint[e.checkpoint_id].count++;
      evidenceByCheckpoint[e.checkpoint_id].files.push(e.file_name);
    });

    // Identify checkpoints missing evidence
    const passedNoEvidence = (checkpoints ?? []).filter(
      (c) => c.status === 'passed' && !evidenceByCheckpoint[c.id]
    );
    const inProgressNoEvidence = (checkpoints ?? []).filter(
      (c) => c.status === 'in_progress' && !evidenceByCheckpoint[c.id]
    );

    // Group by standard for binder analysis
    const byStandard: Record<
      string,
      { total: number; withEvidence: number }
    > = {};
    (checkpoints ?? []).forEach((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const std = (c as any).control?.standard ?? 'Other';
      if (!byStandard[std]) byStandard[std] = { total: 0, withEvidence: 0 };
      byStandard[std].total++;
      if (evidenceByCheckpoint[c.id]) byStandard[std].withEvidence++;
    });

    const totalEvidence = (evidence ?? []).length;
    const totalCheckpoints = (checkpoints ?? []).length;
    const withEvidence = totalCheckpoints - passedNoEvidence.length - inProgressNoEvidence.length;

    // ── Build prompt ──────────────────────────────────────────────────────────
    const prompt = `You are the Evidence Librarian AI agent for REPrieve.ai, a compliance management system for Arizona behavioral health organizations.

Current period: ${period}

EVIDENCE COVERAGE ANALYSIS:
- Total checkpoints reviewed: ${totalCheckpoints}
- Evidence items in library: ${totalEvidence}
- Checkpoints with evidence: ${withEvidence}
- PASSED checkpoints with NO evidence: ${passedNoEvidence.length} (CRITICAL — audit risk)
- In-progress checkpoints with no evidence started: ${inProgressNoEvidence.length}

PASSED CHECKPOINTS MISSING EVIDENCE (top priority):
${
  passedNoEvidence.length === 0
    ? 'None — all passed checkpoints have evidence uploaded.'
    : passedNoEvidence
        .slice(0, 10)
        .map((c) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctrl = (c as any).control;
          const required = ctrl?.required_evidence ?? [];
          return `- ${ctrl?.code ?? 'N/A'}: ${ctrl?.title ?? 'Unknown'} (${ctrl?.standard ?? '?'})
    Assigned: ${c.assignee_name ?? 'Unassigned'} | Due: ${c.due_date}
    Required evidence: ${required.length > 0 ? required.join(', ') : 'See test procedure'}`;
        })
        .join('\n')
}

EVIDENCE COVERAGE BY STANDARD:
${Object.entries(byStandard)
  .map(
    ([std, { total, withEvidence: we }]) =>
      `- ${std}: ${we}/${total} (${Math.round((we / total) * 100)}%)`
  )
  .join('\n')}

Your task: Identify evidence gaps that create audit risk and generate specific, actionable suggestions for the compliance team.

Focus on:
1. Passed checkpoints with zero evidence — these are regulatory time bombs
2. Standards with poor evidence coverage (<70%)
3. Checkpoints where required evidence types are known but missing
4. Patterns (specific staff members or departments consistently not uploading)

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "summary": "2-3 sentence plain-text summary of evidence coverage status",
  "suggestions": [
    {
      "entity_type": "checkpoint",
      "suggestion_type": "flag",
      "title": "Short, specific title (under 80 chars)",
      "description": "Specific description including what evidence is missing and from whom",
      "confidence": 0.85
    }
  ]
}

Generate 3-6 suggestions ranked by audit risk. Be specific about which checkpoints and what evidence is needed.`;

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
      `Scanned ${totalCheckpoints} checkpoints. Found ${passedNoEvidence.length} passed without evidence across ${totalEvidence} total evidence items.`;

    await completeAgentRun(
      runId,
      orgId,
      'evidence_librarian',
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
