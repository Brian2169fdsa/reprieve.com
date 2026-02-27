Read CLAUDE.md first. Your job is to build the 4 AI agents (Policy Guardian, Compliance Monitor, Evidence Librarian, QM Orchestrator) and 5 Supabase Edge Functions that trigger them on schedules.

INSTALL FIRST:
```
npm install @openai/agents @openai/agents-extensions @ai-sdk/anthropic ai
```

ONLY touch these files (create if needed):
- src/lib/agents/policy-guardian.ts (CREATE — Policy Guardian agent)
- src/lib/agents/compliance-monitor.ts (CREATE — Compliance Monitor agent)
- src/lib/agents/evidence-librarian.ts (CREATE — Evidence Librarian agent)
- src/lib/agents/qm-orchestrator.ts (CREATE — QM Orchestrator agent)
- src/lib/agents/tools/policy-tools.ts (CREATE — shared tools for policy operations)
- src/lib/agents/tools/checkpoint-tools.ts (CREATE — shared tools for checkpoint operations)
- src/lib/agents/tools/evidence-tools.ts (CREATE — shared tools for evidence operations)
- src/lib/agents/tools/notification-tools.ts (CREATE — shared tools for notification operations)
- src/lib/agents/tools/scoring-tools.ts (CREATE — audit readiness scoring tools)
- src/lib/agents/shared.ts (CREATE — shared model config + helpers)
- src/lib/utils/audit-readiness.ts (CREATE — audit readiness score calculation)
- supabase/functions/compliance-monitor/index.ts (CREATE — Edge Function)
- supabase/functions/evidence-librarian/index.ts (CREATE — Edge Function)
- supabase/functions/qm-orchestrator/index.ts (CREATE — Edge Function)
- supabase/functions/policy-guardian/index.ts (CREATE — Edge Function)
- supabase/functions/daily-overdue/index.ts (CREATE — Edge Function)
- src/app/api/ai-chat/route.ts (CREATE — chat API route from mega-build-4 if not yet created)

Current state: No agents exist. No edge functions directory. No tools. Types for AgentName, AISuggestion, AIAgentRun are defined in src/lib/types/index.ts. The ai_agent_runs and ai_suggestions tables are defined in migration 006. Package @openai/agents is NOT yet installed.

## SHARED MODEL CONFIG (agents/shared.ts)

```typescript
import { createAISDKModel } from '@openai/agents-extensions/ai-sdk'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@supabase/supabase-js'

// Model: use Claude Sonnet for agent inference
export const agentModel = createAISDKModel(anthropic('claude-sonnet-4-5-20250929'))

// Supabase service client for edge functions (uses service role key)
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Create an agent run record
export async function startAgentRun(orgId: string, agent: string, triggerType: string) {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('ai_agent_runs')
    .insert({
      org_id: orgId,
      agent,
      trigger_type: triggerType,
      status: 'running',
      input_summary: `${agent} triggered by ${triggerType}`,
    })
    .select('id')
    .single()
  return data?.id
}

// Complete an agent run record
export async function completeAgentRun(runId: string, output: string, tokensUsed?: number, durationMs?: number) {
  const supabase = getServiceClient()
  await supabase
    .from('ai_agent_runs')
    .update({
      status: 'completed',
      output_summary: output,
      tokens_used: tokensUsed,
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
}

// Fail an agent run
export async function failAgentRun(runId: string, error: string) {
  const supabase = getServiceClient()
  await supabase
    .from('ai_agent_runs')
    .update({
      status: 'failed',
      error_message: error,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
}

// Create an AI suggestion (CRITICAL: agents NEVER write directly, only create suggestions)
export async function createSuggestion(params: {
  orgId: string
  agentRunId: string
  agent: string
  entityType: string
  entityId?: string
  suggestionType: string   // 'edit' | 'create' | 'flag' | 'review'
  title: string
  description: string
  suggestedChanges?: Record<string, unknown>
  confidence: number       // 0.00 to 1.00
}) {
  const supabase = getServiceClient()
  await supabase.from('ai_suggestions').insert({
    org_id: params.orgId,
    agent_run_id: params.agentRunId,
    agent: params.agent,
    entity_type: params.entityType,
    entity_id: params.entityId,
    suggestion_type: params.suggestionType,
    title: params.title,
    description: params.description,
    suggested_changes: params.suggestedChanges,
    confidence: params.confidence,
    status: 'pending',
  })
}
```

