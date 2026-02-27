Read CLAUDE.md first. Your job is to create server actions and API routes for all major mutations, replacing direct client-side Supabase calls with validated server-side operations. This centralizes audit logging, validation, and authorization.

ONLY touch these files (create if needed):
- src/app/actions/checkpoints.ts (CREATE — checkpoint server actions)
- src/app/actions/controls.ts (CREATE — control CRUD server actions)
- src/app/actions/policies.ts (CREATE — policy CRUD + approval server actions)
- src/app/actions/capas.ts (CREATE — CAPA CRUD + status workflow server actions)
- src/app/actions/qm.ts (CREATE — QM meeting + findings server actions)
- src/app/actions/evidence.ts (CREATE — evidence upload + linking server actions)
- src/app/actions/suggestions.ts (CREATE — AI suggestion accept/reject server actions)
- src/app/actions/members.ts (CREATE — org member management server actions)
- src/app/actions/audit.ts (CREATE — shared audit logging helper)
- src/app/api/generate-report/route.ts (CREATE — PDF report generation endpoint)
- src/app/api/export/controls/route.ts (CREATE — CSV export for controls)
- src/app/api/export/evidence/route.ts (CREATE — evidence binder export)
- src/lib/utils/permissions.ts (CREATE — server-side role authorization)
- src/lib/utils/validation.ts (CREATE — input validation with Zod)

INSTALL FIRST:
```
npm install zod
```

Current state: All mutations happen via direct Supabase client calls from React components. No server-side validation, no centralized audit logging, no authorization checks beyond RLS. Pages call supabase.from("table").insert() directly.

## SHARED UTILITIES

### Audit Logger (actions/audit.ts)
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function writeAuditLog(params: {
  orgId: string
  userId: string
  action: string        // e.g., 'checkpoint.complete', 'policy.approve', 'capa.create'
  entityType: string    // e.g., 'checkpoint', 'policy', 'capa'
  entityId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()
  await supabase.from('audit_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  })
}
```

### Permission Checker (lib/utils/permissions.ts)
```typescript
import { createClient } from '@/lib/supabase/server'
import type { OrgRole } from '@/lib/types'

export async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')

  const { data: member } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!member) throw new Error('No organization membership')

  return {
    userId: user.id,
    orgId: member.org_id as string,
    role: member.role as OrgRole,
    supabase,
  }
}

