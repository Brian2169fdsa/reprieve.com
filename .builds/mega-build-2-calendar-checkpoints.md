Read CLAUDE.md first. Your job is to enhance the checkpoint calendar with a detail popover modal, mock data seeding for every day, and the ability for both staff and AI agents to add calendar events.

ONLY touch these files (create if needed):
- src/components/calendar/checkpoint-calendar.tsx (ENHANCE — currently 460 lines, real Supabase queries)
- src/components/calendar/calendar-event.tsx (ENHANCE — small event pill component)
- src/components/checkpoints/checkpoint-modal.tsx (REWRITE — checkpoint detail popover)
- src/components/checkpoints/evidence-uploader.tsx (ENHANCE — evidence upload in modal)
- src/app/(portal)/checkpoints/[id]/page.tsx (ENHANCE — 116 lines, wrapper)

Current state: checkpoint-calendar.tsx already queries real Supabase data (checkpoints + controls + profiles). It has month navigation, stats bar, calendar grid, list view, and a "Generate Checkpoints" modal that calls the generateCheckpoints server action. calendar-event.tsx is a small colored pill. checkpoint-modal.tsx exists but needs rebuilding. evidence-uploader.tsx exists.

## CALENDAR ENHANCEMENTS (checkpoint-calendar.tsx)

### Mock Data Seeding
When real Supabase query returns empty results, seed the calendar with realistic mock data for the CURRENT MONTH. Generate mock checkpoints that cover every day:
- Day 1: "Monthly Checkpoints Generated" (info status)
- Day 2: "OIG Exclusion Screening" — OIG standard — passed — Sarah Chen
- Day 3: "Staff Background Check Audit" — HR — passed — David Kim
- Day 4: "Medication Count Verification" — Safety — passed — Maria Rodriguez
- Day 5: "Credential Verification Review" — HR — pending — David Kim
- Day 6: "Client Rights Posting Check" — AHCCCS — passed — Wayne Giles
- Day 7: "Weekend Safety Inspection" — Safety — passed — Maria Rodriguez
- Day 8: "Incident Report Review" — Safety — passed — Maria Rodriguez
- Day 9: "Policy Update Review" — Internal — passed — Sarah Chen
- Day 10: "HIPAA Access Log Audit" — HIPAA — passed — Sarah Chen
- Day 11: "Group Session Documentation" — AHCCCS — passed — James Williams
- Day 12: "Fire Drill Log" — Safety — failed — Maria Rodriguez
- Day 13: "Treatment Plan Review" — AHCCCS — passed — James Williams
- Day 14: "Staff Training Verification" — HR — passed — David Kim
- Day 15: "Medication Storage Temp Check" — Safety — pending — Maria Rodriguez
- Day 16: "Telehealth Compliance Check" — HIPAA — passed — Sarah Chen
- Day 17: "Grievance Log Review" — Operations — passed — Wayne Giles
- Day 18: "Chart Audit (IOP)" — AHCCCS — passed — James Williams
- Day 19: "Emergency Equipment Check" — Safety — passed — Maria Rodriguez
- Day 20: "CAPA Follow-Up Review" — Quality — overdue — Sarah Chen
- Day 21: "Informed Consent Audit" — AHCCCS — pending — James Williams
- Day 22: "Housekeeping Inspection" — Safety — passed — Maria Rodriguez
- Day 23: "Peer Support Documentation" — AHCCCS — passed — James Williams
- Day 24: "Insurance Verification Audit" — Operations — pending — Wayne Giles
- Day 25: "Monthly Compliance Report" — Internal — in_progress — Sarah Chen
- Day 26: "Discharge Planning Review" — AHCCCS — pending — James Williams
- Day 27: "OIG Exclusion Re-check" — OIG — pending — Sarah Chen
- Day 28: "Staff Training Verification" — HR — pending — David Kim

Use the same Checkpoint interface. These mocks should look identical to real data in the UI.

