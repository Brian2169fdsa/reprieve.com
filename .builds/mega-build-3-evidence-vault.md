Read CLAUDE.md first. Your job is to rebuild the Evidence Binder page to match the design screenshot and make the Knowledge Vault fully functional with real document storage, a "New Policy" popover, and AI-initiated policy creation with approval alerts.

ONLY touch these files (create if needed):
- src/app/(portal)/evidence/page.tsx (REWRITE — currently 744 lines, has real queries but wrong layout)
- src/app/(portal)/vault/page.tsx (ENHANCE — currently 588 lines, has real queries + seed)
- src/app/(portal)/vault/[id]/page.tsx (ENHANCE — currently 481 lines, real Supabase)
- src/components/vault/policy-editor.tsx (ENHANCE — Tiptap wrapper)
- src/components/vault/approval-workflow.tsx (ENHANCE — approval UI)
- src/lib/supabase/storage.ts (ADD — new function for policy document upload, keep existing evidence functions)

## EVIDENCE BINDER (evidence/page.tsx) — COMPLETE REDESIGN

Rebuild to match the design screenshot. The current version has working Supabase queries but the wrong visual layout.

### New Layout:

**Page Header:**
- "Evidence Binder" title (Source Serif 4)
- "Audit-ready evidence organized by standard and period" subtitle
- "Export Binder" button (blue-dark, right side) — downloads all evidence for the selected period

**Period Tabs (horizontal pill tabs across top):**
- Pill-style tab buttons: "Feb 2026" (active/selected), "Jan 2026", "Q4 2025", "Q3 2025"
- Active tab: blue-dark bg, white text
- Inactive tabs: white bg, gray text, gray border
- Clicking a tab filters all evidence below to that period
- Pull available periods from the data dynamically

**Standards Grid (grouped by compliance standard):**
Each standard gets its own card:

Card Layout:
- Header row: Standard name badge (colored, e.g., blue "OIG"), completion indicator dot (green = all evidence present, red = missing evidence), count text "X of Y items"
- Divider line
- List of evidence items:
  - Each row: File icon (PDF/IMG/DOC colored badge), filename, file size, "View" button (eye icon)
  - Clicking the filename or View button: opens the file in a new tab via signed URL (getEvidenceUrl)
  - Clicking anywhere on the row: also opens the file
- Missing evidence rows:
  - Dashed red border, warning triangle icon
  - Text: "Missing: {control title} evidence" with the control code
  - These come from checkpoints that are completed but have no evidence uploads
  - Style: red-light bg, dashed border, red text

**Card Styling:**
- White bg, 1px #E8E8E8 border, 10px radius
- Standard-specific accent color on left border (3px)
- Standards to show: OIG (blue), HIPAA (purple), AHCCCS (green), Safety (amber), Operations (gray), HR (pink), TJC (dark amber), CARF (indigo)

**Export Binder Button:**
When clicked:
1. Show loading state ("Preparing binder…")
2. Collect all evidence file URLs for the selected period
3. For each file, fetch the signed URL via getEvidenceUrl()
4. Create a simple HTML index page listing all files with links
5. Open the index in a new tab (or trigger download of a manifest)
6. For now, if actual ZIP bundling isn't feasible, generate a PDF cover sheet listing all evidence items with their metadata (file name, standard, checkpoint, upload date, uploader) using @react-pdf/renderer — this serves as an audit binder index

**Mock Data:**
If real query returns empty, seed with evidence items that match the mock checkpoints from mega-build-2:
- OIG-SCR-001_Feb2026_Results.pdf (OIG, passed)
- HIPAA-ACCESS-001_Feb2026_Log.pdf (HIPAA, passed)
- AHCCCS-CA-001_ChartAudit_Feb2026.pdf (AHCCCS, passed)
- SAFE-FD-001_FireDrill_Feb2026.pdf (Safety, MISSING — red dashed)
- SAFE-MED-001_TempLog_Feb2026.jpg (Safety, present)
- HR-CRED-001_CredVerification_Feb2026.pdf (HR, present)
- OPS-GRV-001_GrievanceLog_Feb2026.pdf (Operations, present)
- SAFE-INC-001_IncidentReport_Feb2026.pdf (Safety, MISSING — red dashed)

## KNOWLEDGE VAULT (vault/page.tsx) — ENHANCE

### New Policy Button Popover
The existing "New Policy" button currently opens a simple modal. Rebuild it as a richer popover/modal:

**New Policy Modal Layout:**
- "Create New Policy" title
- Form fields:
  - Policy Title (text input, required)
  - Policy Code (text input, auto-generated from title like "POL-{CATEGORY}-{###}", editable)
  - Category (dropdown: HIPAA, Safety, HR, Operations, Clinical, Administrative, Quality)
  - Program (multi-select pills: IOP, Residential)
  - Department (text input, optional)
  - Owner (dropdown of org members from profiles)
  - Review Cadence (dropdown: 6 months, 12 months, 18 months, 24 months)
  - Document Upload (file input for PDF/DOC — upload to Supabase Storage via new function)
  - Description / Summary (textarea)
- "Cancel" and "Create Policy" buttons
- On submit:
  1. Upload document if provided (to org-{orgId}-policies bucket)
  2. Insert into policies table with status='draft'
  3. Create initial policy_version with version_number=1
  4. Write to audit_log
  5. Navigate to /vault/{new-id} or show success toast

### AI-Created Policies
Add a visual indicator for policies created by AI agents:
- "AI" badge next to the policy title in the list
- These are policies where the created metadata indicates AI origin (check if there's an ai_suggestion linked)
- When AI creates a policy, it should:
  1. Insert into policies with status='in_review' (not draft — goes straight to review)
  2. Create a notification for all admin/compliance users: "AI Policy Guardian created a new policy: {title}. Review and approve."
  3. Create an ai_suggestions record linking to the policy
  4. The policy appears in Pending Approvals with "AI Generated" badge

### Real Document Storage
Add to src/lib/supabase/storage.ts:
```typescript
export async function uploadPolicyDocument(orgId: string, policyId: string, file: File)
export async function getPolicyDocumentUrl(orgId: string, path: string)
export async function deletePolicyDocument(orgId: string, path: string)
```
Bucket pattern: `org-${orgId}-policies`
Path pattern: `${policyId}/${timestamp}-${safeName}`

## VAULT DETAIL (vault/[id]/page.tsx) — ENHANCE

### Document Viewer
If the policy has an uploaded document (stored in Supabase Storage):
- Show "View Document" button that opens the PDF/file in a new tab
- Show document metadata: file name, size, upload date
- Allow re-uploading a new version of the document

### Approval Workflow Enhancement
When a policy is in 'in_review' status:
- Show approve/reject buttons prominently
- On approve: update status to 'approved', set approved_by, approved_at on the policy_version
- On reject: update status back to 'draft', create notification for policy owner
- If the policy was AI-created: show "AI Generated" banner at top explaining the AI created this
- Write to audit_log on all actions

## APPROVAL WORKFLOW COMPONENT (approval-workflow.tsx) — ENHANCE
- Add support for AI-generated policy indicator
- Show the AI suggestion that created the policy (if applicable)
- Add "AI Generated" badge styling

DO NOT touch: dashboard, controls, qm, capa, settings, auth, layout (header/sidebar), calendar, checkpoints, ai, suggestions, reports, or any files not listed above.
