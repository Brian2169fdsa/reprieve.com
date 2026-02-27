Read CLAUDE.md first. Your job is to make the QM Workbench, CAPA management, and Pending Approvals pages fully functional with real Supabase data, cross-linked to the calendar, and with rich interactive popovers.

INSTALL FIRST:
```
npm install recharts
npx shadcn@latest add @diceui/kanban --yes
```

DICEUI KANBAN — This installs via the shadcn CLI (copy-paste approach, same as shadcn/ui components). It copies Kanban component source into src/components/ui/kanban.tsx and installs @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/modifiers, @dnd-kit/utilities as dependencies.

Usage pattern for Kanban board:
```tsx
import {
  Kanban, KanbanBoard, KanbanColumn, KanbanColumnHandle,
  KanbanItem, KanbanItemHandle, KanbanOverlay,
} from "@/components/ui/kanban"

// value = Record<string, CAPAItem[]> mapping column IDs to CAPA arrays
const [columns, setColumns] = useState<Record<string, CAPAItem[]>>({
  open: [...],
  in_progress: [...],
  pending_verification: [...],
  closed: [...],
})

<Kanban value={columns} onValueChange={setColumns} getItemValue={(item) => item.id}>
  <KanbanBoard>
    {Object.entries(columns).map(([columnId, items]) => (
      <KanbanColumn key={columnId} value={columnId}>
        <KanbanColumnHandle>{columnLabel}</KanbanColumnHandle>
        {items.map((item) => (
          <KanbanItem key={item.id} value={item.id}>
            <KanbanItemHandle />
            {/* CAPA card content */}
          </KanbanItem>
        ))}
      </KanbanColumn>
    ))}
  </KanbanBoard>
  <KanbanOverlay />
</Kanban>
```