## TOOL DEFINITIONS

### Policy Tools (tools/policy-tools.ts)
```typescript
import { tool } from '@openai/agents'
import { z } from 'zod'
import { getServiceClient } from '../shared'

export const readPolicy = tool({
  name: 'read_policy',
  description: 'Fetch a policy by ID with its current version content, metadata, and related information',
  parameters: z.object({ policyId: z.string().uuid(), orgId: z.string().uuid() }),
  execute: async ({ policyId, orgId }) => {
    const supabase = getServiceClient()
    const { data } = await supabase
      .from('policies')
      .select('*, current_version:policy_versions(*), owner:profiles(*)')
      .eq('id', policyId)
      .eq('org_id', orgId)
      .single()
    return data
  },
})

export const listRelatedPolicies = tool({
  name: 'list_related_policies',
  description: 'Find policies related to a given policy by cross-references and same category',
  parameters: z.object({ policyId: z.string().uuid(), orgId: z.string().uuid() }),
  execute: async ({ policyId, orgId }) => {
    const supabase = getServiceClient()
    // Get cross-references
    const { data: refs } = await supabase
      .from('policy_references')
      .select('target_policy_id, relationship')
      .eq('source_policy_id', policyId)
    // Get the target policies
    const targetIds = refs?.map(r => r.target_policy_id) ?? []
    if (targetIds.length === 0) return []
    const { data } = await supabase
      .from('policies')
      .select('id, title, code, category, status')
      .eq('org_id', orgId)
      .in('id', targetIds)
    return data
  },
})

export const getCheckpointFailures = tool({
  name: 'get_checkpoint_failures',
  description: 'Get checkpoint failures related to a policy via its linked controls',
  parameters: z.object({ policyId: z.string().uuid(), orgId: z.string().uuid() }),
  execute: async ({ policyId, orgId }) => {
    const supabase = getServiceClient()
    // Get the policy's related control IDs
    const { data: policy } = await supabase
      .from('policies')
      .select('id')
      .eq('id', policyId)
      .single()
    if (!policy) return []
    // Find controls that reference this policy
    const { data: controls } = await supabase
      .from('controls')
      .select('id, code, title')
      .eq('org_id', orgId)
      .contains('related_policy_ids', [policyId])
    if (!controls || controls.length === 0) return []
    // Get failed checkpoints for those controls
    const controlIds = controls.map(c => c.id)
    const { data: failures } = await supabase
      .from('checkpoints')
      .select('*, control:controls(code, title)')
      .eq('org_id', orgId)
      .in('control_id', controlIds)
      .in('status', ['failed', 'overdue'])
      .order('due_date', { ascending: false })
      .limit(20)
    return failures
  },
})
```