### Add Event Capability
Add an "Add Checkpoint" button in the calendar header (next to "Generate Checkpoints"). When clicked, show a modal form:
- Control selection (dropdown of active controls from DB, or type-in)
- Assigned To (dropdown of org members)
- Due Date (date picker, default to clicked day if available)
- Notes (textarea)
- On submit: insert into checkpoints table, refetch calendar

Also add: when clicking an empty day cell, show a small "+" button that opens the same form with that day pre-filled.

### AI Event Badge
Add a small "AI" badge on calendar events that were created by the system (assigned_to is null or has a metadata flag). This lets users see which checkpoints were auto-generated vs manually created.

## CHECKPOINT POPOVER MODAL (checkpoint-modal.tsx)

Complete rewrite to match the design screenshot. When a user clicks ANY calendar event or list row, show this modal (NOT navigate to /checkpoints/[id] — show inline modal):

### Modal Layout:
**Header:**
- Checkpoint title (Source Serif 4, 18px, bold)
- Control code in monospace below the title (e.g., "OIG-SCR-001")
- Close X button top-right

**Details Section** (4 info items in 2x2 grid):
- Standard: colored badge pill (e.g., blue "OIG")
- Assigned To: person name with avatar circle
- Due Date: formatted date (e.g., "February 3, 2026")
- Status: status badge (Passed=green, Failed=red, Pending=yellow, Overdue=red, In Progress=blue)

**Test Procedure Section:**
- "Test Procedure" label
- Gray background box with the procedure text from controls.test_procedure
- e.g., "Run monthly OIG/SAM exclusion check for all staff, contractors, and vendors. Document results and flag any matches for immediate action per policy POL-OIG-001."

**Evidence Section:**
- "Evidence" label with count badge
- List of uploaded evidence files: file icon + name + size + "View" link
- Each file row: PDF icon, filename, file size, view button that opens signed URL
- "Upload additional evidence" dropzone at bottom: dashed border box with upload icon, "Drop files here or click to upload" text, accepts pdf/image/doc
- Wire to uploadEvidence() from src/lib/supabase/storage.ts
- After upload, insert evidence record in DB and refresh list

**Attestation Section:**
- "Attestation" label
- Two toggle buttons side by side: "Pass" (green when selected) and "Fail" (red when selected)
- Only one can be selected at a time
- When selecting: update checkpoints.attestation and checkpoints.status in DB

**Footer:**
- "Cancel" button (outlined, left)
- "Submit & Complete" button (blue-dark, right) — updates checkpoint status to 'passed' or 'failed' based on attestation, sets completed_at and completed_by

**Modal Styling:**
- Overlay: rgba(0,0,0,0.45) full screen
- Modal: white, 12px border-radius, max-width 520px, 28-32px padding
- Shadow: 0 20px 60px rgba(0,0,0,0.18)

### Data Flow:
- On open: fetch checkpoint by ID with joins (controls for procedure, evidence for files, profiles for assignee)
- Evidence list: real query from evidence table WHERE checkpoint_id = this checkpoint
- Upload: use uploadEvidence(), then insert evidence record, then refetch
- Attestation: update checkpoints table
- Submit: update checkpoint status + completed_at + completed_by, write to audit_log, close modal, refetch calendar

## CALENDAR EVENT COMPONENT (calendar-event.tsx)
- Keep current pill design but add: click handler that opens checkpoint-modal
- Add small "AI" badge (tiny blue dot or label) for system-generated events
- Ensure the tooltip/hover shows checkpoint title + standard

## CHECKPOINT PAGE ([id]/page.tsx)
- Keep as wrapper but ensure it can also use the new checkpoint-modal component
- If accessed directly via URL, render the modal content inline (full page view)

DO NOT touch: dashboard, controls, vault, qm, capa, settings, auth, layout, ai, suggestions, evidence, reports, or any files not listed above.
