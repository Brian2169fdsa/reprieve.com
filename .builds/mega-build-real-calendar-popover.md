Read CLAUDE.md first. Your job is to rebuild the calendar to be a fully functional compliance operating system — every day cell opens a real, editable checkpoint popover. Empty days let you create new checkpoints. Everything saves to Supabase. Email notifications fire on due dates. NO MOCK DATA — this is production.

INSTALL FIRST:
```
npm install @supabase/auth-helpers-nextjs resend
npx shadcn@latest add dialog popover select textarea input label --yes
```

If resend install fails, skip it — we'll use Supabase Edge Functions + built-in email as fallback.

ONLY touch these files (create if needed):
- src/components/calendar/checkpoint-calendar.tsx (REWRITE — remove all mock/seed, wire everything real)
- src/components/calendar/calendar-event.tsx (ENHANCE — clickable pills that open popover)
- src/components/checkpoints/checkpoint-modal.tsx (COMPLETE REWRITE — match the design screenshot exactly)
- src/components/checkpoints/evidence-uploader.tsx (ENHANCE — wire to real Supabase Storage)
- src/components/checkpoints/create-checkpoint-form.tsx (CREATE — form for adding new checkpoints)
- src/components/checkpoints/assignee-select.tsx (CREATE — dropdown of org members for assignment/reassignment)
- src/app/(portal)/calendar/page.tsx (ENHANCE — pass required props)
- src/app/(portal)/checkpoints/[id]/page.tsx (ENHANCE — standalone checkpoint view)
- src/app/actions/checkpoints.ts (CREATE — server actions for all checkpoint mutations)
- supabase/functions/checkpoint-email-notify/index.ts (CREATE — Edge Function for email notifications)

## CRITICAL RULES
1. **NO MOCK DATA.** If the database is empty, the calendar shows empty. Users seed via the seed button from mega-build-real-controls-seed.md.
2. **Everything is editable.** Assignee, status, notes, attestation — all savable in real-time.
3. **Everything writes to audit_log.** Every create, update, complete, reassign action.
4. **Evidence is required for pass.** Cannot attest "Pass" without at least 1 evidence upload.

## CALENDAR COMPONENT (checkpoint-calendar.tsx) — REWRITE

Keep the existing layout structure (month nav, calendar grid, list view toggle, stats bar) but:

### Remove ALL seed/mock data
- Delete any `buildMockCheckpoints` or seed function
- Delete any `if (data.length === 0) { seed... }` logic
- If query returns empty: show empty calendar cells with "+" buttons

### Day Cell Behavior
**Days WITH checkpoints:**
- Show checkpoint pills (colored by status, same as current)
- Clicking any pill opens the Checkpoint Popover Modal for that checkpoint
- If multiple checkpoints on same day, show all pills stacked

**Days WITHOUT checkpoints:**
- On hover: show a subtle "+" icon in the cell
- Clicking the "+" or clicking the empty cell: opens the Create Checkpoint Form with that day pre-filled as due date
- The "+" should be a small, light gray circle that appears on hover

**Today indicator:**
- Today's cell gets a blue ring/border highlight
- Today's date number is bold + blue

### Stats Bar (real data only)
- Total checkpoints for the month
- Completed (passed + failed)
- Pending
- Overdue (status='overdue' OR due_date < today AND status IN ('pending','in_progress'))
- All from real Supabase query

### "Add Checkpoint" Button
In the calendar header bar (next to the existing "Generate Checkpoints" button):
- "+" or "Add Checkpoint" button
- Opens the Create Checkpoint Form (no pre-filled date)

### List View
Keep the sortable list view but:
- Each row is clickable → opens the same Checkpoint Popover Modal
- Add an "Assigned To" column showing real profile names
- Add a "Domain" column showing the control's category/domain

## CHECKPOINT POPOVER MODAL (checkpoint-modal.tsx) — COMPLETE REWRITE

This is the most important component. It must match the design screenshot the user showed.