### Checkpoint Tools (tools/checkpoint-tools.ts)
```typescript
import { tool } from '@openai/agents'
import { z } from 'zod'
import { getServiceClient } from '../shared'

export const listActiveControls = tool({
  name: 'list_active_controls',
  description: 'List all active controls for an org with frequency and owner info',
  parameters: z.object({ orgId: z.string().uuid() }),
  execute: async ({ orgId }) => {
    const supabase = getServiceClient()
    const { data } = await supabase
      .from('controls')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('code')
    return data
  },
})

export const createCheckpoint = tool({
  name: 'create_checkpoint',
  description: 'Create a new checkpoint task for a control and period',
  parameters: z.object({
    orgId: z.string().uuid(),
    controlId: z.string().uuid(),
    period: z.string(),
    dueDate: z.string(),
    assignedTo: z.string().uuid().optional(),
  }),
  execute: async ({ orgId, controlId, period, dueDate, assignedTo }) => {
    const supabase = getServiceClient()
    // Check for existing checkpoint
    const { data: existing } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('org_id', orgId)
      .eq('control_id', controlId)
      .eq('period', period)
      .single()
    if (existing) return { skipped: true, reason: 'Checkpoint already exists for this period' }

    const { data } = await supabase
      .from('checkpoints')
      .insert({
        org_id: orgId,
        control_id: controlId,
        period,
        due_date: dueDate,
        assigned_to: assignedTo,
        status: 'pending',
      })
      .select('id')
      .single()
    return { created: true, id: data?.id }
  },
})

export const analyzeFailurePatterns = tool({
  name: 'analyze_failure_patterns',
  description: 'Query historical checkpoint pass/fail rates by control and standard',
  parameters: z.object({ orgId: z.string().uuid(), periods: z.number().default(6) }),
  execute: async ({ orgId, periods }) => {
    const supabase = getServiceClient()
    const { data } = await supabase
      .from('checkpoints')
      .select('control_id, status, period, control:controls(code, title, standard)')
      .eq('org_id', orgId)
      .in('status', ['passed', 'failed', 'overdue'])
      .order('period', { ascending: false })
      .limit(periods * 50)
    // Aggregate by control
    const byControl: Record<string, { passed: number; failed: number; overdue: number }> = {}
    for (const cp of data ?? []) {
      const key = cp.control_id
      if (!byControl[key]) byControl[key] = { passed: 0, failed: 0, overdue: 0 }
      if (cp.status === 'passed') byControl[key].passed++
      else if (cp.status === 'failed') byControl[key].failed++
      else if (cp.status === 'overdue') byControl[key].overdue++
    }
    return { byControl, raw: data }
  },
})
```

### Notification Tools (tools/notification-tools.ts)
```typescript
import { tool } from '@openai/agents'
import { z } from 'zod'
import { getServiceClient } from '../shared'

export const sendNotification = tool({
  name: 'send_notification',
  description: 'Create a notification for a specific user or all users with a specific role in the org',
  parameters: z.object({
    orgId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    role: z.string().optional(),  // If set, notify all users with this role
    type: z.string(),
    title: z.string(),
    message: z.string(),
    entityType: z.string().optional(),
    entityId: z.string().uuid().optional(),
  }),
  execute: async ({ orgId, userId, role, type, title, message, entityType, entityId }) => {
    const supabase = getServiceClient()
    const notifications = []

    if (userId) {
      notifications.push({
        org_id: orgId, user_id: userId, type, title, message,
        entity_type: entityType, entity_id: entityId,
      })
    } else if (role) {
      // Get all active members with this role
      const { data: members } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('role', role)
        .eq('is_active', true)
      for (const m of members ?? []) {
        notifications.push({
          org_id: orgId, user_id: m.user_id, type, title, message,
          entity_type: entityType, entity_id: entityId,
        })
      }
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }
    return { sent: notifications.length }
  },
})
```

### Evidence Tools (tools/evidence-tools.ts)
```typescript
// listCheckpointsMissingEvidence — find completed checkpoints with no evidence
// organizeAuditBinder — group evidence by period + standard
```

### Scoring Tools (tools/scoring-tools.ts)
```typescript
// calculateAuditReadinessScore — compute the composite score
// Uses the formula from CLAUDE.md:
// overall = 0.35*checkpoint + 0.25*evidence + 0.25*policy + 0.15*capa
// Inserts result into audit_readiness_scores table
```

## AUDIT READINESS CALCULATION (lib/utils/audit-readiness.ts)

