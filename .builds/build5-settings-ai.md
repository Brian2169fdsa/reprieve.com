Read CLAUDE.md first. Your job is to make all admin tools fully functional. Settings currently don't save. Members page is all fake. AI activity is mock data. Suggestion buttons are disabled.

ONLY touch these files:
- src/app/(portal)/settings/page.tsx
- src/app/(portal)/settings/members/page.tsx
- src/app/(portal)/ai/page.tsx
- src/app/(portal)/suggestions/page.tsx

Current state: settings/page.tsx (125 lines) has a save button that doesn't write to DB (comment says "TODO: persist via Supabase"). members/page.tsx (269 lines) uses 5 hardcoded seed members — handleInvite just shows a message, updateRole and toggleActive only update local state. ai/page.tsx (202 lines) has all mock data for agents and activity feed. suggestions/page.tsx (201 lines) has ALL THREE action buttons disabled with no onClick handlers.

What to build:

SETTINGS (settings/page.tsx):
1. On mount, fetch real org data from organizations table using use-org hook.
2. Wire save button to UPDATE organizations SET name=?, slug=?, updated_at=now() WHERE id=org_id.
3. Add slug auto-generation from name (like signup page does).
4. Add validation: name required, slug must be unique (check before save).
5. Write to audit_log on save (action: 'org.update').
6. Add role check: only admin role can edit (use use-role hook). Show read-only for others.

MEMBERS (settings/members/page.tsx):
1. Fetch real members: query org_members JOIN profiles WHERE org_id = current org.
2. Display real member data: name, email, role, is_active, joined_at.
3. Wire role change dropdown: UPDATE org_members SET role=? WHERE id=member_id. Write to audit_log.
4. Wire activate/deactivate toggle: UPDATE org_members SET is_active=? WHERE id=member_id. Write to audit_log.
5. Build invite flow: use supabase.auth.admin.inviteUserByEmail() if service role available, OR create a simple flow — insert a pending record and show the invite link. At minimum, use Supabase Auth signUp with a generated password and send credentials, or use the Supabase invite API.
6. After invite, insert org_members record with selected role.
7. Add role check: only admin can invite/manage. Others see read-only list.
8. Add confirmation dialog before deactivating a member.

AI ACTIVITY (ai/page.tsx):
1. Query ai_agent_runs table for current org, ORDER BY created_at DESC.
2. Display real data: agent name, trigger_type, status, input_summary, output_summary, tokens_used, duration_ms, created_at.
3. Add filtering: by agent name (dropdown), by status, by date range.
4. Add pagination or "Load more" for long lists.
5. Make each run expandable to show full output_summary and error_message if failed.
6. Add auto-refresh via use-realtime subscription on ai_agent_runs table.
7. Keep the agent info cards at top but mark status based on latest run per agent.

SUGGESTIONS (suggestions/page.tsx):
1. Query ai_suggestions WHERE status='pending' AND org_id=current_org ORDER BY created_at DESC.
2. ENABLE the Accept button: UPDATE ai_suggestions SET status='accepted', reviewed_by=current_user, reviewed_at=now(). Then apply the suggested_changes to the target entity (read entity_type and entity_id, apply the JSONB changes). Write to audit_log.
3. ENABLE the Reject button: show a textarea for rejection reason. UPDATE ai_suggestions SET status='rejected', reviewed_by=current_user, reviewed_at=now(), review_notes=reason. Write to audit_log.
4. ENABLE the Modify button: show the suggested_changes in an editable form. On save, UPDATE ai_suggestions SET status='modified', suggested_changes=edited_changes, reviewed_by, reviewed_at, review_notes. Apply the modified changes to the target entity. Write to audit_log.
5. Add tabs or filter: Pending | Accepted | Rejected | All.
6. Add realtime subscription for new suggestions appearing live.
7. Show confidence score with color coding (green >0.9, yellow 0.75-0.9, rust <0.75).

All queries scoped to org_id. Use src/lib/supabase/client.ts and hooks from src/hooks/.

DO NOT touch: dashboard, controls, vault, qm, capa, auth, layout, calendar, checkpoints, evidence, reports, hooks source files, or any files not listed above.