### Modal Container
- Full-screen overlay: rgba(0,0,0,0.45)
- Center modal: white bg, 12px border-radius, max-width 560px, 28-32px padding
- Shadow: 0 20px 60px rgba(0,0,0,0.18)
- Close "X" button top-right
- Click overlay to close (with unsaved changes warning)

### Modal Header
```
[Status Badge]                                        [X close]
Checkpoint Title Here                    ← Source Serif 4, 18px, bold
GOV-QM-001                              ← monospace, 12px, #737373
```

### Details Section (2x2 grid of info items)
```
Standard                    Assigned To
[Badge: "Internal"]         [Avatar] Sarah Chen  [Reassign ▼]

Due Date                    Status
March 4, 2026               [Badge: Pending]
```

**CRITICAL — Assigned To is EDITABLE:**
- Shows current assignee name + avatar
- "Reassign" dropdown button next to name
- Dropdown shows all org members (query org_members JOIN profiles WHERE is_active=true)
- Selecting a new person: UPDATE checkpoints SET assigned_to = new_user_id, write to audit_log
- Optimistic update — show new name immediately, revert on error

**Status is EDITABLE (for admin/compliance roles):**
- Clicking the status badge opens a dropdown with allowed transitions:
  - pending → in_progress
  - pending → skipped
  - in_progress → pending (revert)
  - overdue → in_progress
- Each transition: UPDATE checkpoints SET status, write to audit_log

### Domain Section
- "Domain" label
- Shows the control's domain/category: "Quality Management / Governance"
- Shows "Applies To": program badges (BHRF, OTC (IOP))