export function requireRole(userRole: OrgRole, allowedRoles: OrgRole[]) {
  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Insufficient permissions. Required: ${allowedRoles.join(', ')}`)
  }
}
```

### Validation Schemas (lib/utils/validation.ts)
```typescript
import { z } from 'zod'

export const CheckpointCompleteSchema = z.object({
  checkpointId: z.string().uuid(),
  attestation: z.enum(['pass', 'fail']),
  notes: z.string().optional(),
})

export const ControlCreateSchema = z.object({
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  standard: z.string().min(1),
  category: z.string().optional(),
  test_procedure: z.string().min(1),
  required_evidence: z.array(z.string()),
  frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']),
  default_owner_role: z.enum(['admin', 'compliance', 'clinical', 'ops', 'hr', 'billing', 'supervisor', 'executive']).optional(),
  related_policy_ids: z.array(z.string().uuid()).optional(),
  is_active: z.boolean().default(true),
})

export const PolicyCreateSchema = z.object({
  title: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  category: z.string().min(1),
  program: z.array(z.string()),
  department: z.string().optional(),
  owner_id: z.string().uuid().optional(),
  review_cadence_months: z.number().int().min(1).max(36).default(12),
})

export const PolicyApprovalSchema = z.object({
  policyId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
})

export const CAPACreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  root_cause: z.string().optional(),
  corrective_action: z.string().optional(),
  preventive_action: z.string().optional(),
  owner_id: z.string().uuid().optional(),
  due_date: z.string().optional(),
  finding_id: z.string().uuid().optional(),
})

export const CAPAStatusSchema = z.object({
  capaId: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'pending_verification', 'closed']),
  verification_notes: z.string().optional(),
})

export const SuggestionReviewSchema = z.object({
  suggestionId: z.string().uuid(),
  action: z.enum(['accept', 'reject', 'modify']),
  notes: z.string().optional(),
  modifications: z.record(z.unknown()).optional(),
})

export const MemberInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'compliance', 'clinical', 'ops', 'hr', 'billing', 'supervisor', 'executive']),
})

export const MemberRoleChangeSchema = z.object({
  memberId: z.string().uuid(),
  newRole: z.enum(['admin', 'compliance', 'clinical', 'ops', 'hr', 'billing', 'supervisor', 'executive']),
})
```

## CHECKPOINT ACTIONS (actions/checkpoints.ts)

```typescript
'use server'

// completeCheckpoint(data) — marks checkpoint passed/failed
// 1. Validate with CheckpointCompleteSchema
// 2. getAuthContext() — verify user is authenticated + get orgId
// 3. Verify checkpoint belongs to this org
// 4. Check evidence exists (if attestation='pass', require at least 1 evidence)
// 5. UPDATE checkpoints SET status, attestation, completed_at=now(), completed_by=userId, notes
// 6. writeAuditLog('checkpoint.complete', ...)
// 7. Return success

// generateCheckpoints(controlIds: string[], period: string) — bulk create checkpoints
// 1. getAuthContext() + requireRole(['admin', 'compliance'])
// 2. For each control_id: query control, determine due_date from frequency
// 3. Check for duplicate (same control_id + period)
// 4. INSERT INTO checkpoints with status='pending'
// 5. writeAuditLog for each
// 6. Return { created: number, skipped: number }

// assignCheckpoint(checkpointId, assigneeId) — change assignee
// updateCheckpointStatus(checkpointId, status) — manual status change
```

## CONTROL ACTIONS (actions/controls.ts)

```typescript
'use server'

// createControl(data) — validated insert
// 1. Validate with ControlCreateSchema
// 2. getAuthContext() + requireRole(['admin', 'compliance'])
// 3. Check code uniqueness within org
// 4. INSERT INTO controls
// 5. writeAuditLog('control.create', ...)
// 6. Return new control id

// updateControl(controlId, data) — validated update
// deleteControl(controlId) — soft delete or hard delete with confirmation
// bulkActivate(controlIds) — set is_active=true for multiple
// bulkDeactivate(controlIds) — set is_active=false for multiple
```

## POLICY ACTIONS (actions/policies.ts)

```typescript
'use server'

// createPolicy(data) — create policy + initial version
// 1. Validate with PolicyCreateSchema
// 2. getAuthContext() + requireRole(['admin', 'compliance'])
// 3. INSERT INTO policies with status='draft'
// 4. INSERT INTO policy_versions with version_number=1
// 5. UPDATE policies SET current_version_id
// 6. writeAuditLog('policy.create', ...)

// updatePolicyContent(policyId, content, changeSummary) — save new version
// 1. Increment version_number
// 2. INSERT new policy_versions row
// 3. UPDATE policies SET current_version_id, updated_at

// submitForReview(policyId) — status draft → in_review
// 1. UPDATE policies SET status='in_review'
// 2. Create notification for all admin/compliance users
// 3. writeAuditLog

// approvePolicy(policyId, notes?) — status in_review → approved → effective
// 1. getAuthContext() + requireRole(['admin'])
// 2. UPDATE policies SET status='approved'
// 3. UPDATE policy_versions SET approved_by, approved_at
// 4. writeAuditLog

// rejectPolicy(policyId, notes) — status in_review → draft
// retirePolicy(policyId) — status → retired
```

## CAPA ACTIONS (actions/capas.ts)

```typescript
'use server'

// createCAPA(data) — create new CAPA
// updateCAPA(capaId, data) — update CAPA fields
// transitionStatus(capaId, newStatus, notes?) — workflow transitions
//   open → in_progress: "Start Work"
//   in_progress → pending_verification: "Submit for Verification"
//   pending_verification → closed: "Verify & Close" (set verified_by, verified_at, verification_notes)
//   any → overdue: (system only, via agent)
// Each transition: validate allowed, update DB, writeAuditLog, create notification
```

## QM ACTIONS (actions/qm.ts)

```typescript
'use server'

// createMeeting(period, meetingDate) — create QM meeting for a period
// updateMeetingAgenda(meetingId, agenda) — save checklist state to JSONB
// completeMeeting(meetingId) — mark meeting as completed
// createFinding(data) — create finding linked to meeting + checkpoint
// autoGenerateFindings(meetingId, period) — query failed/overdue checkpoints, create findings
// updateExecutiveSummary(meetingId, summary) — save narrative text
```

## EVIDENCE ACTIONS (actions/evidence.ts)

```typescript
'use server'

// linkEvidence(checkpointId, evidenceData) — after file upload, create evidence record
// 1. Verify checkpoint exists and belongs to org
// 2. INSERT INTO evidence
// 3. writeAuditLog
// 4. Return evidence record

// unlinkEvidence(evidenceId) — remove evidence from checkpoint (soft: just unlink, don't delete file)
```

## SUGGESTION ACTIONS (actions/suggestions.ts)

```typescript
'use server'

// reviewSuggestion(data) — accept/reject/modify AI suggestion
// 1. Validate with SuggestionReviewSchema
// 2. getAuthContext()
// 3. UPDATE ai_suggestions SET status, reviewed_by, reviewed_at, review_notes
// 4. If accepted: apply the suggested changes to the relevant entity
//    - If entity_type='policy' + suggestion_type='edit': update policy content
//    - If entity_type='control' + suggestion_type='create': create new control
//    - If entity_type='checkpoint' + suggestion_type='flag': create notification
// 5. writeAuditLog('suggestion.accept' or 'suggestion.reject')
```

## MEMBER ACTIONS (actions/members.ts)

```typescript
'use server'

// inviteMember(email, role) — invite new user to org
// changeRole(memberId, newRole) — change member's role
// deactivateMember(memberId) — set is_active=false
// reactivateMember(memberId) — set is_active=true
// All require admin role
```

## API ROUTES

### PDF Report Generation (api/generate-report/route.ts)
```typescript
// POST /api/generate-report
// Body: { reportType: 'compliance' | 'qm-summary' | 'audit-binder', period: string }
// Returns: PDF buffer as response with Content-Type: application/pdf

import { renderToBuffer } from '@react-pdf/renderer'
// Import the PDF templates from src/components/reports/
// Fetch data server-side, render PDF, return as download
```

### CSV Export — Controls (api/export/controls/route.ts)
```typescript
// GET /api/export/controls
// Returns: CSV file with all org controls
// Headers: Content-Type: text/csv, Content-Disposition: attachment

// 1. getAuthContext()
// 2. Query all controls for org
// 3. Format as CSV with columns: code, title, description, standard, category, test_procedure, required_evidence, frequency, default_owner_role, is_active
// 4. Return Response with CSV content
```

### CSV Export — Evidence (api/export/evidence/route.ts)
```typescript
// GET /api/export/evidence?period=2026-02
// Returns: CSV manifest of all evidence for a period
// Columns: file_name, file_type, checkpoint_code, checkpoint_title, standard, uploaded_by, upload_date, file_path
```

## RETURN FORMAT

All server actions should return a consistent shape:
```typescript
type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string }
```

This allows UI components to handle results uniformly:
```tsx
const result = await completeCheckpoint(data)
if (result.success) {
  toastSuccess('Checkpoint completed')
} else {
  toastError(result.error)
}
```

DO NOT touch: any existing page.tsx files, any existing component files, layout files, auth pages, hooks, or any files not listed above. These server actions will be consumed by the existing pages in a future integration step.