If the @diceui/kanban shadcn add command fails, FALL BACK to installing @dnd-kit directly:
```
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
Then build a simple Kanban board component manually using DndContext, SortableContext, useSortable from @dnd-kit.

ONLY touch these files:
- src/app/(portal)/qm/page.tsx (REWRITE — currently 120 lines, hardcoded metadata)
- src/app/(portal)/qm/meetings/[id]/page.tsx (REWRITE — currently 189 lines, seed only)
- src/components/qm/executive-summary.tsx (REWRITE — currently 187 lines, hardcoded KPIs)
- src/components/qm/findings-grid.tsx (REWRITE — currently 163 lines, seed findings)
- src/components/qm/meeting-checklist.tsx (REWRITE — currently 159 lines, local state only)
- src/components/qm/capa-list.tsx (REWRITE — currently 178 lines, presentational only)
- src/app/(portal)/capa/page.tsx (ENHANCE — currently 345 lines, hybrid seed+real)
- src/app/(portal)/capa/[id]/page.tsx (ENHANCE — currently 440 lines, seed with Supabase mutations)
- src/app/(portal)/approvals/page.tsx (ENHANCE — currently 662 lines, hybrid seed+real)

## QM WORKBENCH (qm/page.tsx) — COMPLETE REWRITE

### Calendar Integration
The QM workbench must pull data from checkpoints that were NOT completed (failed, overdue, skipped) and surface them as findings for QM review. This creates the calendar→QM pipeline.

### New Layout:

**Page Header:**
- "QM Workbench" title
- "Quality management review and meeting preparation" subtitle
- Period selector dropdown (query qm_meetings for available periods + generate "current month" option)
- "Create Meeting" button (if no meeting exists for selected period)

**Meeting Info Bar** (when meeting exists):
- Meeting date, location "Conference Room A", status badge
- Attendees as avatar circles with names
- "Export Meeting Packet" button (generate PDF summary — use @react-pdf/renderer)

**Tabs (4 tabs with badge counts):**

Tab 1 — **Checklist:**
- Meeting preparation checklist with real items stored in qm_meetings.agenda JSONB
- Each item: checkbox + task text + status
- Default items if none exist:
  1. "Review previous month's action items"
  2. "Present compliance checkpoint summary"
  3. "Review audit readiness score and trends"
  4. "Discuss open findings and root causes"
  5. "Review CAPA status and deadlines"
  6. "Identify new risks or compliance gaps"
  7. "Set action items for next period"
  8. "Schedule next QM meeting date"
- Checking/unchecking saves to qm_meetings.agenda JSONB in DB
- "Mark Meeting Complete" button: updates qm_meetings.status to 'completed'
- Progress bar showing X of Y items checked

Tab 2 — **Executive Summary:**
- AI-generated (or editable) executive summary text
- KPI cards (2x2 grid):
  - Checkpoint Completion Rate: % from audit_readiness_scores.checkpoint_score
  - Evidence Coverage: % from audit_readiness_scores.evidence_score
  - Policy Compliance: % from audit_readiness_scores.policy_score
  - CAPA Closure Rate: % from audit_readiness_scores.capa_score
- Each KPI: large percentage, trend arrow comparing to previous period, colored progress ring
- Trend chart: line chart showing overall_score for last 6 periods (use recharts)
- Editable narrative text area that saves to qm_meetings.executive_summary
- Mock KPIs if no data: 87%, 75%, 88%, 66%

Tab 3 — **Findings:**
- **Calendar-linked findings**: Query checkpoints WHERE status IN ('failed', 'overdue') for current period
- Auto-generate findings from failed/overdue checkpoints:
  - Finding title: "Failed: {control.title}" or "Overdue: {control.title}"
  - Finding severity: failed → "high", overdue → "medium"
  - Finding standard: from control.standard
  - Link back to checkpoint
- Also show manually-created findings from findings table
- Each finding row: severity badge (colored), title, standard badge, linked checkpoint, "Create CAPA" button
- "Create CAPA" button: inserts into capas table with finding_id, prefilled title, then shows success or navigates to /capa/[new-id]
- "Add Finding" button: manual finding creation form (title, description, severity, standard)
- Badge count on tab: total findings for period

Tab 4 — **CAPAs:**
- List of CAPAs linked to findings from this period
- Query: capas WHERE finding_id IN (findings for this period's meeting) OR capas linked to this period
- Each row: status badge, title, owner name, due date, days open count
- Color-coded: open=yellow, in_progress=blue, pending_verification=purple, closed=green, overdue=red
- Click any row: navigate to /capa/[id]
- Badge count on tab: open CAPAs count

**Mock Data for QM:**
If queries return empty, seed a complete QM meeting for current month:
- Meeting date: 25th of current month
- Status: "ready"
- Audit readiness: 84.5%
- 3 findings: 1 high (Fire Drill failure), 1 medium (CAPA Follow-Up overdue), 1 low (Minor documentation gap)
- 2 open CAPAs linked to the findings

## CAPA LIST (capa/page.tsx) — ENHANCE

### Remove ALL seed data fallback. Only use real Supabase queries.

### Add Kanban Board View Toggle
Add a view toggle at the top: "Table" | "Board" (like the calendar's Calendar|List toggle).
- Table view: the enhanced table described below
- Board view: a Kanban board using @diceui/kanban (or @dnd-kit fallback) with 4 columns:
  - **Open** (yellow header accent) — CAPAs with status='open'
  - **In Progress** (blue header accent) — status='in_progress'
  - **Pending Verification** (purple header accent) — status='pending_verification'
  - **Closed** (green header accent) — status='closed'
- Each CAPA card in the board shows: title, severity badge, owner name, due date, days open
- Dragging a card between columns updates the CAPA status in Supabase and writes to audit_log
- Overdue CAPAs show a red border on their card
- Column headers show count of items in each column
- "New CAPA" button at top of "Open" column

### Build "New CAPA" Modal:
When "+ New CAPA" button is clicked, show modal with:
- Title (text input, required)
- Description (textarea)
- Root Cause (textarea)
- Severity (dropdown: low, medium, high, critical)
- Owner (dropdown from org_members + profiles)
- Due Date (date input)
- Linked Finding (optional dropdown of findings)
On submit: INSERT into capas, write to audit_log, refresh list, show success toast

### Enhanced Table:
- Column sorting: click any header to sort
- Status filter: actually filters the Supabase query (not client-side)
- Severity badges with colors: low=gray, medium=yellow, high=orange, critical=red
- Status badges with colors: open=yellow, in_progress=blue, pending_verification=purple, closed=green, overdue=red
- Days open calculation: difference between created_at and now (or closed date)
- Overdue detection: if due_date < today AND status not 'closed', show overdue styling

## CAPA DETAIL (capa/[id]/page.tsx) — ENHANCE

### Fix the save function
Currently the save function is in a try/catch that does nothing. Wire it to:
1. UPDATE capas SET title, description, root_cause, corrective_action, preventive_action, owner_id, due_date WHERE id = capa_id
2. Write to audit_log (action: 'capa.update')
3. Show success toast

### Real Owner Dropdown
Replace hardcoded owner list with real org_members query (join profiles for names)

### Real Timeline
Replace fake timeline with real audit_log entries:
- Query audit_log WHERE entity_type='capa' AND entity_id=this_capa_id ORDER BY created_at
- Show real timestamps, user names (join profiles), and action descriptions

### Status Workflow
Wire all status buttons to real DB updates:
- "Start Work" → status='in_progress', write audit_log
- "Submit for Verification" → status='pending_verification', write audit_log
- "Verify & Close" → status='closed', verified_by=auth.uid(), verified_at=now(), verification_notes from input, write audit_log

### Overdue Detection
If status != 'closed' AND due_date < today: show red overdue banner at top

## PENDING APPROVALS (approvals/page.tsx) — ENHANCE

### Make Everything Clickable with Popovers

**Policy Approvals Section:**
Each pending policy row should be clickable. On click, show a popover/expanded panel:
- Policy title, code, category, program
- Policy owner name and submission date
- Current version preview (render content_html or first 200 chars)
- "View Full Policy" link to /vault/[id]
- Version diff if version_number > 1 (show what changed)
- "Approve" and "Reject" buttons with confirmation
- If AI-generated: "AI Generated" badge + link to the AI suggestion that created it

**AI Suggestion Approvals Section:**
Each pending suggestion row should be clickable. On click, show popover:
- Full suggestion details: title, description, suggested_changes formatted
- Confidence score with colored bar
- Agent name and run timestamp
- Affected entity info with link
- "Accept" button: applies the change + marks accepted
- "Accept with Modifications" button: shows editable version of suggested_changes
- "Reject" button: shows rejection reason textarea
- "Dismiss" button: marks as rejected without requiring reason

**Mock Data:**
If queries return empty, seed:
- 2 pending policy approvals (one manual, one AI-generated)
- 4 pending AI suggestions (from different agents)
All with realistic titles and descriptions matching Arizona BH compliance context.

All queries scoped to org_id. Use src/lib/supabase/client.ts and hooks.

DO NOT touch: dashboard, controls, vault, settings, auth, layout (header/sidebar/right-aside), calendar, checkpoints, evidence, reports, ai, suggestions, or any files not listed above.
