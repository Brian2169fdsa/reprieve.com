Read CLAUDE.md first. Your job is to make the entire QM Workbench module work with real Supabase data instead of hardcoded seed data. Every component currently shows fake data.

ONLY touch these files:
- src/app/(portal)/qm/page.tsx
- src/app/(portal)/qm/meetings/[id]/page.tsx
- src/components/qm/executive-summary.tsx
- src/components/qm/findings-grid.tsx
- src/components/qm/meeting-checklist.tsx
- src/components/qm/capa-list.tsx

Current state: qm/page.tsx (120 lines) has no DB connection — hardcoded meeting data, hardcoded period options, tab badge counts hardcoded. meetings/[id]/page.tsx (189 lines) uses SEED_MEETING only. executive-summary.tsx (187 lines) has all KPIs hardcoded (87%, 75%, 88%, 66%). findings-grid.tsx (163 lines) uses SEED_FINDINGS. meeting-checklist.tsx (159 lines) is local state only. capa-list.tsx (178 lines) is presentational only.

What to build:

QM WORKBENCH (qm/page.tsx):
1. On mount, fetch user's org via use-org hook or org_members query.
2. Query qm_meetings for available periods. Populate the period dropdown with real options.
3. When period is selected, fetch the qm_meeting for that period. If none exists, show "Create Meeting" button that inserts into qm_meetings table.
4. Pass real meeting data to child components (checklist, executive summary, findings, CAPAs).
5. Query findings table filtered by period/meeting for the Findings tab badge count.
6. Query capas table for the CAPAs tab badge count.

QM MEETING DETAIL (meetings/[id]/page.tsx):
1. Fetch real meeting from qm_meetings by ID, join with profiles for attendees.
2. Display real agenda, executive_summary, audit_readiness_score, action_items from the meeting record.
3. Wire "Export Meeting Packet" button to show a toast (keep as Phase 5 placeholder but make it clear).
4. Wire meeting status updates to save to qm_meetings table.

EXECUTIVE SUMMARY (executive-summary.tsx):
1. Accept props for real data: overall_score, checkpoint_score, evidence_score, policy_score, capa_score.
2. Query audit_readiness_scores for the current and previous 2 periods to build the trend chart with real data.
3. Make the narrative text editable — save changes to qm_meetings.executive_summary.
4. Keep Export/Regenerate buttons as Phase 4/5 placeholders with toasts.

FINDINGS GRID (findings-grid.tsx):
1. If no findings prop passed, query findings table for current org + period.
2. Join with checkpoints for checkpoint reference info.
3. Wire "Create CAPA" button: insert into capas table with finding_id, title prefilled from finding, then navigate to /capa/[new-id] or show success message.
4. Add ability to create new findings manually (small form or modal).

MEETING CHECKLIST (meeting-checklist.tsx):
1. Save checked items to qm_meetings.agenda JSONB field (store as {item: string, checked: boolean}[]).
2. Load initial checked state from the meeting's agenda data.
3. Wire "Mark Meeting Complete" to update qm_meetings.status to 'completed'.

CAPA LIST (capa-list.tsx):
1. If no capas prop passed, query capas table for current org filtered by the meeting's findings.
2. Show real owner names from profiles join.
3. Keep links to /capa/[id] working.

All queries must be scoped to org_id. Use src/lib/supabase/client.ts.

DO NOT touch: dashboard, controls, vault, settings, auth, layout, calendar, checkpoints, ai, suggestions, evidence, reports, hooks, or any files not listed above.
