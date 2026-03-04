// Policy Guardian Agent
// Reviews policies for conflicts, upcoming review dates, and content gaps.
// NEVER edits policies directly — all outputs are suggestions for human review.

import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { createAdminClient } from '@/lib/supabase/server';
import {
  startAgentRun,
  completeAgentRun,
  failAgentRun,
  extractJSON,
  type AgentSuggestionInput,
} from './index';

export async function runPolicyGuardian(
  orgId: string,
  triggerType: 'manual' | 'scheduled' | 'event' = 'manual'
): Promise<{ summary: string; suggestions: number }> {
  const admin = createAdminClient();

  const { runId, startTime } = await startAgentRun(
    orgId,
    'policy_guardian',
    triggerType,
    'Weekly policy review — conflict detection and review date tracking'
  );

  try {
    // ── Gather data ───────────────────────────────────────────────────────────
    const [{ data: policies }, { data: controls }] = await Promise.all([
      admin
        .from('policies')
        .select(
          'id, title, code, category, status, review_cadence_months, next_review_date, created_at, updated_at, current_version_id'
        )
        .eq('org_id', orgId)
        .in('status', ['effective', 'in_review', 'approved', 'draft'])
        .order('next_review_date', { ascending: true }),
      admin
        .from('controls')
        .select('code, title, standard, related_policy_ids')
        .eq('org_id', orgId)
        .eq('is_active', true),
    ]);

    // Fetch content of the most recently updated policies for conflict analysis
    const recentPolicies = (policies ?? []).slice(0, 10);
    const versionIds = recentPolicies
      .filter((p) => p.current_version_id)
      .map((p) => p.current_version_id);

    let versionContent: Record<string, string> = {};
    if (versionIds.length > 0) {
      const { data: versions } = await admin
        .from('policy_versions')
        .select('id, policy_id, content_html')
        .in('id', versionIds);
      (versions ?? []).forEach((v) => {
        // Store first 500 chars of HTML for conflict detection
        versionContent[v.policy_id] = (v.content_html ?? '').slice(0, 500);
      });
    }

    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const overdueReview = (policies ?? []).filter(
      (p) =>
        p.next_review_date && new Date(p.next_review_date) < now
    );
    const dueSoon30 = (policies ?? []).filter(
      (p) =>
        p.next_review_date &&
        new Date(p.next_review_date) >= now &&
        new Date(p.next_review_date) <= thirtyDaysOut
    );
    const dueSoon90 = (policies ?? []).filter(
      (p) =>
        p.next_review_date &&
        new Date(p.next_review_date) > thirtyDaysOut &&
        new Date(p.next_review_date) <= ninetyDaysOut
    );
    const noReviewDate = (policies ?? []).filter((p) => !p.next_review_date);
    const drafts = (policies ?? []).filter((p) => p.status === 'draft');
    const inReview = (policies ?? []).filter((p) => p.status === 'in_review');

    // ── Build prompt ──────────────────────────────────────────────────────────
    const prompt = `You are the Policy Guardian AI agent for REPrieve.ai, a compliance management system for Arizona behavioral health organizations (IOP and Residential programs).

Today: ${now.toISOString().split('T')[0]}

POLICY LIBRARY STATUS (${(policies ?? []).length} total policies):
- Overdue for review: ${overdueReview.length}
- Due for review within 30 days: ${dueSoon30.length}
- Due for review within 90 days: ${dueSoon90.length}
- No review date set: ${noReviewDate.length}
- In draft status: ${drafts.length}
- Pending review/approval: ${inReview.length}

POLICIES OVERDUE FOR REVIEW:
${
  overdueReview.length === 0
    ? 'None'
    : overdueReview
        .map(
          (p) =>
            `- ${p.code}: ${p.title} (${p.category}) | Review was due: ${p.next_review_date}`
        )
        .join('\n')
}

POLICIES DUE FOR REVIEW WITHIN 30 DAYS:
${
  dueSoon30.length === 0
    ? 'None'
    : dueSoon30
        .map(
          (p) =>
            `- ${p.code}: ${p.title} (${p.category}) | Due: ${p.next_review_date}`
        )
        .join('\n')
}

POLICIES WITHOUT REVIEW DATE (need scheduling):
${
  noReviewDate.length === 0
    ? 'None'
    : noReviewDate
        .slice(0, 8)
        .map((p) => `- ${p.code}: ${p.title} (${p.category}, ${p.status})`)
        .join('\n')
}

ACTIVE CONTROLS REFERENCING POLICIES:
${(controls ?? [])
  .filter((c) => c.related_policy_ids && c.related_policy_ids.length > 0)
  .slice(0, 10)
  .map((c) => `- ${c.code}: ${c.title} (${c.standard})`)
  .join('\n')}

POLICY CATEGORIES REPRESENTED:
${[...new Set((policies ?? []).map((p) => p.category))].join(', ')}

Your task: Review the policy library and generate actionable suggestions. Focus on:
1. Policies overdue for review — these create direct regulatory exposure
2. Upcoming review deadlines that need to be scheduled
3. Draft policies stuck without progression
4. Policies pending review that may be blocking effective implementation
5. Potential cross-category conflicts (e.g., HIPAA vs. Clinical, Safety vs. Operations)
6. Policies with no review schedule (missing cadence)

IMPORTANT: You cannot edit policies directly. All suggestions go through human approval.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "summary": "2-3 sentence plain-text summary of policy library health",
  "suggestions": [
    {
      "entity_type": "policy",
      "suggestion_type": "review",
      "title": "Short, specific title (under 80 chars)",
      "description": "Clear description of the issue and recommended action for the compliance team",
      "confidence": 0.80
    }
  ]
}

Generate 3-6 suggestions ranked by compliance priority. Be specific about policy codes and names.`;

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
      `Reviewed ${(policies ?? []).length} policies. Found ${overdueReview.length} overdue and ${dueSoon30.length} due within 30 days.`;

    await completeAgentRun(
      runId,
      orgId,
      'policy_guardian',
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
