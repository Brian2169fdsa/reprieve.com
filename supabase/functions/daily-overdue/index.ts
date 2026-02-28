// Supabase Edge Function: daily-overdue
// Triggered by pg_cron daily at 07:00 UTC.
// Marks pending checkpoints past their due date as 'overdue' and
// writes notifications to assigned staff members.
//
// pg_cron setup:
//   SELECT cron.schedule('daily-overdue-scan', '0 7 * * *',
//     $$SELECT net.http_post(url := 'https://<ref>.supabase.co/functions/v1/daily-overdue',
//     headers := '{"Authorization": "Bearer <key>", "Content-Type": "application/json"}'::jsonb,
//     body := '{}'::jsonb)$$);

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = new Date().toISOString().split('T')[0];

  // Mark pending checkpoints past due date as overdue
  const { data: markedOverdue, error: markError } = await admin
    .from('checkpoints')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lt('due_date', today)
    .select('id, org_id, assigned_to, assignee_name, control:controls(title), due_date');

  if (markError) {
    return new Response(JSON.stringify({ error: markError.message }), { status: 500 });
  }

  const overdueCount = (markedOverdue ?? []).length;

  // Send notifications to assigned users
  const notifications: Record<string, unknown>[] = [];
  for (const cp of markedOverdue ?? []) {
    if (!cp.assigned_to) continue;
    notifications.push({
      org_id: cp.org_id,
      user_id: cp.assigned_to,
      type: 'overdue',
      title: 'Checkpoint overdue',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: `"${(cp as any).control?.title ?? 'Checkpoint'}" was due ${cp.due_date} and is now overdue. Please complete and upload evidence.`,
      entity_type: 'checkpoint',
      entity_id: cp.id,
    });
  }

  if (notifications.length > 0) {
    await admin.from('notifications').insert(notifications);
  }

  // Send 7-day reminders for upcoming checkpoints
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().split('T')[0];

  const { data: upcoming } = await admin
    .from('checkpoints')
    .select('id, org_id, assigned_to, control:controls(title), due_date')
    .eq('status', 'pending')
    .gte('due_date', today)
    .lte('due_date', in7DaysStr);

  const reminders: Record<string, unknown>[] = [];
  for (const cp of upcoming ?? []) {
    if (!cp.assigned_to) continue;
    reminders.push({
      org_id: cp.org_id,
      user_id: cp.assigned_to,
      type: 'checkpoint_due',
      title: 'Checkpoint due soon',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: `"${(cp as any).control?.title ?? 'Checkpoint'}" is due ${cp.due_date}. Upload evidence and complete attestation.`,
      entity_type: 'checkpoint',
      entity_id: cp.id,
    });
  }

  if (reminders.length > 0) {
    await admin.from('notifications').insert(reminders);
  }

  return new Response(
    JSON.stringify({
      markedOverdue: overdueCount,
      notificationsSent: notifications.length,
      remindersSent: reminders.length,
      date: today,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
