Read CLAUDE.md first. Your job is to make ALL 4 AI agents REAL — powered by Claude via Vercel AI SDK, with tool calling that takes REAL actions on the platform (creating policies, generating checkpoints, flagging evidence, etc.), a chat slideout UI, and agent-to-agent communication. NO MOCK DATA. Every stat, every action, every response is real.

INSTALL FIRST (run these before any code changes):
```
npm install ai @ai-sdk/anthropic zod
```

These are the core packages:
- `ai` — Vercel AI SDK for streaming, tool calling, and multi-step agent loops
- `@ai-sdk/anthropic` — Anthropic provider for Claude models
- `zod` — Schema validation for tool parameters

IMPORTANT: Add this to .env.local:
```
ANTHROPIC_API_KEY=your_key_here
```

ONLY touch these files (create if needed):
- src/app/(portal)/ai/page.tsx (COMPLETE REWRITE — real agent cards with live stats from DB)
- src/app/api/ai-chat/route.ts (CREATE — streaming chat API route with real tool calling)
- src/components/ai/chat-slideout.tsx (CREATE — chat panel that slides in from right)
- src/components/ai/agent-card.tsx (CREATE — individual agent card component)
- src/components/ai/chat-message.tsx (CREATE — chat message bubble component)
- src/components/ai/quick-actions.tsx (CREATE — quick-action pill buttons)
- src/lib/agents/agent-config.ts (CREATE — agent system prompts and metadata)
- src/lib/agents/tools/policy-tools.ts (CREATE — Policy Guardian tools)
- src/lib/agents/tools/checkpoint-tools.ts (CREATE — Compliance Monitor tools)
- src/lib/agents/tools/evidence-tools.ts (CREATE — Evidence Librarian tools)
- src/lib/agents/tools/qm-tools.ts (CREATE — QM Orchestrator tools)
- src/lib/agents/tools/shared-tools.ts (CREATE — tools shared across all agents)
- src/hooks/use-agent-chat.ts (CREATE — React hook for agent chat state)

## ARCHITECTURE OVERVIEW

```
User clicks "Chat with Agent" on agent card
  → Opens chat slideout (right side panel)
  → User types message or clicks quick-action pill
  → POST to /api/ai-chat with { message, agentName, orgId }
  → API route creates Claude instance with agent-specific system prompt + tools
  → Claude streams response, calling tools as needed (multi-step)
  → Tools execute real Supabase operations (create policy, query checkpoints, etc.)
  → Stream response back to UI in real-time
  → Tool results shown inline in chat
  → Agent actions logged to ai_agent_runs + audit_log
```

## AGENT CONFIGURATION (lib/agents/agent-config.ts)

```typescript
export interface AgentConfig {
  name: string
  key: 'compliance_monitor' | 'evidence_librarian' | 'policy_guardian' | 'qm_orchestrator'
  icon: string
  color: string
  description: string
  trigger: string
  systemPrompt: string
  quickActions: Array<{ label: string; prompt: string }>
}

export const AGENTS: Record<string, AgentConfig> = {
  compliance_monitor: {
    name: 'Compliance Monitor',
    key: 'compliance_monitor',
    icon: '🛡',
    color: '#3BA7C9',
    description: 'Generates monthly checkpoints, sends reminders, escalates overdue tasks, detects patterns.',
    trigger: 'Monthly + daily overdue scan',
    systemPrompt: `You are the Compliance Monitor for REPrieve.ai, a compliance operating system for Arizona behavioral health organizations (IOP/OTC + Residential/BHRF).

Your responsibilities:
- Generate monthly checkpoint tasks from the active control library
- Track checkpoint completion status and send reminders for upcoming due dates
- Escalate overdue checkpoints to supervisors and compliance officers
- Detect failure patterns across checkpoints and standards
- Monitor the weekly compliance cadence (Monday standups, Friday readiness sweeps)

You have access to tools that let you:
- Query checkpoints, controls, and their statuses
- Create new checkpoints for specific controls and periods
- Send notifications to staff members
- Analyze historical pass/fail patterns

CRITICAL RULES:
1. Always scope operations to the user's organization (orgId is provided)
2. When creating checkpoints, check for duplicates first
3. When sending notifications, be specific about what action is needed
4. Reference specific control codes (GOV-QM-001, CLN-CHART-001, etc.) when discussing compliance items
5. You understand the Arizona BH compliance calendar: monthly governance (Week 1), clinical audit (Week 2), HR/workforce (Week 3), EOC/safety (Week 4), billing (month-end), plus quarterly/semiannual/annual controls

When users ask about overdue items, compliance status, or need checkpoints generated, take action immediately using your tools. Be direct and action-oriented.`,
    quickActions: [
      { label: 'Overdue checkpoints', prompt: 'Show me all overdue checkpoints and who they are assigned to. What actions should we take?' },
      { label: 'Monthly summary', prompt: 'Give me a complete compliance summary for the current month — how many checkpoints completed, pending, overdue, and what needs attention.' },
      { label: 'Generate next month', prompt: 'Generate all checkpoint tasks for next month based on our active controls.' },
      { label: 'Risk areas', prompt: 'Analyze our checkpoint history and identify which compliance areas have the highest failure or overdue rates.' },
    ],
  },

  evidence_librarian: {
    name: 'Evidence Librarian',
    key: 'evidence_librarian',
    icon: '📎',
    color: '#16A34A',
    description: 'Scans for missing evidence, organizes audit binders, prevents proof gaps.',
    trigger: 'Weekly scan + on checkpoint completion',
    systemPrompt: `You are the Evidence Librarian for REPrieve.ai, a compliance operating system for Arizona behavioral health organizations.

Your responsibilities:
- Scan completed checkpoints for missing required evidence
- Identify evidence gaps that would fail a survey or audit
- Help organize evidence into audit-ready binders by standard and period
- Ensure every completed checkpoint has the proof needed to demonstrate compliance
- Track the "2-hour binder" readiness — can the org produce all required documents in under 2 hours?

You have access to tools that let you:
- Query checkpoints and their associated evidence
- Check what evidence is required vs what has been uploaded
- Send notifications about missing evidence to checkpoint owners
- Organize evidence by standard, period, and program

