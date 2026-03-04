import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM_EMAIL = process.env.REMINDER_FROM_EMAIL ?? 'REPrieve.ai <noreply@reprieve.ai>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET

function buildReminderHTML(
  checkpointTitle: string,
  formattedDate: string,
  assigneeName: string,
  daysUntilDue: number,
): string {
  const urgency = daysUntilDue <= 0
    ? '<span style="color:#DC2626;font-weight:700">OVERDUE</span>'
    : daysUntilDue === 1
    ? '<span style="color:#D97706;font-weight:700">Due Tomorrow</span>'
    : `Due in ${daysUntilDue} days`

  return `
    <div style="font-family:'Source Sans 3',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="background:#2A8BA8;padding:14px 20px;border-radius:10px 10px 0 0;border-bottom:3px solid #C05A2C">
        <h1 style="color:#fff;font-size:18px;margin:0">REPrieve.ai</h1>
      </div>
      <div style="background:#fff;border:1px solid #E8E8E8;border-top:none;padding:28px 24px;border-radius:0 0 10px 10px">
        <p style="font-size:15px;color:#262626;margin:0 0 8px">
          Hi ${assigneeName},
        </p>
        <p style="font-size:13px;color:#737373;margin:0 0 16px">${urgency}</p>
        <p style="font-size:14px;color:#404040;line-height:1.6;margin:0 0 20px">
          Your compliance checkpoint <strong>"${checkpointTitle}"</strong> is due on
          <strong>${formattedDate}</strong>. Please complete the test procedure, upload
          evidence, and attest pass or fail before the deadline.
        </p>
        <a href="${APP_URL}/calendar" style="display:inline-block;padding:10px 24px;background:#2A8BA8;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
          Open Calendar
        </a>
        <p style="font-size:12px;color:#A3A3A3;margin:24px 0 0;border-top:1px solid #E8E8E8;padding-top:16px">
          Automated reminder from REPrieve.ai Compliance OS.
        </p>
      </div>
    </div>
  `
}

/**
 * GET /api/send-reminders?key=CRON_SECRET
 *
 * Cron-callable endpoint. Scans all checkpoints due within 3 days that are
 * still pending/in_progress, then sends email reminders to assigned users.
 * Avoids duplicate emails by checking existing notifications.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (skip in dev)
  if (CRON_SECRET) {
    const key = new URL(request.url).searchParams.get('key')
    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const today = new Date()
  const threeDaysOut = new Date(today)
  threeDaysOut.setDate(threeDaysOut.getDate() + 3)

  const todayStr = today.toISOString().split('T')[0]
  const futureStr = threeDaysOut.toISOString().split('T')[0]

  // Find checkpoints due within 3 days that haven't been completed
  const { data: checkpoints, error } = await supabase
    .from('checkpoints')
    .select(`
      id, due_date, period, assigned_to, assignee_name, org_id,
      control:controls!control_id(title, code, standard)
    `)
    .in('status', ['pending', 'in_progress'])
    .gte('due_date', todayStr)
    .lte('due_date', futureStr)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let emailsSent = 0
  let notificationsCreated = 0
  const errors: string[] = []

  for (const cp of checkpoints ?? []) {
    const ctrl = cp.control as unknown as { title: string; code: string; standard: string } | null
    const title = ctrl?.title ?? 'Compliance Checkpoint'

    // Skip if no assigned user (only name-based assignment, no email to send)
    if (!cp.assigned_to) continue

    // Check for existing reminder notification for this checkpoint
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('entity_id', cp.id)
      .eq('type', 'checkpoint_due_reminder')
      .eq('user_id', cp.assigned_to)
      .limit(1)

    if (existing && existing.length > 0) continue // already notified

    const dueDate = new Date(cp.due_date + 'T12:00:00')
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const formattedDate = dueDate.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })

    // Create notification record
    await supabase.from('notifications').insert({
      org_id: cp.org_id,
      user_id: cp.assigned_to,
      type: 'checkpoint_due_reminder',
      title: `Due ${daysUntilDue <= 0 ? 'Today' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`}: ${title}`,
      message: `Your compliance checkpoint "${title}" (${ctrl?.code ?? ''}) is due on ${formattedDate}.`,
      entity_type: 'checkpoint',
      entity_id: cp.id,
      is_read: false,
    })
    notificationsCreated++

    // Send email if Resend is configured
    if (resend) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', cp.assigned_to)
        .single()

      if (profile?.email) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: profile.email,
            subject: `${daysUntilDue <= 0 ? 'OVERDUE' : 'Reminder'}: ${title} — Due ${formattedDate}`,
            html: buildReminderHTML(title, formattedDate, profile.full_name || 'Team Member', daysUntilDue),
          })
          emailsSent++
        } catch (err) {
          errors.push(`Email to ${profile.email} failed: ${err instanceof Error ? err.message : 'unknown'}`)
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    checkpointsScanned: checkpoints?.length ?? 0,
    notificationsCreated,
    emailsSent,
    errors: errors.length > 0 ? errors : undefined,
    resendConfigured: !!resend,
  })
}
