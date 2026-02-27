Read CLAUDE.md first. Your job is to enhance the Controls Library and Control Detail pages with analytics, checkpoint generation, bulk operations, and cross-linking to policies/checkpoints.

ONLY touch these files (create if needed):
- src/app/(portal)/controls/page.tsx (ENHANCE — currently 415 lines, has Supabase queries + seed data)
- src/app/(portal)/controls/[id]/page.tsx (ENHANCE — currently 566 lines, full CRUD form)
- src/components/controls/control-health-card.tsx (CREATE — pass/fail analytics per control)
- src/components/controls/control-checkpoint-history.tsx (CREATE — historical checkpoint list)
- src/components/controls/control-import-export.tsx (CREATE — bulk CSV import/export)
- src/components/controls/control-policy-links.tsx (CREATE — visual policy cross-references)

Current state: Controls page has a working table with filters (standard, frequency, active toggle), seed data for 12 controls, and click-to-navigate to detail pages. Control detail has full CRUD with code, title, standard, category, frequency, owner role, description, test procedure, required evidence tag input, related policies multi-select, and audit logging. Both query real Supabase data with seed fallback.

## CONTROLS LIST PAGE (controls/page.tsx) — ENHANCE

### Add Control Health Dashboard Section
Above the table, add a summary stats row (4 cards):
- "Total Controls" — count of all controls (active + inactive)
- "Active Controls" — count where is_active=true
- "Pass Rate This Period" — query checkpoints for current period joined with controls, calculate (passed / total) * 100. Show as percentage with color: >90% green, 70-90% yellow, <70% red.
- "Overdue This Period" — count of checkpoints WHERE status='overdue' for current period

### Add Search
Above the filters, add a text search input that filters controls by code, title, description, and category (client-side filter on the already-loaded array).

### Add Bulk Operations
Add a checkbox column to the table. When 1+ controls are selected, show a floating action bar at the bottom:
- "Activate Selected" — set is_active=true for all selected controls
- "Deactivate Selected" — set is_active=false for all selected
- "Generate Checkpoints" — create checkpoint records for all selected controls for the current period (insert into checkpoints table with status='pending', due_date based on frequency, period=current month)
- "Export Selected" — trigger CSV download of selected controls

### Add Import/Export Buttons
In the page header, next to "+ New Control":
- "Import" button — opens a modal with:
  - CSV file upload dropzone
  - Template download link ("Download CSV Template")
  - Preview table showing parsed rows before import
  - "Import X Controls" button that inserts all parsed rows into controls table
  - CSV columns: code, title, description, standard, category, test_procedure, required_evidence (semicolon-separated), frequency, default_owner_role
- "Export All" button — downloads all controls as CSV

### Add Column Sorting
Make table headers clickable to sort by that column (code, title, standard, frequency, owner role). Show sort indicator arrow (▲/▼).

### Add Pagination
If controls.length > 25, paginate with 25 per page. Show "Page X of Y" with Previous/Next buttons.

## CONTROL DETAIL PAGE (controls/[id]/page.tsx) — ENHANCE

### Add Checkpoint History Section
Below the form, add a new section "Checkpoint History" (only shown when viewing existing control, not on /controls/new):

**Checkpoint History Table:**
- Query: checkpoints WHERE control_id = this_control_id ORDER BY due_date DESC LIMIT 12
- Columns: Period, Due Date, Status (colored badge), Assigned To (name), Completed At, Attestation (Pass/Fail badge), Evidence Count
- Each row clickable — navigates to /checkpoints/[id] or opens checkpoint modal
- If no checkpoints: "No checkpoints have been generated for this control yet."

### Add Control Health Card
Above the checkpoint history, show a "Control Health" summary card:
- Pass rate (pie chart or percentage bar): passed / (passed + failed) for all time
- Last passed date
- Last failed date
- Total checkpoints generated
- Average completion time (days from created_at to completed_at)
- Trend: last 6 periods showing pass/fail per period (tiny bar chart using recharts)

Use recharts for the mini bar chart:
```tsx
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts"

<div style={{ width: 200, height: 80 }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={periodData}>
      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
      <Tooltip />
      <Bar dataKey="passed" fill="#16A34A" stackId="a" />
      <Bar dataKey="failed" fill="#DC2626" stackId="a" />
    </BarChart>
  </ResponsiveContainer>
</div>
```

### Add Generate Checkpoint Button
On the control detail page (view mode, not edit), add a "Generate Checkpoint" button:
- Opens a small form: Period (default current month like "2026-02"), Due Date (date picker), Assigned To (dropdown of org members)
- On submit: INSERT into checkpoints (org_id, control_id, period, status='pending', due_date, assigned_to), write to audit_log
- Show success toast and add the new checkpoint to the history list

### Add Related Policies Visualization
When viewing a control with related_policy_ids, show a "Related Policies" section:
- Query policies WHERE id IN (control.related_policy_ids)
- Display as cards: policy code (monospace), title, status badge (colored), last updated date
- Each card clickable — navigates to /vault/[policy_id]
- "Link Policy" button to add more (same PolicyMultiSelect component already in edit mode)

### Add Delete Control
In view mode, add a "Delete Control" button (red outline, bottom of page):
- Confirmation dialog: "Are you sure? This will not delete associated checkpoints or evidence."
- On confirm: DELETE from controls WHERE id = control_id, write audit_log, navigate to /controls
- Only show for admin/compliance roles

## SHARED COMPONENT PATTERNS

All new components should follow the existing design system:
- White bg cards with 1px #E8E8E8 border, 10px radius, shadow-sm
- Labels: 12px, #525252, font-weight 600
- Values: 13-14px, #171717
- Badges: colored pills matching STANDARD_COLORS already defined in controls/page.tsx
- Buttons: blue (#3BA7C9) primary, white outlined secondary, red outlined destructive

## MOCK DATA

For checkpoint history mocks (if query returns empty for a control), generate 6 periods of mock data:
- "2025-09" through "2026-02"
- Mix of passed (4), failed (1), pending (1)
- Realistic assigned_to names: Sarah Chen, David Kim, Maria Rodriguez

DO NOT touch: dashboard, calendar, vault, qm, capa, settings, auth, layout (header/sidebar/right-aside), ai, suggestions, evidence, reports, or any files not listed above.
