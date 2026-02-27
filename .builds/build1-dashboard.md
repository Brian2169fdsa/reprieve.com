Read CLAUDE.md first. Your job is to make the dashboard and layout components show REAL data from Supabase instead of hardcoded values. Every number on the dashboard is currently fake — fix all of them.

ONLY touch these files:
- src/app/(portal)/dashboard/page.tsx
- src/components/dashboard/stats-grid.tsx
- src/components/dashboard/upcoming-tasks.tsx
- src/components/dashboard/ai-activity-feed.tsx
- src/components/layout/right-aside.tsx
- src/components/layout/header.tsx (ONLY the notification count — currently hardcoded to 3)
- src/components/layout/sidebar.tsx (ONLY the badge counts — currently hardcoded approvals:3, suggestions:5)

Current state: dashboard/page.tsx is 31 lines with hardcoded "Cholla Behavioral Health" and "February 2026". stats-grid.tsx has fake values "87%", "18/24", "44/47", "2". upcoming-tasks.tsx has 4 hardcoded tasks. ai-activity-feed.tsx has 4 hardcoded entries. right-aside.tsx has all fake stats and a hardcoded alert. Header notification bell always shows 3. Sidebar badges always show 3 and 5.

What to build:

1. dashboard/page.tsx: Use the use-org hook to get real org name. Calculate current period dynamically. Pass org_id to all child components.

2. stats-grid.tsx: Query checkpoints table for current period — count total, completed (passed), and calculate percentage. Query policies table for effective count vs total. Query capas table for open count. Query audit_readiness_scores for latest overall_score. Calculate trend by comparing to previous period score.

3. upcoming-tasks.tsx: Query checkpoints table WHERE status IN ('pending','in_progress','overdue') ORDER BY due_date ASC LIMIT 5. Join with controls table for title and standard. Join with profiles for assignee name. Make rows clickable — navigate to /checkpoints/[id].

4. ai-activity-feed.tsx: Query ai_agent_runs table ORDER BY created_at DESC LIMIT 5. Show real agent name, output_summary, duration_ms, created_at. Use relative time formatting. Make "View all" link go to /ai.

5. right-aside.tsx: Query audit_readiness_scores for latest scores (overall, checkpoint, evidence, policy, capa). Query capas WHERE status='overdue' LIMIT 1 for attention alert. Query ai_suggestions WHERE status='pending' ORDER BY created_at DESC LIMIT 1 for AI insight.

6. header.tsx: Query notifications WHERE user_id=current_user AND is_read=false for real count.

7. sidebar.tsx: Query ai_suggestions WHERE status='pending' for suggestions count. Query policies WHERE status='in_review' for approvals count (plus pending ai_suggestions count).

Add use-realtime subscriptions on checkpoints, notifications, and ai_suggestions tables so the dashboard updates live without page refresh.

Use the existing hooks from src/hooks/ (use-org.ts, use-role.ts, use-checkpoints.ts, use-realtime.ts) and Supabase client from src/lib/supabase/client.ts.

DO NOT touch: auth pages, controls, vault, qm, capa, settings, ai, suggestions, evidence, reports, calendar, checkpoints, or any files not listed above.