```typescript
export async function calculateAuditReadiness(orgId: string, period: string) {
  const supabase = getServiceClient()

  // Checkpoint score: % completed on time this period
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('status, due_date, completed_at')
    .eq('org_id', orgId)
    .eq('period', period)
  const total = checkpoints?.length ?? 0
  const completedOnTime = checkpoints?.filter(
    cp => cp.status === 'passed' && cp.completed_at && new Date(cp.completed_at) <= new Date(cp.due_date)
  ).length ?? 0
  const checkpointScore = total > 0 ? (completedOnTime / total) * 100 : 0

  // Evidence score: % of checkpoints with at least one evidence upload
  const { data: evidenceCounts } = await supabase
    .from('evidence')
    .select('checkpoint_id')
    .eq('org_id', orgId)
  const checkpointsWithEvidence = new Set(evidenceCounts?.map(e => e.checkpoint_id)).size
  const evidenceScore = total > 0 ? (checkpointsWithEvidence / total) * 100 : 0

  // Policy score: % of policies in 'effective' status and not past review date
  const { data: policies } = await supabase
    .from('policies')
    .select('status, next_review_date')
    .eq('org_id', orgId)
  const totalPolicies = policies?.length ?? 0
  const effectiveCurrent = policies?.filter(
    p => p.status === 'effective' && (!p.next_review_date || new Date(p.next_review_date) > new Date())
  ).length ?? 0
  const policyScore = totalPolicies > 0 ? (effectiveCurrent / totalPolicies) * 100 : 0

  // CAPA score: % of CAPAs closed on time
  const { data: capas } = await supabase
    .from('capas')
    .select('status, due_date, verified_at')
    .eq('org_id', orgId)
  const totalCapas = capas?.length ?? 0
  const closedOnTime = capas?.filter(
    c => c.status === 'closed' && c.verified_at && c.due_date && new Date(c.verified_at) <= new Date(c.due_date)
  ).length ?? 0
  const capaScore = totalCapas > 0 ? (closedOnTime / totalCapas) * 100 : 0

  // Weighted overall
  const overall = (0.35 * checkpointScore) + (0.25 * evidenceScore) + (0.25 * policyScore) + (0.15 * capaScore)

  // Save to audit_readiness_scores
  await supabase.from('audit_readiness_scores').upsert({
    org_id: orgId,
    period,
    overall_score: Math.round(overall * 100) / 100,
    checkpoint_score: Math.round(checkpointScore * 100) / 100,
    evidence_score: Math.round(evidenceScore * 100) / 100,
    policy_score: Math.round(policyScore * 100) / 100,
    capa_score: Math.round(capaScore * 100) / 100,
    calculated_at: new Date().toISOString(),
  }, { onConflict: 'org_id,period' })

  return { overall, checkpointScore, evidenceScore, policyScore, capaScore }
}
```

## AGENT DEFINITIONS

### Policy Guardian (agents/policy-guardian.ts)
```typescript
import { Agent } from '@openai/agents'
import { agentModel, startAgentRun, completeAgentRun, failAgentRun, createSuggestion } from './shared'
import { readPolicy, listRelatedPolicies, getCheckpointFailures } from './tools/policy-tools'

export const policyGuardian = new Agent({
  name: 'Policy Guardian',
  model: agentModel,
  instructions: `You are the Policy Guardian for a behavioral health compliance organization in Arizona.
Your job is to review policies for:
- Conflicts or contradictions between policies
- Redundant or overlapping requirements
- Missing sections that regulations require
- Inconsistent terminology across policies
- Policies nearing their review date
- Policies impacted by repeated checkpoint failures

CRITICAL: You NEVER edit policies directly. You create suggestions via the create_suggestion tool.
All suggestions require human approval before any changes are applied.

When you find an issue, create a suggestion with:
- Clear title describing the issue
- Detailed description of what's wrong and why it matters
- Suggested changes as structured JSON
- Confidence score (0.0 to 1.0) reflecting your certainty`,
  tools: [readPolicy, listRelatedPolicies, getCheckpointFailures],
})

export async function runPolicyGuardian(orgId: string, triggerType: string = 'scheduled') {
  const runId = await startAgentRun(orgId, 'policy_guardian', triggerType)
  if (!runId) return
  const startTime = Date.now()
  try {
    // 1. List all effective policies
    // 2. For each pair, check for conflicts
    // 3. Check policies nearing review date
    // 4. Check policies with linked failed checkpoints
    // 5. Create suggestions for issues found
    await completeAgentRun(runId, 'Policy review completed', undefined, Date.now() - startTime)
  } catch (err) {
    await failAgentRun(runId, String(err))
  }
}
```

