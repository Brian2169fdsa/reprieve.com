// Shared agent utilities for REPrieve.ai AI agents
// All agents use this module for consistent run logging and suggestion writing.

import { createAdminClient } from '@/lib/supabase/server';

// ── Types ──────────────────────────────────────────────────────────────────────

export type AgentName =
  | 'compliance_monitor'
  | 'evidence_librarian'
  | 'policy_guardian'
  | 'qm_orchestrator';

export interface AgentSuggestionInput {
  entity_type: string;
  entity_id?: string;
  suggestion_type: 'edit' | 'create' | 'flag' | 'review';
  title: string;
  description: string;
  suggested_changes?: Record<string, unknown>;
  confidence: number;
}

export interface AgentRunResult {
  runId: string;
  summary: string;
  suggestionCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Opens an ai_agent_runs record and returns its ID + start timestamp.
 * Call this at the start of every agent run.
 */
export async function startAgentRun(
  orgId: string,
  agent: AgentName,
  triggerType: 'manual' | 'scheduled' | 'event',
  inputSummary: string
): Promise<{ runId: string; startTime: number }> {
  const admin = createAdminClient();
  const startTime = Date.now();

  const { data } = await admin
    .from('ai_agent_runs')
    .insert({
      org_id: orgId,
      agent,
      trigger_type: triggerType,
      status: 'running',
      input_summary: inputSummary,
    })
    .select('id')
    .single();

  return { runId: data?.id ?? '', startTime };
}

/**
 * Writes suggestions to ai_suggestions and marks the run as completed.
 * Call this at the end of a successful agent run.
 */
export async function completeAgentRun(
  runId: string,
  orgId: string,
  agent: AgentName,
  suggestions: AgentSuggestionInput[],
  summary: string,
  tokensUsed: number,
  startTime: number
): Promise<void> {
  const admin = createAdminClient();

  if (suggestions.length > 0) {
    await admin.from('ai_suggestions').insert(
      suggestions.map((s) => ({
        org_id: orgId,
        agent_run_id: runId,
        agent,
        entity_type: s.entity_type,
        entity_id: s.entity_id ?? null,
        suggestion_type: s.suggestion_type,
        title: s.title,
        description: s.description,
        suggested_changes: s.suggested_changes ?? null,
        confidence: s.confidence,
        status: 'pending',
      }))
    );
  }

  await admin
    .from('ai_agent_runs')
    .update({
      status: 'completed',
      output_summary: summary,
      tokens_used: tokensUsed,
      duration_ms: Date.now() - startTime,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

/**
 * Marks an agent run as failed.
 */
export async function failAgentRun(
  runId: string,
  errorMessage: string,
  startTime: number
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from('ai_agent_runs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      duration_ms: Date.now() - startTime,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

/**
 * Extracts the first JSON object from a Claude text response.
 * Claude sometimes wraps JSON in markdown code blocks — this handles that.
 */
export function extractJSON(text: string): Record<string, unknown> | null {
  // Strip markdown code fences if present
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