### Test Procedure Section
- "Test Procedure" label (13px, bold, #404040)
- Gray background box (#F5F5F5, 8px padding, 6px radius)
- The control's full test_procedure text, preserving line breaks
- Scrollable if long (max-height 200px)

### Evidence Section
- "Evidence" label with count badge (e.g., "Evidence (3)")
- **Required evidence checklist:**
  - List each item from controls.required_evidence
  - Green checkmark if a matching evidence file has been uploaded
  - Red X if missing
  - This shows the user exactly what proof is still needed
- **Uploaded files list:**
  - Each file: file type icon (PDF/IMG/DOC), filename, file size, upload date
  - "View" button → opens signed URL from getEvidenceUrl() in new tab
  - "Delete" button → removes file (with confirmation)
- **Upload dropzone:**
  - Dashed border box (#E8E8E8 border, 2px dashed)
  - "Drop files here or click to upload" text
  - Accepts: pdf, jpg, png, doc, docx, xlsx
  - On drop/select: call uploadEvidence() from storage.ts
  - After upload: INSERT into evidence table (org_id, checkpoint_id, file_path, file_name, file_type, file_size_bytes, uploaded_by)
  - Refresh evidence list
  - Write audit_log entry

### Notes Section
- "Notes" label
- Textarea (auto-expanding, min 3 rows)
- Pre-filled with existing checkpoint.notes
- Auto-saves on blur (UPDATE checkpoints SET notes)
- Or save with the submit button

### Attestation Section
- "Attestation" label
- Two side-by-side toggle buttons:
  - **Pass** — green when selected (#16A34A bg, white text), gray outline when unselected
  - **Fail** — red when selected (#DC2626 bg, white text), gray outline when unselected
- Only one can be selected at a time
- **Cannot select "Pass" if evidence count is 0** — show tooltip: "Upload at least one piece of evidence before attesting Pass"

### Footer Buttons
```
[Cancel]                              [Submit & Complete]
```
- **Cancel**: close modal, discard unsaved changes (warn if dirty)
- **Submit & Complete**:
  1. Validate: attestation is selected, evidence uploaded (for pass)
  2. UPDATE checkpoints SET status=(attestation='pass' ? 'passed' : 'failed'), attestation, completed_at=now(), completed_by=current_user_id, notes
  3. Write to audit_log (action: 'checkpoint.complete')
  4. Show success toast
  5. Close modal
  6. Trigger calendar refetch

### Reopening Completed Checkpoints
If checkpoint status is already 'passed' or 'failed':
- Show all fields as read-only by default
- Show a "Reopen" button (admin/compliance only)
- "Reopen" → sets status back to 'in_progress', clears completed_at/completed_by
- Write to audit_log

## CREATE CHECKPOINT FORM (create-checkpoint-form.tsx) — CREATE

Modal form for creating new ad-hoc checkpoints (when clicking empty day or "Add" button).

### Form Fields:
- **Control** (required): dropdown of all active controls for this org
  - Query: controls WHERE org_id = current_org AND is_active=true ORDER BY code
  - Show: code + title in dropdown
  - On select: auto-fill standard, test_procedure preview, required_evidence list
- **Due Date** (required): date picker, pre-filled if clicked from a calendar day
- **Assigned To** (required): dropdown of org members
  - Query: org_members JOIN profiles WHERE org_id = current_org AND is_active=true
  - Show: full_name + role badge
  - Default: based on control's default_owner_role (find first active member with that role)
- **Period** (auto-calculated): derive from due_date ("2026-03" for monthly, "2026-Q1" for quarterly, etc.)
- **Notes** (optional): textarea

### On Submit:
1. INSERT INTO checkpoints (org_id, control_id, period, status='pending', due_date, assigned_to, notes)
2. Write to audit_log (action: 'checkpoint.create')
3. Show success toast
4. Close modal
5. Trigger calendar refetch

### Duplicate Prevention:
Before insert, check if a checkpoint already exists for this control + period.
If yes: show warning "A checkpoint for this control already exists for this period. Create anyway?" with confirm/cancel.

## ASSIGNEE SELECT COMPONENT (assignee-select.tsx) — CREATE

Reusable dropdown for selecting/reassigning org members.

```tsx
interface Props {
  orgId: string
  value: string | null           // current user_id
  onChange: (userId: string) => void
  disabled?: boolean
}
```

- Fetches org_members JOIN profiles on mount
- Shows avatar circle + full_name + role badge for each option
- Search/filter within dropdown
- Selected state shows the current assignee

## SERVER ACTIONS (app/actions/checkpoints.ts) — CREATE

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

// Helper: get auth context
async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!member) throw new Error('No organization')
  return { supabase, userId: user.id, orgId: member.org_id as string, role: member.role as string }
}

// Helper: write audit log
async function audit(supabase: any, orgId: string, userId: string, action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) {
  await supabase.from('audit_log').insert({ org_id: orgId, user_id: userId, action, entity_type: entityType, entity_id: entityId, metadata: metadata ?? {} })
}

export async function createCheckpoint(data: {
  controlId: string
  dueDate: string
  period: string
  assignedTo: string
  notes?: string
}) {
  const { supabase, userId, orgId } = await getContext()
  const { data: checkpoint, error } = await supabase
    .from('checkpoints')
    .insert({
      org_id: orgId,
      control_id: data.controlId,
      period: data.period,
      due_date: data.dueDate,
      assigned_to: data.assignedTo,
      status: 'pending',
      notes: data.notes,
    })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  await audit(supabase, orgId, userId, 'checkpoint.create', 'checkpoint', checkpoint.id)
  return { success: true, id: checkpoint.id }
}

export async function completeCheckpoint(data: {
  checkpointId: string
  attestation: 'pass' | 'fail'
  notes?: string
}) {
  const { supabase, userId, orgId } = await getContext()
  // Verify evidence exists for pass attestation
  if (data.attestation === 'pass') {
    const { count } = await supabase
      .from('evidence')
      .select('id', { count: 'exact', head: true })
      .eq('checkpoint_id', data.checkpointId)
    if (!count || count === 0) {
      return { success: false, error: 'Cannot attest Pass without evidence. Upload at least one file.' }
    }
  }
  const status = data.attestation === 'pass' ? 'passed' : 'failed'
  const { error } = await supabase
    .from('checkpoints')
    .update({
      status,
      attestation: data.attestation,
      completed_at: new Date().toISOString(),
      completed_by: userId,
      notes: data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.checkpointId)
    .eq('org_id', orgId)
  if (error) return { success: false, error: error.message }
  await audit(supabase, orgId, userId, 'checkpoint.complete', 'checkpoint', data.checkpointId, { attestation: data.attestation })
  return { success: true }
}

export async function reassignCheckpoint(checkpointId: string, newAssigneeId: string) {
  const { supabase, userId, orgId } = await getContext()
  const { error } = await supabase
    .from('checkpoints')
    .update({ assigned_to: newAssigneeId, updated_at: new Date().toISOString() })
    .eq('id', checkpointId)
    .eq('org_id', orgId)
  if (error) return { success: false, error: error.message }
  await audit(supabase, orgId, userId, 'checkpoint.reassign', 'checkpoint', checkpointId, { new_assignee: newAssigneeId })
  return { success: true }
}

export async function updateCheckpointStatus(checkpointId: string, newStatus: string) {
  const { supabase, userId, orgId } = await getContext()
  const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
  if (newStatus === 'in_progress' || newStatus === 'pending') {
    updates.completed_at = null
    updates.completed_by = null
    updates.attestation = null
  }
  const { error } = await supabase
    .from('checkpoints')
    .update(updates)
    .eq('id', checkpointId)
    .eq('org_id', orgId)
  if (error) return { success: false, error: error.message }
  await audit(supabase, orgId, userId, 'checkpoint.status_change', 'checkpoint', checkpointId, { new_status: newStatus })
  return { success: true }
}

export async function updateCheckpointNotes(checkpointId: string, notes: string) {
  const { supabase, userId, orgId } = await getContext()
  const { error } = await supabase
    .from('checkpoints')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', checkpointId)
    .eq('org_id', orgId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function uploadEvidenceRecord(data: {
  checkpointId: string
  filePath: string
  fileName: string
  fileType: string
  fileSizeBytes: number
}) {
  const { supabase, userId, orgId } = await getContext()
  const { data: evidence, error } = await supabase
    .from('evidence')
    .insert({
      org_id: orgId,
      checkpoint_id: data.checkpointId,
      file_path: data.filePath,
      file_name: data.fileName,
      file_type: data.fileType,
      file_size_bytes: data.fileSizeBytes,
      uploaded_by: userId,
    })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  await audit(supabase, orgId, userId, 'evidence.upload', 'evidence', evidence.id, { checkpoint_id: data.checkpointId, file_name: data.fileName })
  return { success: true, id: evidence.id }
}

export async function deleteEvidenceRecord(evidenceId: string) {
  const { supabase, userId, orgId } = await getContext()
  // Get the file path first
  const { data: evidence } = await supabase
    .from('evidence')
    .select('file_path')
    .eq('id', evidenceId)
    .eq('org_id', orgId)
    .single()
  if (evidence) {
    // Delete from storage
    const bucket = `org-${orgId}-evidence`
    await supabase.storage.from(bucket).remove([evidence.file_path])
  }
  // Delete the record
  const { error } = await supabase
    .from('evidence')
    .delete()
    .eq('id', evidenceId)
    .eq('org_id', orgId)
  if (error) return { success: false, error: error.message }
  await audit(supabase, orgId, userId, 'evidence.delete', 'evidence', evidenceId)
  return { success: true }
}

export async function reopenCheckpoint(checkpointId: string) {
  const { supabase, userId, orgId, role } = await getContext()
  if (!['admin', 'compliance'].includes(role)) {
    return { success: false, error: 'Only admin or compliance can reopen checkpoints' }
  }
  const { error } = await supabase
    .from('checkpoints')
    .update({
      status: 'in_progress',
      completed_at: null,
      completed_by: null,
      attestation: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', checkpointId)
    .eq('org_id', orgId)
  if (error) return { success: false, error: error.message }
  await audit(supabase, orgId, userId, 'checkpoint.reopen', 'checkpoint', checkpointId)
  return { success: true }
}
```

## EMAIL NOTIFICATION EDGE FUNCTION (supabase/functions/checkpoint-email-notify/index.ts)

This runs daily via pg_cron. It checks for checkpoints due today or within reminder windows and sends email notifications to assigned users.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const today = new Date().toISOString().split('T')[0]

  // Calculate reminder dates
  const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  const inSevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  // 1. Checkpoints DUE TODAY
  const { data: dueToday } = await supabase
    .from('checkpoints')
    .select(`
      id, due_date, period, status,
      controls ( code, title, standard ),
      profiles:assigned_to ( full_name, email:id )
    `)
    .eq('due_date', today)
    .in('status', ['pending', 'in_progress'])

  // 2. Checkpoints due in 3 days (reminder)
  const { data: dueIn3 } = await supabase
    .from('checkpoints')
    .select(`
      id, due_date, period, status,
      controls ( code, title ),
      profiles:assigned_to ( full_name, email:id )
    `)
    .eq('due_date', inThreeDays)
    .in('status', ['pending', 'in_progress'])

  // 3. Checkpoints due in 7 days (early warning)
  const { data: dueIn7 } = await supabase
    .from('checkpoints')
    .select(`
      id, due_date, period, status,
      controls ( code, title ),
      profiles:assigned_to ( full_name, email:id )
    `)
    .eq('due_date', inSevenDays)
    .in('status', ['pending', 'in_progress'])

  // 4. OVERDUE checkpoints (due_date < today, still pending/in_progress)
  const { data: overdue } = await supabase
    .from('checkpoints')
    .select(`
      id, due_date, period, status,
      controls ( code, title ),
      profiles:assigned_to ( full_name, email:id )
    `)
    .lt('due_date', today)
    .in('status', ['pending', 'in_progress'])

  // Mark overdue checkpoints
  if (overdue && overdue.length > 0) {
    const overdueIds = overdue.map(cp => cp.id)
    await supabase
      .from('checkpoints')
      .update({ status: 'overdue', updated_at: new Date().toISOString() })
      .in('id', overdueIds)
  }

  // For each category, create notifications in the notifications table
  // (notifications are displayed in-app; email sending can be added via Resend or Supabase email)

  const notifications: Array<{
    org_id: string; user_id: string; type: string; title: string; message: string; entity_type: string; entity_id: string
  }> = []

  // Get user emails for actual email sending (lookup from auth.users via profiles)
  for (const cp of dueToday ?? []) {
    const ctrl = cp.controls as unknown as { code: string; title: string } | null
    const profile = cp.profiles as unknown as { full_name: string; email: string } | null
    if (!profile) continue
    // Get org_id from checkpoint
    const { data: cpFull } = await supabase.from('checkpoints').select('org_id').eq('id', cp.id).single()
    if (!cpFull) continue
    notifications.push({
      org_id: cpFull.org_id,
      user_id: profile.email, // This is actually the user_id since we aliased it
      type: 'checkpoint_due',
      title: `Due Today: ${ctrl?.title ?? 'Checkpoint'}`,
      message: `${ctrl?.code} — ${ctrl?.title} is due today (${today}). Please complete it and upload evidence.`,
      entity_type: 'checkpoint',
      entity_id: cp.id as string,
    })
  }

  for (const cp of dueIn3 ?? []) {
    const ctrl = cp.controls as unknown as { code: string; title: string } | null
    const profile = cp.profiles as unknown as { full_name: string; email: string } | null
    if (!profile) continue
    const { data: cpFull } = await supabase.from('checkpoints').select('org_id').eq('id', cp.id).single()
    if (!cpFull) continue
    notifications.push({
      org_id: cpFull.org_id,
      user_id: profile.email,
      type: 'checkpoint_due',
      title: `Due in 3 days: ${ctrl?.title ?? 'Checkpoint'}`,
      message: `${ctrl?.code} — ${ctrl?.title} is due on ${inThreeDays}. Start preparing evidence now.`,
      entity_type: 'checkpoint',
      entity_id: cp.id as string,
    })
  }

  for (const cp of overdue ?? []) {
    const ctrl = cp.controls as unknown as { code: string; title: string } | null
    const profile = cp.profiles as unknown as { full_name: string; email: string } | null
    if (!profile) continue
    const { data: cpFull } = await supabase.from('checkpoints').select('org_id').eq('id', cp.id).single()
    if (!cpFull) continue
    notifications.push({
      org_id: cpFull.org_id,
      user_id: profile.email,
      type: 'overdue',
      title: `OVERDUE: ${ctrl?.title ?? 'Checkpoint'}`,
      message: `${ctrl?.code} — ${ctrl?.title} was due on ${cp.due_date} and is now overdue. Immediate action required.`,
      entity_type: 'checkpoint',
      entity_id: cp.id as string,
    })
  }

  // Batch insert notifications
  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }

  return new Response(JSON.stringify({
    success: true,
    dueToday: dueToday?.length ?? 0,
    dueIn3Days: dueIn3?.length ?? 0,
    dueIn7Days: dueIn7?.length ?? 0,
    overdue: overdue?.length ?? 0,
    notificationsSent: notifications.length,
  }), { headers: { 'Content-Type': 'application/json' } })
})
```

**pg_cron schedule (document for setup):**
```sql
-- Run daily at 7:00 AM MST (2:00 PM UTC)
SELECT cron.schedule(
  'checkpoint-email-notify',
  '0 14 * * *',
  $$SELECT net.http_post(
    url := current_setting('supabase.url') || '/functions/v1/checkpoint-email-notify',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('supabase.service_role_key')),
    body := '{}'::jsonb
  )$$
);
```

## CALENDAR EVENT COMPONENT (calendar-event.tsx) — ENHANCE

- Keep the colored pill design
- Add onClick handler that calls `onCheckpointClick(checkpoint)` prop
- The parent (checkpoint-calendar.tsx) manages which modal is open
- Show tooltip on hover: checkpoint title + status + due date

## EVIDENCE UPLOADER (evidence-uploader.tsx) — ENHANCE

Wire to real Supabase Storage:
1. On file drop/select: call `uploadEvidence(orgId, checkpointId, file)` from storage.ts
2. After successful upload: call `uploadEvidenceRecord()` server action to create DB record
3. Show upload progress (if possible)
4. After success: add the new evidence to the local list immediately
5. Show file type icon based on extension (PDF, IMG, DOC, XLSX)
6. "View" button calls `getEvidenceUrl()` and opens in new tab
7. "Delete" button calls `deleteEvidenceRecord()` server action + `deleteEvidence()` from storage.ts

## CHECKPOINT DETAIL PAGE ([id]/page.tsx) — ENHANCE

If someone navigates directly to /checkpoints/[id] (e.g., from a notification link):
- Fetch the checkpoint by ID with all joins (control, evidence, assignee)
- Render the same checkpoint modal content BUT as a full page (not overlay)
- Same edit/save/attest functionality
- "Back to Calendar" link at top

## DESIGN SYSTEM REMINDERS

All components must use:
- Fonts: Source Serif 4 for headings, Source Sans 3 for body
- Colors: exact values from CLAUDE.md design system
- Cards: white bg, 1px #E8E8E8 border, 6-10px radius
- Buttons: #2A8BA8 primary, white/outlined secondary, #DC2626 destructive
- Badges: colored pills matching standard (Internal=#F5F5F5/#525252, AHCCCS=#F0FDF4/#15803D, Safety=#FFFBEB/#B45309, HIPAA=#F5F3FF/#6D28D9)
- Status badges: pending=yellow, in_progress=blue, passed=green, failed=red, overdue=red

DO NOT touch: dashboard, controls/page.tsx (the list), vault, qm, capa, settings, auth, layout (header/sidebar/right-aside), ai, suggestions, evidence page, reports, or any files not listed above.