### Compliance Monitor (agents/compliance-monitor.ts)
Similar pattern — uses listActiveControls, createCheckpoint, sendNotification, analyzeFailurePatterns.
Monthly: generate all checkpoint tasks for the month.
Daily: scan for overdue, send reminders at 7/3/1 day marks.

### Evidence Librarian (agents/evidence-librarian.ts)
Uses listCheckpointsMissingEvidence, organizeAuditBinder, sendNotification.
Weekly: scan for checkpoints completed without evidence.

### QM Orchestrator (agents/qm-orchestrator.ts)
Uses listCheckpointsForPeriod, calculateAuditReadinessScore, createQMMeeting, listOpenCapas, getTrendData.
Trigger: 5 business days before QM meeting date.

## EDGE FUNCTIONS

Each edge function follows this pattern:

```typescript
// supabase/functions/compliance-monitor/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get all active organizations
  const { data: orgs } = await supabase.from('organizations').select('id')

  // For each org, run the agent
  for (const org of orgs ?? []) {
    try {
      // Call the agent logic (or call a Next.js API route that runs the agent)
      // For edge functions that can't import Node.js agents directly,
      // make an HTTP call to the Next.js API:
      await fetch(`${Deno.env.get('APP_URL')}/api/agents/compliance-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('AGENT_SECRET')}`,
        },
        body: JSON.stringify({ orgId: org.id, trigger: 'scheduled' }),
      })
    } catch (err) {
      console.error(`Agent failed for org ${org.id}:`, err)
    }
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
})
```

**Edge Function Schedule (via pg_cron — documented for setup):**
| Function | Cron | Description |
|---|---|---|
| compliance-monitor | `0 0 1 * *` | 1st of month: generate checkpoints |
| daily-overdue | `0 7 * * *` | Daily 7am: mark overdue + send alerts |
| evidence-librarian | `0 8 * * 1` | Monday 8am: missing evidence scan |
| policy-guardian | `0 9 * * 1` | Monday 9am: policy conflict review |
| qm-orchestrator | `0 8 20 * *` | 20th of month: pre-meeting prep |

## AI CHAT API ROUTE (api/ai-chat/route.ts)

For the chat slideout from mega-build-4. This connects to real Claude:

```typescript
import { Agent, run } from '@openai/agents'
import { agentModel } from '@/lib/agents/shared'
import { NextResponse } from 'next/server'

const agentPersonas: Record<string, string> = {
  policy_guardian: 'You are the Policy Guardian. You help analyze policies, detect conflicts...',
  compliance_monitor: 'You are the Compliance Monitor. You help track checkpoints, deadlines...',
  evidence_librarian: 'You are the Evidence Librarian. You help organize evidence, identify gaps...',
  qm_orchestrator: 'You are the QM Orchestrator. You help prepare QM meetings, analyze trends...',
}

export async function POST(request: Request) {
  const { message, agent, orgId } = await request.json()

  const persona = agentPersonas[agent] ?? agentPersonas.compliance_monitor

  const chatAgent = new Agent({
    name: agent,
    model: agentModel,
    instructions: `${persona}\n\nYou are chatting with a staff member. Be helpful, concise, and reference their organization's data when possible. Do NOT make changes — only provide analysis and recommendations.`,
  })

  const result = await run(chatAgent, message)

  return NextResponse.json({
    message: result.finalOutput,
  })
}
```

DO NOT touch: any existing page.tsx files, any existing component files, layout files, auth pages, hooks, or any files not listed above. The agents and tools are backend infrastructure that will be consumed by the UI built in mega-builds 1-6.
