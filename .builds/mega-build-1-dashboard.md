Read CLAUDE.md first. Your job is to completely rebuild the dashboard page and all its child components to match the design screenshots. The dashboard must show REAL Supabase data with mock seed fallbacks and match the exact visual layout described below.

INSTALL FIRST (run these before any code changes):
```
npm install recharts tremor-raw @react-pdf/renderer sonner
npx shadcn@latest add chart progress avatar badge card --yes
```

ONLY touch these files (create new ones as needed within this list):
- src/app/(portal)/dashboard/page.tsx (REWRITE — currently 31 lines, hardcoded)
- src/components/dashboard/stats-grid.tsx (REWRITE — currently fake values)
- src/components/dashboard/upcoming-tasks.tsx (REWRITE — currently 4 hardcoded tasks)
- src/components/dashboard/ai-activity-feed.tsx (REWRITE — currently 4 hardcoded entries)
- src/components/layout/right-aside.tsx (REWRITE — all fake stats)
- src/components/layout/header.tsx (ONLY notification count badge — currently hardcoded to 3)
- src/components/layout/sidebar.tsx (ONLY badge counts — currently hardcoded approvals:3, suggestions:5)

Current state: Everything on the dashboard is fake. stats-grid has "87%", "18/24", "44/47", "2". upcoming-tasks has 4 hardcoded tasks. ai-activity-feed has 4 hardcoded entries. right-aside has all fake stats. Header notification bell always shows 3. Sidebar badges always show 3 and 5.

EXACT LAYOUT TO BUILD (from design screenshots):

## Dashboard Page (dashboard/page.tsx)
Full rewrite. Layout is a single scrollable column:

1. **Welcome Banner** — full-width card at top:
   - "Welcome back, {user.full_name}" as h2 (Source Serif 4, bold)
   - Subtitle: "Here's your compliance overview for {current month} {year}"
   - Right side: "3 checkpoints due this week · 1 overdue" (query real data)
   - Background: subtle gradient or #F0F9FC blue-bg

2. **Stats Grid** — 4 cards in a row (equal width):
   - Card 1: "Active Checkpoints" — count of pending+in_progress checkpoints this period. Large number. Small icon top-right (shield icon).
   - Card 2: "Completed This Month" — fraction "X/Y" (completed/total) with percentage underneath. Green progress bar or accent.
   - Card 3: "Audit Readiness" — percentage from audit_readiness_scores.overall_score. Show trend arrow (up/down) comparing to last period. Green if >80%, yellow 60-80%, red <60%.
   - Card 4: "Open CAPAs" — count from capas WHERE status NOT IN ('closed'). Show breakdown: "X in progress · Y overdue" underneath.
   - Each card: white bg, 1px #E8E8E8 border, 8px radius, subtle shadow, 14-16px padding

3. **Alert Banners** — conditional, full-width:
   - Overdue alert (red-light bg, red-dark border-left 3px): "X overdue checkpoints need attention" with "View Overdue →" link
   - QM Ready alert (blue-light bg, blue border-left 3px): "Your QM packet for {month} is ready for review" with "Open QM Workbench →" link
   - Only show when relevant (query data to check)

4. **Quick Navigation** — 3 buttons in a row:
   - "View Calendar" → /calendar (calendar icon)
   - "Knowledge Vault" → /vault (book icon)
   - "AI Agents" → /ai (bot icon)
   - Style: outlined buttons, blue-dark text, hover blue-light bg

5. **Two-column section below** (60/40 split):

   LEFT (60%): **"My Checkpoint Tasks"**
   - Section header with "My Tasks" title + "View All →" link to /calendar
   - List of checkpoints assigned to current user (query: checkpoints WHERE assigned_to = auth.uid() AND status IN ('pending','in_progress','overdue') ORDER BY due_date)
   - Each row: checkbox (styled, clickable but just visual), task title (from controls.title), standard badge (colored pill), due date, status indicator
   - Completed items: strikethrough text, green checkmark, muted colors
   - Overdue items: red due date, "Overdue" badge in red
   - If empty: "All caught up! No pending tasks." message
   - MOCK DATA: If query returns empty, seed 8 tasks with realistic titles matching Arizona BH compliance (OIG Exclusion Screening, HIPAA Access Review, Incident Report Review, Fire Drill Documentation, Chart Audit, Medication Storage Check, Staff Training Verification, Grievance Log Review). Mix of completed (3), pending (3), overdue (2). Use realistic dates in Feb 2026.

   RIGHT (40%): **"AI Agent Activity"**
   - Section header with "AI Activity" title + "View All →" link to /ai
   - Feed of recent agent actions (query: ai_agent_runs ORDER BY created_at DESC LIMIT 5)
   - Each entry: colored agent icon dot (different color per agent), agent name bold, description text, relative time ("2 hours ago"), action button at bottom
   - Action buttons vary: "Review" for suggestions, "Send Reminders" for compliance_monitor, "View Tasks" for checkpoint generation, "Open QM Packet" for qm_orchestrator
   - Confidence scores shown as small colored percentage when applicable
   - MOCK DATA: If query returns empty, seed 5 entries:
     1. Policy Guardian: "Found 2 potential conflicts between HIPAA and Safety policies" — confidence 0.87 — "Review" button
     2. Compliance Monitor: "3 checkpoints approaching due date this week" — "Send Reminders" button
     3. Compliance Monitor: "Generated 24 checkpoints for March 2026" — "View March Tasks" button
     4. Evidence Librarian: "2 checkpoints completed without evidence uploads" — "Review" button
     5. QM Orchestrator: "Monthly QM packet assembled for February 2026" — "Open QM Packet" button

## Right Aside (right-aside.tsx)
Full rewrite. Shows on dashboard only (already conditionally rendered in portal layout).

1. **Compliance Summary** section:
   - "Compliance Summary" header
   - Metric rows (label + value): "Audit Readiness" with score%, "Policies Effective" with count, "Controls Active" with count, "Evidence Coverage" with percentage
   - Query real data from audit_readiness_scores, policies, controls, evidence/checkpoints

2. **Attention Required** card:
   - Red/orange accent
   - Shows most urgent item: overdue CAPA, overdue checkpoint, or missing evidence
   - "View →" link to the relevant page
   - Query: capas WHERE status='overdue' LIMIT 1, OR checkpoints WHERE status='overdue' LIMIT 1

3. **AI Insight** card:
   - Blue accent
   - Shows latest pending AI suggestion title + brief description
   - "Review →" link to /suggestions
   - Query: ai_suggestions WHERE status='pending' ORDER BY created_at DESC LIMIT 1

## Header (header.tsx) — MINIMAL CHANGE
- Query notifications WHERE user_id=current_user AND is_read=false for real count
- Show count as badge on bell icon (red dot if >0)
- If query fails, show 0

## Sidebar (sidebar.tsx) — MINIMAL CHANGE
- Query ai_suggestions WHERE status='pending' for suggestions badge count
- Query policies WHERE status='in_review' + ai_suggestions WHERE status='pending' for approvals badge
- Real counts, not hardcoded 3 and 5

## DATA QUERIES — use src/lib/supabase/client.ts + src/hooks/use-org.ts

For all mock/seed data: the component should FIRST try the real Supabase query, and ONLY fall back to mock data if the query returns empty or errors. This way when real data exists it shows, but the UI is never empty during demos.

Add loading skeleton states (use the shimmer/pulse pattern) while data loads.

DO NOT touch: auth pages, controls, vault, qm, capa, settings, ai, suggestions, evidence, reports, calendar, checkpoints, or any files not listed above.
