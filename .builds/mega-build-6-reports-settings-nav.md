Read CLAUDE.md first. Your job is to build the Reports page with real analytics charts and downloadable reports, make Settings fully persistent, wire Members to real Supabase, and update the sidebar navigation to match the grouped section design.

INSTALL FIRST:
```
npm install recharts @react-pdf/renderer
npx shadcn@latest add chart tabs select dialog sheet --yes
```

ONLY touch these files (create if needed):
- src/app/(portal)/reports/page.tsx (REWRITE — currently 177 lines, all buttons disabled)
- src/app/(portal)/settings/page.tsx (ENHANCE — currently 125 lines, save doesn't persist)
- src/app/(portal)/settings/members/page.tsx (REWRITE — currently 268 lines, all seed data)
- src/app/(portal)/settings/roles/page.tsx (ENHANCE — currently 150 lines, read-only reference)
- src/components/layout/sidebar.tsx (ENHANCE — add grouped navigation sections)
- src/components/reports/compliance-report-pdf.tsx (CREATE — PDF template)
- src/components/reports/qm-summary-pdf.tsx (CREATE — PDF template)
- src/components/reports/audit-binder-pdf.tsx (CREATE — PDF template)

## REPORTS PAGE (reports/page.tsx) — COMPLETE REWRITE

### Analytics Dashboard + Report Generation

**Page Header:**
- "Reports & Analytics" title (Source Serif 4)
- "Compliance analytics, trends, and downloadable reports" subtitle
- Period selector dropdown (current month, last 3 months, last 6 months, YTD, custom range)

**Analytics Section (top half of page):**

Row 1 — KPI Cards (4 cards):
- "Audit Readiness" — current overall_score% with trend arrow vs previous period
- "Checkpoint Completion" — X/Y completed with percentage
- "Evidence Coverage" — percentage of checkpoints with evidence
- "CAPA Closure Rate" — percentage of CAPAs closed on time
- Each card: large number, trend indicator (up green / down red), sparkline mini-chart showing last 6 periods
- Query: audit_readiness_scores for current and historical periods

Row 2 — Charts (2 charts side by side):
LEFT: **Compliance Trend** (line chart):
- X-axis: last 6 periods (months)
- Y-axis: 0-100%
- Lines: overall_score, checkpoint_score, evidence_score, policy_score, capa_score
- Legend at bottom with colored dots
- Use recharts LineChart with Tailwind-styled tooltips
- Query: audit_readiness_scores ORDER BY period DESC LIMIT 6

RIGHT: **Checkpoints by Standard** (bar chart):
- X-axis: standards (OIG, HIPAA, AHCCCS, Safety, HR, Operations)
- Y-axis: count
- Stacked bars: passed (green), failed (red), pending (yellow), overdue (orange)
- Query: checkpoints for selected period, group by controls.standard

Row 3 — Additional Charts:
LEFT: **Findings by Severity** (donut/pie chart):
- Segments: Critical (red), High (orange), Medium (yellow), Low (gray)
- Center: total count
- Query: findings for selected period, group by severity

RIGHT: **CAPA Status Distribution** (horizontal bar chart):
- Bars: Open, In Progress, Pending Verification, Closed, Overdue
- Color-coded by status
- Query: capas group by status

**Mock Chart Data (if queries return empty):**
Audit Readiness Trend (6 months):
- Sep 2025: 72%, Oct: 75%, Nov: 78%, Dec: 81%, Jan 2026: 83%, Feb 2026: 84.5%
Checkpoints by Standard: OIG: 4/4 passed, HIPAA: 3/4, AHCCCS: 5/6, Safety: 2/4, HR: 3/3, Ops: 2/2
Findings: 1 critical, 3 high, 5 medium, 2 low
CAPAs: 2 open, 3 in progress, 1 pending verification, 8 closed, 1 overdue

**Downloadable Reports Section (bottom half):**

Three report cards in a row:

Card 1 — **Monthly Compliance Report:**
- Description: "Comprehensive monthly compliance status including checkpoint completion, evidence gaps, and overdue items"
- Format badge: "PDF"
- Sections list: "Checkpoint Summary, Evidence Status, Overdue Items, Audit Readiness Score"
- "Generate Report" button (blue-dark)
- On click: render compliance-report-pdf.tsx with real data, trigger browser download
- Show "Last generated: {date}" if previously generated (store in localStorage)

Card 2 — **QM Executive Summary:**
- Description: "Executive summary for quality management meetings with KPIs, findings, and CAPA status"
- Format badge: "PDF"
- Sections list: "KPI Dashboard, Findings Analysis, CAPA Tracker, Trend Summary"
- "Generate Report" button
- On click: render qm-summary-pdf.tsx, trigger download

Card 3 — **Audit Binder Index:**
- Description: "Complete evidence index organized by standard for audit preparation"
- Format badge: "PDF"
- Sections list: "Evidence Inventory, Missing Items, Standard Compliance, File Manifest"
- "Generate Report" button
- On click: render audit-binder-pdf.tsx, trigger download

**Custom Report Builder (expandable section at bottom):**
- "Build Custom Report" toggle/accordion
- When expanded:
  - Checkboxes to select sections: Checkpoints, Evidence, Policies, CAPAs, Findings, Audit Scores
  - Date range selector
  - Standard filter (multi-select)
  - "Generate Custom Report" button
  - Generates a PDF combining selected sections

### PDF Templates (using @react-pdf/renderer):

**compliance-report-pdf.tsx:**
- Cover page: REPrieve.ai logo area, report title, org name, period, generation date
- Section 1: Checkpoint Summary table (control code, title, standard, status, due date, assigned to)
- Section 2: Evidence Status (evidence count per standard, missing items list)
- Section 3: Overdue Items (red-highlighted list of overdue checkpoints)
- Section 4: Audit Readiness Score with component breakdown
- Footer: page numbers, "Generated by REPrieve.ai"

**qm-summary-pdf.tsx:**
- Cover page
- KPI Dashboard (4 scores with labels)
- Findings table (severity, title, standard, checkpoint reference)
- CAPA Status table (title, owner, status, due date, days open)
- Trend summary (text narrative)

**audit-binder-pdf.tsx:**
- Cover page
- Table of contents by standard
- For each standard: list of evidence files with metadata (filename, checkpoint, upload date, uploader)
- Missing evidence section (red text)
- Compliance completeness percentage per standard

## SETTINGS (settings/page.tsx) — WIRE SAVE

1. On mount: fetch real org via use-org hook (already done)
2. Wire save button to: UPDATE organizations SET name=?, settings=? WHERE id=org_id
3. Add slug auto-generation from name
4. Write to audit_log (action: 'org.update')
5. Show success toast on save
6. Add role check: only admin can edit (use useRole hook)

## MEMBERS (settings/members/page.tsx) — COMPLETE REWRITE

1. Fetch real members: query org_members JOIN profiles WHERE org_id = current org
2. Display real data: name, email, role badge (colored by role), active status toggle, joined date
3. Wire role change: UPDATE org_members SET role=? — with confirmation dialog
4. Wire activate/deactivate: UPDATE org_members SET is_active=? — with confirmation
5. Build invite form:
   - Email input + role dropdown + "Send Invite" button
   - On submit: call Supabase auth.signUp with email and a temporary password, then insert org_members record
   - Show the generated credentials or invite link in a success dialog
   - Write to audit_log (action: 'member.invite')
6. Role check: only admin can invite/manage
7. Write to audit_log on all role changes and status changes

**Mock Members (if query returns empty):**
- Sarah Chen — admin — compliance@cholla.org — active — Jan 15, 2026
- David Kim — hr — hr@cholla.org — active — Jan 15, 2026
- Maria Rodriguez — clinical — clinical@cholla.org — active — Jan 20, 2026
- James Williams — clinical — james@cholla.org — active — Feb 1, 2026
- Wayne Giles — ops — ops@cholla.org — active — Feb 1, 2026

## SIDEBAR NAVIGATION (sidebar.tsx) — ENHANCE

Update the sidebar to use grouped sections matching this structure:

**Section 1 — Main:**
- Dashboard (house icon)

**Section 2 — Compliance:**
- Calendar (calendar icon)
- Controls (shield icon) — admin/compliance only
- Evidence (paperclip icon)

**Section 3 — Policy:**
- Knowledge Vault (book icon)
- Approvals (check-circle icon) — with badge count — admin/compliance/supervisor only

**Section 4 — Quality:**
- QM Workbench (bar-chart icon) — admin/compliance/executive only
- CAPAs (refresh icon)

**Section 5 — Intelligence:**
- AI Agents (bot icon) — admin/compliance only — NO "Manage AI" text
- Suggestions (lightbulb icon) — with badge count
- Reports (file-text icon)

**Section 6 — System:**
- Settings (gear icon) — admin only

Each section:
- Small uppercase section label in gray (#A3A3A3, 10px, font-weight 700, letter-spacing 0.1em)
- Separator line above each section (except first)
- 8px gap between sections

Keep all existing sidebar functionality (active state highlighting, role-based visibility, badge counts).

DO NOT touch: dashboard components (stats-grid, upcoming-tasks, ai-activity-feed), controls, vault, qm components, capa detail, auth, calendar, checkpoints, ai page, suggestions page, evidence page, header, right-aside, or any files not listed above.