CRITICAL RULES:
1. A checkpoint CANNOT be considered truly "passed" without evidence. Flag any gaps.
2. Reference specific evidence requirements from control definitions
3. When flagging missing evidence, be specific: which file is missing, for which checkpoint, assigned to whom
4. Think like a surveyor — what would AHCCCS, Joint Commission, or OIG want to see?

Evidence categories you track:
- QM/PI meeting minutes, incident logs, corrective action trackers
- Chart audit tools, treatment plan reviews, MBC completion logs
- Staff credential verifications, training certificates, competency checklists
- EOC walkthrough checklists, fire safety docs, infection control logs
- Claims reconciliation reports, denial logs, billing audit samples
- Drill documentation, after-action reports, evacuation records
- HIPAA risk analyses, access logs, privacy assessments`,
    quickActions: [
      { label: 'Missing evidence', prompt: 'Scan all completed checkpoints and tell me which ones are missing required evidence. List them with the specific files needed.' },
      { label: 'Audit binder status', prompt: 'How audit-ready are we? Check evidence coverage by standard and tell me our readiness percentage.' },
      { label: 'Evidence gaps', prompt: 'What are the biggest evidence gaps right now? Which standards have the most missing documentation?' },
      { label: 'Upload reminders', prompt: 'Send notifications to all staff who have completed checkpoints but haven\'t uploaded the required evidence yet.' },
    ],
  },

  policy_guardian: {
    name: 'Policy Guardian',
    key: 'policy_guardian',
    icon: '📖',
    color: '#6D28D9',
    description: 'Reviews policies for conflicts, gaps, and outdated language. Creates and manages policies.',
    trigger: 'Weekly + on policy save',
    systemPrompt: `You are the Policy Guardian for REPrieve.ai, a compliance operating system for Arizona behavioral health organizations.

Your responsibilities:
- Create new policies when requested (drafts that go through approval workflow)
- Review existing policies for conflicts, redundancy, and gaps
- Identify policies that are past their review date or nearing expiration
- Ensure policies align with current regulatory requirements (AHCCCS, HIPAA, Joint Commission, OIG)
- Cross-reference policies with controls to ensure coverage
- Detect inconsistent terminology across the policy library

You have access to tools that let you:
- Create new policies with proper metadata and initial content
- Read and analyze existing policies
- List all policies with their status and review dates
- Create suggestions for policy edits (routed through approval workflow)
- Query controls to ensure policies cover all compliance requirements
- Send notifications about policy actions

