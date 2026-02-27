Read CLAUDE.md first. Your job is to make CAPA management fully persistent (currently edits are lost on refresh) and build the reports page with real PDF generation.

ONLY touch these files:
- src/app/(portal)/capa/[id]/page.tsx
- src/app/(portal)/capa/page.tsx
- src/app/(portal)/reports/page.tsx

Current state: capa/[id]/page.tsx (440 lines) has a full edit UI but the save function silently fails — Supabase writes are in a try/catch that does nothing. Owner list is hardcoded. Timeline events are fake. capa/page.tsx (345 lines) has real Supabase query but falls back to seed data and has no create form. The "+ New CAPA" button has no click handler. reports/page.tsx (177 lines) has ALL buttons disabled with no PDF generation.

What to build:

CAPA DETAIL (capa/[id]/page.tsx):
1. Fetch real CAPA from capas table by ID. Join with profiles for owner, findings for linked finding.
2. Wire the save function to actually UPDATE the capas table with all edited fields (title, description, root_cause, corrective_action, preventive_action, owner_id, due_date).
3. Fetch real org members for the owner dropdown (query org_members + profiles WHERE org_id = current org).
4. Wire status advancement: update capas.status in DB. When advancing to 'pending_verification' set the UI. When closing (verified), update verified_by, verified_at, verification_notes.
5. Write to audit_log on every save and status change (action: 'capa.update', 'capa.status_change', 'capa.verify').
6. Build real timeline: query audit_log WHERE entity_type='capa' AND entity_id=this_capa_id ORDER BY created_at. Display real status changes with real timestamps and user names.
7. Add overdue detection: if status is not 'closed' and due_date < today, show overdue warning.
8. Add role-based checks: only admin/compliance can edit. Only admin/compliance/supervisor can verify.

CAPA LIST (capa/page.tsx):
1. Remove seed data fallback — only use real Supabase data (show empty state if no CAPAs).
2. Build "New CAPA" creation modal/form: title, description, severity (dropdown), owner (from org_members), due_date. Insert into capas table. Write to audit_log.
3. Add column sorting (click headers to sort by due_date, severity, status, days_open).
4. Make the status filter actually filter the Supabase query (not just client-side).
5. Add pagination if more than 20 CAPAs.

REPORTS (reports/page.tsx):
1. Install @react-pdf/renderer if not already in package.json (run npm install @react-pdf/renderer).
2. Build 3 PDF report templates as React PDF components:
   a. Monthly Compliance Report: fetch checkpoints for period, group by standard, show pass/fail counts, list overdue items, audit readiness score.
   b. QM Executive Summary: fetch qm_meeting for period, include executive_summary text, KPI scores, findings list, open CAPAs.
   c. Audit Binder Export: fetch all evidence for period, group by standard, list files with metadata (this generates a cover page/index — actual files would be a ZIP in Phase 6).
3. Wire the "Generate" buttons to render the PDF and trigger browser download.
4. Show "Last generated" timestamp (store in localStorage or a simple table).
5. Add period selector for which month to generate reports for.

All queries scoped to org_id. Use src/lib/supabase/client.ts.

DO NOT touch: dashboard, controls, vault, qm, settings, auth, layout, calendar, checkpoints, ai, suggestions, evidence, hooks, or any files not listed above.
