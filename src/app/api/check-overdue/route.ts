import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/check-overdue?key=CRON_SECRET
 *
 * Cron-callable endpoint. Finds all checkpoints past their due date
 * that are still pending/in_progress and marks them as overdue.
 * Creates notifications and audit log entries.
 */
export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const key = new URL(request.url).searchParams.get('key')
    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const todayStr = new Date().toISOString().split('T')[0]

  // Find all checkpoints that are past due and not yet marked overdue/completed
  const { data: overdueCheckpoints, error } = await supabase
    .from('checkpoints')
    .select(`
      id, due_date, period, assigned_to, assignee_name, org_id,
      control:controls!control_id(title, code, standard)
    `)
    .in('status', ['pending', 'in_progress'])
    .lt('due_date', todayStr)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let updated = 0
  let notified = 0

  for (const cp of overdueCheckpoints ?? []) {
    const ctrl = cp.control as unknown as { title: string; code: string; standard: string } | null
    const title = ctrl?.title ?? 'Compliance Checkpoint'

    // Mark as overdue
    const { error: updateErr } = await supabase
      .from('checkpoints')
      .update({ status: 'overdue', updated_at: new Date().toISOString() })
      .eq('id', cp.id)

    if (updateErr) continue
    updated++

    // Write audit log entry
    await supabase.from('audit_log').insert({
      org_id: cp.org_id,
      action: 'checkpoint.overdue',
      entity_type: 'checkpoint',
      entity_id: cp.id,
      metadata: {
        due_date: cp.due_date,
        control_code: ctrl?.code,
        auto_detected: true,
      },
    })

    // Create notification for the assigned user
    if (cp.assigned_to) {
      await supabase.from('notifications').insert({
        org_id: cp.org_id,
        user_id: cp.assigned_to,
        type: 'overdue',
        title: `Overdue: ${title}`,
        message: `Your checkpoint "${title}" (${ctrl?.code ?? ''}) was due on ${cp.due_date} and is now overdue. Please complete it immediately.`,
        entity_type: 'checkpoint',
        entity_id: cp.id,
        is_read: false,
      })
      notified++
    }
  }

  return NextResponse.json({
    success: true,
    scanned: overdueCheckpoints?.length ?? 0,
    markedOverdue: updated,
    notified,
  })
}