CRITICAL RULES:
1. When creating policies, set status to 'draft' — they MUST go through approval
2. Generate proper policy codes: POL-{CATEGORY}-{###} (e.g., POL-HIPAA-001, POL-SAFETY-003)
3. For AI-created policies, also create an ai_suggestions record so it shows in the approval queue
4. Policy content should follow Arizona BH standards and reference applicable regulations
5. Always set a review_cadence: high-risk policies (safety, medication, privacy, incidents) = 6 months; all others = 12 months
6. Include required sections: Purpose, Scope, Definitions, Policy Statement, Procedures, References, Review History

Arizona BH policy categories:
- HIPAA / Privacy & Security
- Safety / Environment of Care
- Clinical / Patient Care
- HR / Workforce / Training
- Billing / Program Integrity
- Quality Management / Governance
- Emergency Management
- Infection Control
- Credentialing / OIG
- Administrative / Operations`,
    quickActions: [
      { label: 'Create a policy', prompt: 'I need to create a new policy. Help me draft one — ask me what it should cover.' },
      { label: 'Policy review status', prompt: 'Which policies are past their review date or coming up for review in the next 30 days?' },
      { label: 'Policy conflicts', prompt: 'Analyze our policy library for potential conflicts, gaps, or inconsistencies across documents.' },
      { label: 'Coverage check', prompt: 'Do our policies cover all active controls? Identify any compliance areas where we have controls but no supporting policy.' },
    ],
  },

  qm_orchestrator: {
    name: 'QM Orchestrator',
    key: 'qm_orchestrator',
    icon: '📊',
    color: '#C05A2C',
    description: 'Assembles QM meeting packets, calculates audit readiness, tracks findings and CAPAs.',
    trigger: '5 days before QM meeting',
    systemPrompt: `You are the QM Orchestrator for REPrieve.ai, a compliance operating system for Arizona behavioral health organizations.

Your responsibilities:
- Assemble monthly QM meeting packets with all required data
- Calculate and track the audit readiness score (checkpoint + evidence + policy + CAPA composite)
- Generate executive summaries for leadership review
- Track findings from failed/overdue checkpoints
- Monitor CAPA status and closure rates
- Prepare meeting agendas and checklists

You have access to tools that let you:
- Query all checkpoint data for any period
- Calculate audit readiness scores
- Create QM meetings with agendas
- List open CAPAs and their status
- Create findings from failed checkpoints
- Generate trend data across periods
- Send notifications about QM activities

CRITICAL RULES:
1. The audit readiness score formula: overall = (0.35 × checkpoint_score) + (0.25 × evidence_score) + (0.25 × policy_score) + (0.15 × capa_score)
2. Checkpoint score = % completed on time; Evidence score = % with required evidence; Policy score = % in effective status; CAPA score = % closed on time
3. QM meetings follow the weekly cadence: Week 1 is QM/Governance, and the full QM committee meeting should happen monthly
4. Findings are auto-generated from failed/overdue checkpoints
5. CAPAs flow from findings: finding → root cause analysis → corrective action → preventive action → verification

QM meeting standard agenda:
1. Review previous month's action items
2. Present compliance checkpoint summary
3. Review audit readiness score and trends
4. Discuss open findings and root causes
5. Review CAPA status and deadlines
6. Identify new risks or compliance gaps
7. Set action items for next period
8. Schedule next QM meeting date`,
    quickActions: [
      { label: 'Audit readiness', prompt: 'Calculate our current audit readiness score and break it down by component (checkpoints, evidence, policies, CAPAs).' },
      { label: 'Prepare QM packet', prompt: 'Prepare the QM meeting packet for the current month — pull all checkpoint data, findings, and CAPA status.' },
      { label: 'Open CAPAs', prompt: 'Show me all open CAPAs — status, owner, due date, and how many days they have been open.' },
      { label: 'Trend analysis', prompt: 'Analyze our compliance trends over the last 6 months. Where are we improving and where are we declining?' },
    ],
  },
}
```

## SHARED TOOLS (lib/agents/tools/shared-tools.ts)

These tools are available to ALL agents:

```typescript
import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

// Service client for server-side operations
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const queryCheckpoints = tool({
  description: 'Query checkpoints for an organization. Can filter by period, status, control, or assignee. Returns checkpoint data with control and assignee info.',
  parameters: z.object({
    orgId: z.string().describe('Organization ID'),
    period: z.string().optional().describe('Period filter like "2026-03" or "2026-Q1"'),
    status: z.string().optional().describe('Status filter: pending, in_progress, passed, failed, overdue, skipped'),
    controlCode: z.string().optional().describe('Control code filter like "GOV-QM-001"'),
    assignedTo: z.string().optional().describe('User ID of assigned person'),
    limit: z.number().optional().describe('Max results to return'),
  }),
  execute: async ({ orgId, period, status, controlCode, assignedTo, limit }) => {
    const supabase = getSupabase()
    let query = supabase
      .from('checkpoints')
      .select('id, status, due_date, period, attestation, notes, completed_at, controls(id, code, title, standard, category, test_procedure, required_evidence), profiles:assigned_to(id, full_name, email)')
      .eq('org_id', orgId)
      .order('due_date', { ascending: true })

    if (period) query = query.eq('period', period)
    if (status) query = query.eq('status', status)
    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    if (limit) query = query.limit(limit)

    const { data, error } = await query
    if (error) return { error: error.message }

    // If controlCode filter, apply client-side (can't filter on joined table easily)
    let results = data ?? []
    if (controlCode) {
      results = results.filter((cp: any) => cp.controls?.code === controlCode)
    }

    return { checkpoints: results, count: results.length }
  },
})

export const queryControls = tool({
  description: 'Query active controls for an organization. Returns control definitions with their codes, standards, frequencies, and test procedures.',
  parameters: z.object({
    orgId: z.string().describe('Organization ID'),
    standard: z.string().optional().describe('Standard filter like "HIPAA", "Safety", "AHCCCS"'),
    isActive: z.boolean().optional().describe('Filter by active status'),
  }),
  execute: async ({ orgId, standard, isActive }) => {
    const supabase = getSupabase()
    let query = supabase
      .from('controls')
      .select('*')
      .eq('org_id', orgId)
      .order('code')

    if (standard) query = query.eq('standard', standard)
    if (isActive !== undefined) query = query.eq('is_active', isActive)

    const { data, error } = await query
    if (error) return { error: error.message }
    return { controls: data ?? [], count: (data ?? []).length }
  },
})

export const queryPolicies = tool({
  description: 'Query policies for an organization. Returns policy metadata, status, and version info.',
  parameters: z.object({
    orgId: z.string().describe('Organization ID'),
    status: z.string().optional().describe('Status filter: draft, in_review, approved, effective, retired'),
    category: z.string().optional().describe('Category filter'),
  }),
  execute: async ({ orgId, status, category }) => {
    const supabase = getSupabase()
    let query = supabase
      .from('policies')
      .select('id, title, code, category, program, status, review_cadence_months, next_review_date, created_at, updated_at, owner:profiles!policies_owner_id_fkey(full_name)')
      .eq('org_id', orgId)
      .order('code')

    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) return { error: error.message }
    return { policies: data ?? [], count: (data ?? []).length }
  },
})

export const queryCAPAs = tool({
  description: 'Query CAPAs (Corrective and Preventive Actions) for an organization.',
  parameters: z.object({
    orgId: z.string().describe('Organization ID'),
    status: z.string().optional().describe('Status filter: open, in_progress, pending_verification, closed, overdue'),
  }),
  execute: async ({ orgId, status }) => {
    const supabase = getSupabase()
    let query = supabase
      .from('capas')
      .select('id, title, description, root_cause, corrective_action, preventive_action, status, due_date, created_at, owner:profiles!capas_owner_id_fkey(full_name), finding:findings(title, severity, standard)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return { error: error.message }

    // Calculate days open for each CAPA
    const enriched = (data ?? []).map((capa: any) => ({
      ...capa,
      days_open: Math.ceil((Date.now() - new Date(capa.created_at).getTime()) / 86400000),
      is_overdue: capa.due_date && capa.status !== 'closed' && new Date(capa.due_date) < new Date(),
    }))

    return { capas: enriched, count: enriched.length }
  },
})

export const queryEvidence = tool({
  description: 'Query evidence files for checkpoints. Can check which checkpoints have evidence and which are missing required uploads.',
  parameters: z.object({
    orgId: z.string().describe('Organization ID'),
    checkpointId: z.string().optional().describe('Specific checkpoint ID'),
  }),
  execute: async ({ orgId, checkpointId }) => {
    const supabase = getSupabase()
    let query = supabase
      .from('evidence')
      .select('id, file_name, file_type, file_size_bytes, created_at, checkpoint_id, uploaded_by')
      .eq('org_id', orgId)

    if (checkpointId) query = query.eq('checkpoint_id', checkpointId)

    const { data, error } = await query
    if (error) return { error: error.message }
    return { evidence: data ?? [], count: (data ?? []).length }
  },
})

export const queryOrgMembers = tool({
  description: 'Query organization members with their roles and profile information.',
  parameters: z.object({
    orgId: z.string().describe('Organization ID'),
    role: z.string().optional().describe('Role filter'),
  }),
  execute: async ({ orgId, role }) => {
    const supabase = getSupabase()
    let query = supabase
      .from('org_members')
      .select('id, role, is_active, user_id, profiles:user_id(id, full_name, email)')
      .eq('org_id', orgId)
      .eq('is_active', true)

    if (role) query = query.eq('role', role)

    const { data, error } = await query
    if (error) return { error: error.message }
    return { members: data ?? [], count: (data ?? []).length }
  },
})

export const sendNotification = tool({
  description: 'Send a notification to a specific user or all users with a specific role in the organization.',
  parameters: z.object({
    orgId: z.string().describe('Organization ID'),
    userId: z.string().optional().describe('Specific user ID to notify'),
    role: z.string().optional().describe('Role to notify all members of (e.g., "compliance", "admin")'),
    type: z.string().describe('Notification type: checkpoint_due, overdue, suggestion, approval_needed, capa_due, system'),
    title: z.string().describe('Notification title'),
    message: z.string().describe('Notification message body'),
    entityType: z.string().optional().describe('Related entity type'),
    entityId: z.string().optional().describe('Related entity ID'),
  }),
  execute: async ({ orgId, userId, role, type, title, message, entityType, entityId }) => {
    const supabase = getSupabase()
    const notifications: any[] = []

    if (userId) {
      notifications.push({ org_id: orgId, user_id: userId, type, title, message, entity_type: entityType, entity_id: entityId })
    } else if (role) {
      const { data: members } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('role', role)
        .eq('is_active', true)
      for (const m of members ?? []) {
        notifications.push({ org_id: orgId, user_id: m.user_id, type, title, message, entity_type: entityType, entity_id: entityId })
      }
    }

    if (notifications.length > 0) {
      const { error } = await supabase.from('notifications').insert(notifications)
      if (error) return { error: error.message }
    }

    return { sent: notifications.length, success: true }
  },
})

export const writeAuditLog = tool({
  description: 'Write an entry to the audit log for compliance tracking.',
  parameters: z.object({
    orgId: z.string(),
    userId: z.string().optional(),
    action: z.string().describe('Action like "checkpoint.create", "policy.create", "agent.suggestion"'),
    entityType: z.string(),
    entityId: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
  execute: async ({ orgId, userId, action, entityType, entityId, metadata }) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('audit_log').insert({
      org_id: orgId, user_id: userId, action, entity_type: entityType, entity_id: entityId, metadata: metadata ?? {},
    })
    if (error) return { error: error.message }
    return { success: true }
  },
})
```

## CHECKPOINT TOOLS (lib/agents/tools/checkpoint-tools.ts)

Tools specific to the Compliance Monitor:

```typescript
import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export const createCheckpoint = tool({
  description: 'Create a new checkpoint task for a specific control and period. Checks for duplicates first.',
  parameters: z.object({
    orgId: z.string(),
    controlId: z.string().describe('The control ID to create a checkpoint for'),
    period: z.string().describe('Period like "2026-03" or "2026-Q1"'),
    dueDate: z.string().describe('Due date in YYYY-MM-DD format'),
    assignedTo: z.string().optional().describe('User ID to assign to'),
  }),
  execute: async ({ orgId, controlId, period, dueDate, assignedTo }) => {
    const supabase = getSupabase()
    // Check for duplicate
    const { data: existing } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('org_id', orgId)
      .eq('control_id', controlId)
      .eq('period', period)
      .maybeSingle()
    if (existing) return { skipped: true, reason: 'Checkpoint already exists for this control and period', existingId: existing.id }

    const { data, error } = await supabase
      .from('checkpoints')
      .insert({ org_id: orgId, control_id: controlId, period, due_date: dueDate, assigned_to: assignedTo, status: 'pending' })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { created: true, checkpointId: data.id }
  },
})

export const updateCheckpointStatus = tool({
  description: 'Update a checkpoint status. Can mark as overdue, in_progress, etc.',
  parameters: z.object({
    checkpointId: z.string(),
    orgId: z.string(),
    newStatus: z.enum(['pending', 'in_progress', 'passed', 'failed', 'overdue', 'skipped']),
  }),
  execute: async ({ checkpointId, orgId, newStatus }) => {
    const supabase = getSupabase()
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'overdue') {
      // Don't clear completion data for overdue
    }
    const { error } = await supabase.from('checkpoints').update(updates).eq('id', checkpointId).eq('org_id', orgId)
    if (error) return { error: error.message }
    return { success: true, checkpointId, newStatus }
  },
})

export const generateMonthlyCheckpoints = tool({
  description: 'Generate all checkpoint tasks for a specific month based on active controls. Matches control frequency to the appropriate period.',
  parameters: z.object({
    orgId: z.string(),
    year: z.number().describe('Year like 2026'),
    month: z.number().describe('Month 1-12'),
  }),
  execute: async ({ orgId, year, month }) => {
    const supabase = getSupabase()
    const period = `${year}-${String(month).padStart(2, '0')}`

    // Get all active controls
    const { data: controls } = await supabase
      .from('controls')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)

    if (!controls || controls.length === 0) return { error: 'No active controls found' }

    let created = 0, skipped = 0
    const quarter = `${year}-Q${Math.ceil(month / 3)}`
    const half = `${year}-${month <= 6 ? 'H1' : 'H2'}`

    for (const ctrl of controls) {
      let shouldCreate = false
      let checkpointPeriod = period

      switch (ctrl.frequency) {
        case 'monthly': shouldCreate = true; break
        case 'quarterly':
          shouldCreate = [3, 6, 9, 12].includes(month)
          checkpointPeriod = quarter
          break
        case 'semi_annual':
          shouldCreate = [4, 10].includes(month)
          checkpointPeriod = half
          break
        case 'annual':
          shouldCreate = month === 3 // Annual controls in March
          checkpointPeriod = `${year}`
          break
      }

      if (!shouldCreate) continue

      // Check duplicate
      const { data: existing } = await supabase
        .from('checkpoints')
        .select('id')
        .eq('org_id', orgId)
        .eq('control_id', ctrl.id)
        .eq('period', checkpointPeriod)
        .maybeSingle()

      if (existing) { skipped++; continue }

      // Calculate due date (first Monday of appropriate week)
      const dueDate = `${year}-${String(month).padStart(2, '0')}-15` // Default to mid-month

      // Find default assignee by role
      let assignedTo = null
      if (ctrl.default_owner_role) {
        const { data: member } = await supabase
          .from('org_members')
          .select('user_id')
          .eq('org_id', orgId)
          .eq('role', ctrl.default_owner_role)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        if (member) assignedTo = member.user_id
      }

      await supabase.from('checkpoints').insert({
        org_id: orgId,
        control_id: ctrl.id,
        period: checkpointPeriod,
        due_date: dueDate,
        assigned_to: assignedTo,
        status: 'pending',
      })
      created++
    }

    return { created, skipped, period, totalControls: controls.length }
  },
})

export const analyzeFailurePatterns = tool({
  description: 'Analyze historical checkpoint pass/fail rates to identify compliance risk areas.',
  parameters: z.object({
    orgId: z.string(),
    periodsBack: z.number().optional().describe('How many months back to analyze'),
  }),
  execute: async ({ orgId, periodsBack = 6 }) => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('checkpoints')
      .select('status, period, controls(code, title, standard, category)')
      .eq('org_id', orgId)
      .in('status', ['passed', 'failed', 'overdue'])

    if (!data) return { error: 'No data found' }

    // Aggregate by control
    const byControl: Record<string, { code: string; title: string; standard: string; passed: number; failed: number; overdue: number }> = {}
    for (const cp of data) {
      const ctrl = cp.controls as any
      if (!ctrl) continue
      const key = ctrl.code
      if (!byControl[key]) byControl[key] = { code: ctrl.code, title: ctrl.title, standard: ctrl.standard, passed: 0, failed: 0, overdue: 0 }
      if (cp.status === 'passed') byControl[key].passed++
      else if (cp.status === 'failed') byControl[key].failed++
      else if (cp.status === 'overdue') byControl[key].overdue++
    }

    // Sort by failure rate
    const ranked = Object.values(byControl).map(c => ({
      ...c,
      total: c.passed + c.failed + c.overdue,
      failureRate: (c.failed + c.overdue) / (c.passed + c.failed + c.overdue) * 100,
    })).sort((a, b) => b.failureRate - a.failureRate)

    return { analysis: ranked, totalCheckpoints: data.length }
  },
})
```

## POLICY TOOLS (lib/agents/tools/policy-tools.ts)

Tools specific to the Policy Guardian:

```typescript
import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export const createPolicy = tool({
  description: 'Create a new policy document in draft status. The policy will go through the approval workflow before becoming effective.',
  parameters: z.object({
    orgId: z.string(),
    title: z.string().describe('Policy title'),
    code: z.string().describe('Policy code like POL-HIPAA-001'),
    category: z.string().describe('Category: HIPAA, Safety, Clinical, HR, Billing, Quality Management, Emergency Management, Infection Control, Credentialing, Administrative'),
    program: z.array(z.string()).describe('Programs: BHRF, OTC (IOP), All'),
    department: z.string().optional(),
    reviewCadenceMonths: z.number().describe('Review cadence: 6 for high-risk, 12 for standard'),
    contentHtml: z.string().describe('HTML content of the policy document'),
    changeSummary: z.string().describe('Summary of what this policy covers'),
  }),
  execute: async ({ orgId, title, code, category, program, department, reviewCadenceMonths, contentHtml, changeSummary }) => {
    const supabase = getSupabase()

    // Create the policy
    const nextReviewDate = new Date()
    nextReviewDate.setMonth(nextReviewDate.getMonth() + reviewCadenceMonths)

    const { data: policy, error: policyErr } = await supabase
      .from('policies')
      .insert({
        org_id: orgId,
        title,
        code,
        category,
        program,
        department,
        status: 'draft',
        review_cadence_months: reviewCadenceMonths,
        next_review_date: nextReviewDate.toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (policyErr) return { error: policyErr.message }

    // Create initial version
    const { data: version, error: versionErr } = await supabase
      .from('policy_versions')
      .insert({
        policy_id: policy.id,
        version_number: 1,
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: contentHtml }] }] },
        content_html: contentHtml,
        change_summary: changeSummary,
      })
      .select('id')
      .single()

    if (versionErr) return { error: versionErr.message }

    // Update policy with current version
    await supabase.from('policies').update({ current_version_id: version.id }).eq('id', policy.id)

    // Create AI suggestion record so it shows in approvals
    await supabase.from('ai_suggestions').insert({
      org_id: orgId,
      agent: 'policy_guardian',
      entity_type: 'policy',
      entity_id: policy.id,
      suggestion_type: 'create',
      title: `New Policy: ${title}`,
      description: `AI Policy Guardian created policy ${code}: ${title}. ${changeSummary}`,
      confidence: 0.85,
      status: 'pending',
    })

    // Log it
    await supabase.from('audit_log').insert({
      org_id: orgId,
      action: 'policy.create',
      entity_type: 'policy',
      entity_id: policy.id,
      metadata: { code, title, created_by: 'ai_policy_guardian' },
    })

    return { success: true, policyId: policy.id, code, title, status: 'draft', message: `Policy ${code} "${title}" created as draft. It will appear in the Approvals queue for review.` }
  },
})

export const createPolicySuggestion = tool({
  description: 'Create a suggestion to edit an existing policy. The suggestion goes through the approval workflow.',
  parameters: z.object({
    orgId: z.string(),
    policyId: z.string(),
    title: z.string().describe('Title of the suggestion'),
    description: z.string().describe('What should be changed and why'),
    suggestedChanges: z.string().describe('The specific text or content to add/modify'),
    confidence: z.number().describe('Confidence score 0.0-1.0'),
  }),
  execute: async ({ orgId, policyId, title, description, suggestedChanges, confidence }) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('ai_suggestions').insert({
      org_id: orgId,
      agent: 'policy_guardian',
      entity_type: 'policy',
      entity_id: policyId,
      suggestion_type: 'edit',
      title,
      description,
      suggested_changes: { text: suggestedChanges },
      confidence,
      status: 'pending',
    }).select('id').single()

    if (error) return { error: error.message }

    // Notify compliance/admin users
    const { data: admins } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .in('role', ['admin', 'compliance'])
      .eq('is_active', true)

    const notifications = (admins ?? []).map((a: any) => ({
      org_id: orgId,
      user_id: a.user_id,
      type: 'suggestion',
      title: `AI Suggestion: ${title}`,
      message: description,
      entity_type: 'ai_suggestion',
      entity_id: data.id,
    }))
    if (notifications.length > 0) await supabase.from('notifications').insert(notifications)

    return { success: true, suggestionId: data.id, message: `Suggestion "${title}" created and sent to compliance team for review.` }
  },
})

export const checkPolicyReviewDates = tool({
  description: 'Check which policies are past their review date or coming up for review soon.',
  parameters: z.object({
    orgId: z.string(),
    daysAhead: z.number().optional().describe('Check policies due for review within this many days'),
  }),
  execute: async ({ orgId, daysAhead = 30 }) => {
    const supabase = getSupabase()
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0]

    // Overdue
    const { data: overdue } = await supabase
      .from('policies')
      .select('id, title, code, category, status, next_review_date')
      .eq('org_id', orgId)
      .lt('next_review_date', today)
      .in('status', ['effective', 'approved'])

    // Upcoming
    const { data: upcoming } = await supabase
      .from('policies')
      .select('id, title, code, category, status, next_review_date')
      .eq('org_id', orgId)
      .gte('next_review_date', today)
      .lte('next_review_date', futureDate)
      .in('status', ['effective', 'approved'])

    return {
      overdue: overdue ?? [],
      overdueCount: (overdue ?? []).length,
      upcoming: upcoming ?? [],
      upcomingCount: (upcoming ?? []).length,
    }
  },
})
```

## EVIDENCE TOOLS (lib/agents/tools/evidence-tools.ts)

```typescript
import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export const findMissingEvidence = tool({
  description: 'Find checkpoints that are completed (passed/in_progress) but missing required evidence uploads.',
  parameters: z.object({
    orgId: z.string(),
    period: z.string().optional(),
  }),
  execute: async ({ orgId, period }) => {
    const supabase = getSupabase()
    let query = supabase
      .from('checkpoints')
      .select('id, status, due_date, period, controls(code, title, standard, required_evidence), profiles:assigned_to(full_name, email)')
      .eq('org_id', orgId)
      .in('status', ['passed', 'in_progress', 'failed'])

    if (period) query = query.eq('period', period)

    const { data: checkpoints } = await query
    if (!checkpoints) return { missing: [], count: 0 }

    const missing: any[] = []

    for (const cp of checkpoints) {
      const ctrl = cp.controls as any
      if (!ctrl?.required_evidence?.length) continue

      // Count evidence for this checkpoint
      const { count } = await supabase
        .from('evidence')
        .select('id', { count: 'exact', head: true })
        .eq('checkpoint_id', cp.id)

      if (!count || count < ctrl.required_evidence.length) {
        missing.push({
          checkpointId: cp.id,
          controlCode: ctrl.code,
          controlTitle: ctrl.title,
          standard: ctrl.standard,
          status: cp.status,
          dueDate: cp.due_date,
          assignedTo: (cp.profiles as any)?.full_name ?? 'Unassigned',
          requiredEvidence: ctrl.required_evidence,
          uploadedCount: count ?? 0,
          missingCount: ctrl.required_evidence.length - (count ?? 0),
        })
      }
    }

    return { missing, count: missing.length }
  },
})

export const getEvidenceCoverage = tool({
  description: 'Calculate evidence coverage percentage by standard — what percentage of checkpoints have all required evidence.',
  parameters: z.object({
    orgId: z.string(),
    period: z.string().optional(),
  }),
  execute: async ({ orgId, period }) => {
    const supabase = getSupabase()
    let query = supabase
      .from('checkpoints')
      .select('id, controls(standard, required_evidence)')
      .eq('org_id', orgId)

    if (period) query = query.eq('period', period)

    const { data: checkpoints } = await query
    if (!checkpoints) return { coverage: {}, overall: 0 }

    const byStandard: Record<string, { total: number; covered: number }> = {}

    for (const cp of checkpoints) {
      const ctrl = cp.controls as any
      if (!ctrl) continue
      const std = ctrl.standard
      if (!byStandard[std]) byStandard[std] = { total: 0, covered: 0 }
      byStandard[std].total++

      const { count } = await supabase
        .from('evidence')
        .select('id', { count: 'exact', head: true })
        .eq('checkpoint_id', cp.id)

      if (count && count > 0) byStandard[std].covered++
    }

    const coverage = Object.entries(byStandard).map(([standard, { total, covered }]) => ({
      standard,
      total,
      covered,
      percentage: total > 0 ? Math.round((covered / total) * 100) : 0,
    }))

    const totalAll = Object.values(byStandard).reduce((s, v) => s + v.total, 0)
    const coveredAll = Object.values(byStandard).reduce((s, v) => s + v.covered, 0)
    const overall = totalAll > 0 ? Math.round((coveredAll / totalAll) * 100) : 0

    return { coverage, overall }
  },
})
```

## QM TOOLS (lib/agents/tools/qm-tools.ts)

```typescript
import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export const calculateAuditReadiness = tool({
  description: 'Calculate the composite audit readiness score. Formula: overall = (0.35 × checkpoint) + (0.25 × evidence) + (0.25 × policy) + (0.15 × CAPA).',
  parameters: z.object({
    orgId: z.string(),
    period: z.string().optional(),
  }),
  execute: async ({ orgId, period }) => {
    const supabase = getSupabase()
    const currentPeriod = period ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    // Checkpoint score
    const { data: checkpoints } = await supabase
      .from('checkpoints')
      .select('status, due_date, completed_at')
      .eq('org_id', orgId)
      .eq('period', currentPeriod)

    const totalCp = checkpoints?.length ?? 0
    const passedOnTime = checkpoints?.filter(cp =>
      cp.status === 'passed' && cp.completed_at && new Date(cp.completed_at) <= new Date(cp.due_date)
    ).length ?? 0
    const checkpointScore = totalCp > 0 ? (passedOnTime / totalCp) * 100 : 0

    // Evidence score
    let withEvidence = 0
    for (const cp of checkpoints ?? []) {
      const { count } = await supabase.from('evidence').select('id', { count: 'exact', head: true }).eq('checkpoint_id', (cp as any).id ?? '')
      if (count && count > 0) withEvidence++
    }
    const evidenceScore = totalCp > 0 ? (withEvidence / totalCp) * 100 : 0

    // Policy score
    const { data: policies } = await supabase.from('policies').select('status, next_review_date').eq('org_id', orgId)
    const totalPol = policies?.length ?? 0
    const effectiveCurrent = policies?.filter(p =>
      p.status === 'effective' && (!p.next_review_date || new Date(p.next_review_date) > new Date())
    ).length ?? 0
    const policyScore = totalPol > 0 ? (effectiveCurrent / totalPol) * 100 : 0

    // CAPA score
    const { data: capas } = await supabase.from('capas').select('status, due_date, verified_at').eq('org_id', orgId)
    const totalCapa = capas?.length ?? 0
    const closedOnTime = capas?.filter(c =>
      c.status === 'closed' && c.verified_at && c.due_date && new Date(c.verified_at) <= new Date(c.due_date)
    ).length ?? 0
    const capaScore = totalCapa > 0 ? (closedOnTime / totalCapa) * 100 : 0

    const overall = (0.35 * checkpointScore) + (0.25 * evidenceScore) + (0.25 * policyScore) + (0.15 * capaScore)

    // Save score
    await supabase.from('audit_readiness_scores').upsert({
      org_id: orgId,
      period: currentPeriod,
      overall_score: Math.round(overall * 100) / 100,
      checkpoint_score: Math.round(checkpointScore * 100) / 100,
      evidence_score: Math.round(evidenceScore * 100) / 100,
      policy_score: Math.round(policyScore * 100) / 100,
      capa_score: Math.round(capaScore * 100) / 100,
      calculated_at: new Date().toISOString(),
    }, { onConflict: 'org_id,period', ignoreDuplicates: false })

    return {
      overall: Math.round(overall * 10) / 10,
      checkpointScore: Math.round(checkpointScore * 10) / 10,
      evidenceScore: Math.round(evidenceScore * 10) / 10,
      policyScore: Math.round(policyScore * 10) / 10,
      capaScore: Math.round(capaScore * 10) / 10,
      period: currentPeriod,
      details: {
        checkpoints: { total: totalCp, passedOnTime },
        evidence: { total: totalCp, withEvidence },
        policies: { total: totalPol, effectiveCurrent },
        capas: { total: totalCapa, closedOnTime },
      },
    }
  },
})

export const createFinding = tool({
  description: 'Create a finding from a failed or overdue checkpoint. Findings feed into the QM review process.',
  parameters: z.object({
    orgId: z.string(),
    checkpointId: z.string().optional(),
    title: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    standard: z.string().optional(),
    qmMeetingId: z.string().optional(),
  }),
  execute: async ({ orgId, checkpointId, title, description, severity, standard, qmMeetingId }) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('findings').insert({
      org_id: orgId, checkpoint_id: checkpointId, title, description, severity, standard, qm_meeting_id: qmMeetingId,
    }).select('id').single()
    if (error) return { error: error.message }
    return { success: true, findingId: data.id }
  },
})

export const createCAPA = tool({
  description: 'Create a Corrective and Preventive Action (CAPA) from a finding.',
  parameters: z.object({
    orgId: z.string(),
    findingId: z.string().optional(),
    title: z.string(),
    description: z.string(),
    rootCause: z.string().optional(),
    correctiveAction: z.string(),
    preventiveAction: z.string().optional(),
    ownerId: z.string().optional(),
    dueDate: z.string().optional(),
  }),
  execute: async ({ orgId, findingId, title, description, rootCause, correctiveAction, preventiveAction, ownerId, dueDate }) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('capas').insert({
      org_id: orgId, finding_id: findingId, title, description, root_cause: rootCause,
      corrective_action: correctiveAction, preventive_action: preventiveAction,
      owner_id: ownerId, due_date: dueDate, status: 'open',
    }).select('id').single()
    if (error) return { error: error.message }
    return { success: true, capaId: data.id }
  },
})
```

## STREAMING CHAT API ROUTE (app/api/ai-chat/route.ts)

This is the core — it creates a streaming Claude response with tools:

```typescript
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@supabase/supabase-js'
import { AGENTS } from '@/lib/agents/agent-config'

// Import all tools
import { queryCheckpoints, queryControls, queryPolicies, queryCAPAs, queryEvidence, queryOrgMembers, sendNotification, writeAuditLog } from '@/lib/agents/tools/shared-tools'
import { createCheckpoint, updateCheckpointStatus, generateMonthlyCheckpoints, analyzeFailurePatterns } from '@/lib/agents/tools/checkpoint-tools'
import { createPolicy, createPolicySuggestion, checkPolicyReviewDates } from '@/lib/agents/tools/policy-tools'
import { findMissingEvidence, getEvidenceCoverage } from '@/lib/agents/tools/evidence-tools'
import { calculateAuditReadiness, createFinding, createCAPA } from '@/lib/agents/tools/qm-tools'

// Build tool sets per agent
const AGENT_TOOLS: Record<string, Record<string, any>> = {
  compliance_monitor: {
    queryCheckpoints, queryControls, queryOrgMembers, sendNotification, writeAuditLog,
    createCheckpoint, updateCheckpointStatus, generateMonthlyCheckpoints, analyzeFailurePatterns,
  },
  evidence_librarian: {
    queryCheckpoints, queryControls, queryEvidence, queryOrgMembers, sendNotification, writeAuditLog,
    findMissingEvidence, getEvidenceCoverage,
  },
  policy_guardian: {
    queryPolicies, queryControls, queryCheckpoints, queryOrgMembers, sendNotification, writeAuditLog,
    createPolicy, createPolicySuggestion, checkPolicyReviewDates,
  },
  qm_orchestrator: {
    queryCheckpoints, queryControls, queryPolicies, queryCAPAs, queryEvidence, queryOrgMembers, sendNotification, writeAuditLog,
    calculateAuditReadiness, createFinding, createCAPA, analyzeFailurePatterns,
  },
}

export async function POST(request: Request) {
  const { messages, agentName, orgId, userId } = await request.json()

  // Validate
  if (!agentName || !AGENTS[agentName]) {
    return new Response(JSON.stringify({ error: 'Invalid agent' }), { status: 400 })
  }
  if (!orgId) {
    return new Response(JSON.stringify({ error: 'No organization context' }), { status: 400 })
  }

  const agentConfig = AGENTS[agentName]
  const tools = AGENT_TOOLS[agentName] ?? {}

  // Log the agent run
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const startTime = Date.now()

  const { data: runRecord } = await supabase
    .from('ai_agent_runs')
    .insert({
      org_id: orgId,
      agent: agentName,
      trigger_type: 'chat',
      status: 'running',
      input_summary: messages[messages.length - 1]?.content?.substring(0, 200) ?? '',
    })
    .select('id')
    .single()

  // Create the streaming response with Claude
  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    system: `${agentConfig.systemPrompt}

CONTEXT:
- Organization ID: ${orgId}
- User ID: ${userId}
- Current date: ${new Date().toISOString().split('T')[0]}
- Current period: ${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}

When you use tools, always pass orgId="${orgId}" as the orgId parameter.
When taking actions that modify data, always confirm what you did in your response.
Format responses using markdown for readability.`,
    messages,
    tools,
    maxSteps: 10, // Allow up to 10 tool calls in a single response
    onFinish: async ({ text, usage }) => {
      // Update agent run record
      if (runRecord) {
        await supabase.from('ai_agent_runs').update({
          status: 'completed',
          output_summary: text.substring(0, 500),
          tokens_used: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
          duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
        }).eq('id', runRecord.id)
      }
    },
  })

  return result.toDataStreamResponse()
}
```

## CHAT SLIDEOUT (components/ai/chat-slideout.tsx)

Sliding panel from the right side of the screen:

```
The panel should be:
- Width: 440px
- Full height (100vh)
- Position: fixed right
- Z-index: 40
- White background
- Left border: 1px solid #E8E8E8
- Shadow: -4px 0 24px rgba(0,0,0,0.1)
- Slide-in animation from right (transform translateX)
```

### Layout:
**Header:**
- Agent icon + name (14px bold)
- Agent description (12px, #737373)
- Close X button (top right)
- Colored top accent bar (3px, agent's color)

**Quick Actions (below header):**
- Horizontal scrollable row of pill buttons
- Each pill: text from agentConfig.quickActions[].label
- On click: sends the quickAction.prompt as a user message
- Style: outlined pills, 12px font, #E8E8E8 border, hover bg changes to agent color with white text

**Chat Messages (scrollable area, flex-1):**
- User messages: right-aligned, blue-dark bg (#2A8BA8), white text, rounded bubble
- Agent messages: left-aligned, white bg with #F5F5F5 border, dark text, rounded bubble
- Tool call results: show as collapsed sections:
  - Header: "🔧 Used: {toolName}" with expand/collapse arrow
  - Collapsed by default
  - Expanded shows the tool result as formatted JSON or a summary
- Streaming: show text appearing character-by-character as it streams
- Loading: show typing indicator (three dots animation) while waiting for response

**Input Area (bottom, fixed):**
- Text input (auto-expanding textarea)
- Send button (arrow icon, agent color)
- "Press Enter to send, Shift+Enter for new line"
- Disabled while agent is responding

### State Management:
Use the useChat hook from Vercel AI SDK:

```tsx
import { useChat } from 'ai/react'

const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
  api: '/api/ai-chat',
  body: {
    agentName: selectedAgent,
    orgId: orgId,
    userId: userId,
  },
})
```

## AI ACTIVITY PAGE (ai/page.tsx) — COMPLETE REWRITE

Matches the screenshot layout with 4 agent cards + activity feed, ALL from real DB data.

### Agent Cards (2x2 grid):
Each card queries REAL data:

```
For each agent, query:
- Last run: ai_agent_runs WHERE agent={name} ORDER BY created_at DESC LIMIT 1
- Stats vary by agent:
  - Compliance Monitor: count checkpoints pending + overdue for current period
  - Evidence Librarian: count checkpoints missing evidence
  - Policy Guardian: count policies past review date + pending suggestions
  - QM Orchestrator: latest audit readiness score
```

**Card Layout (from screenshot):**
- Agent icon (large, colored circle) + name + status badge ("Active" green / "Scheduled" yellow)
- Description text
- Stats row: 3-4 key metrics with numbers (queried from DB)
  - Compliance Monitor: "Active Checkpoints", "Overdue", "Completion Rate"
  - Evidence Librarian: "Evidence Files", "Missing", "Coverage %"
  - Policy Guardian: "Policies", "In Review", "Past Due"
  - QM Orchestrator: "Audit Score", "Open CAPAs", "Findings"
- Last run info: date + summary + duration + tokens
- **"Chat with Agent" button** — opens the chat slideout for this agent
- **"Run Now" button** (admin only) — triggers a manual agent run

### Activity Feed (below cards):
Query: ai_agent_runs ORDER BY created_at DESC LIMIT 20
- Each row: timestamp, agent name badge, action description, status dot
- Real data from the ai_agent_runs table

### Key Integration:
- "Chat with Agent" button sets state to open the slideout with the selected agent
- "Run Now" button calls the /api/ai-chat route with a pre-built prompt to run the agent's main task
- Agent stats refresh on page load and after any chat interaction

## SIDEBAR INTEGRATION

The AI Agents sidebar item should navigate to /ai. When the chat slideout is open, it overlays on top of whatever page the user is on (it's a global component rendered in the portal layout).

Add the chat slideout component to src/app/(portal)/layout.tsx so it's available on every portal page.

## AGENT-TO-AGENT COMMUNICATION

Agents can reference each other's data through shared tools. For example:
- QM Orchestrator calls `analyzeFailurePatterns` (a Compliance Monitor tool)
- Policy Guardian calls `queryCheckpoints` to see which controls have failures
- Evidence Librarian calls `queryCheckpoints` to find completed items needing proof

For active handoffs, an agent can create a suggestion with entity_type pointing to another agent's domain, which triggers notifications.

DO NOT touch: dashboard, controls, vault, calendar, checkpoints, qm, capa, settings, auth, evidence, reports, approvals, or any files not listed above.
