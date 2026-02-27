Read CLAUDE.md first. Your job is to wire the checkpoint calendar to real Supabase data and connect the Generate Checkpoints button to the existing server action. Also make the evidence library page fully functional with real uploads and queries.

ONLY touch these files:
- src/components/calendar/checkpoint-calendar.tsx
- src/app/(portal)/calendar/page.tsx
- src/app/(portal)/evidence/page.tsx

Current state: checkpoint-calendar.tsx (463 lines) uses SEED_EVENTS hardcoded array with 12 fake checkpoints. The handleGenerate function on line ~150 does alert() instead of calling the server action. evidence/page.tsx (465 lines) uses a hardcoded SEED array of 5 fake evidence items. The handleUpload function shows an alert saying "Supabase Storage integration pending".

The server action at src/app/(portal)/controls/generate-checkpoints.ts is ALREADY FULLY BUILT (233 lines) — it generates checkpoints from active controls, handles frequency matching, assigns owners, prevents duplicates. It just needs to be called from the calendar UI.

What to build:

CALENDAR (checkpoint-calendar.tsx + calendar/page.tsx):
1. Replace SEED_EVENTS with a real Supabase query: fetch checkpoints for the displayed month, join with controls (for title, code, standard) and profiles (for assignee name).
2. Wire handleGenerate to import and call generateCheckpoints(orgId, period) from src/app/(portal)/controls/generate-checkpoints.ts. Show loading spinner while generating. On success, show count of generated checkpoints and refetch calendar data. On error, show error message.
3. Add month navigation that refetches data when month changes.
4. Get orgId from the use-org hook or by querying org_members.
5. Keep all existing UI (calendar grid, list view, stats bar, confirmation modal) — just replace the data source.
6. Update stats bar counts (total, completed, pending, overdue) from real query results.

EVIDENCE LIBRARY (evidence/page.tsx):
1. Replace SEED array with real query: fetch from evidence table, join with checkpoints (for control info) and profiles (for uploader name). Scope to org_id.
2. Wire handleUpload to use uploadEvidence() from src/lib/supabase/storage.ts. After upload, create evidence record in evidence table with file metadata. Refresh the list.
3. Wire filter dropdowns to actually filter the Supabase query (period, standard, file_type).
4. Wire View/Download buttons to use getEvidenceUrl() for signed URLs.
5. Wire delete button to use deleteEvidence() and remove the DB record.
6. Add loading states for upload progress and data fetching.

Use src/hooks/use-org.ts for org context and src/lib/supabase/client.ts for queries.

DO NOT touch: dashboard, vault, qm, capa, settings, auth, layout components, ai, suggestions, reports, controls pages, checkpoints pages, hooks, or any files not listed above.
