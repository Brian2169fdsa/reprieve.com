import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM_EMAIL = process.env.REMINDER_FROM_EMAIL ?? 'REPrieve.ai <noreply@reprieve.ai>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function buildReminderHTML(checkpointTitle: string, formattedDate: string, assigneeName: string): string {
  return `
    <div style="font-family:'Source Sans 3',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="background:#2A8BA8;padding:14px 20px;border-radius:10px 10px 0 0;border-bottom:3px solid #C05A2C">
        <h1 style="color:#fff;font-size:18px;margin:0">REPrieve.ai</h1>
      </div>
      <div style="background:#fff;border:1px solid #E8E8E8;border-top:none;padding:28px 24px;border-radius:0 0 10px 10px">
        <p style="font-size:15px;color:#262626;margin:0 0 16px">
          Hi ${assigneeName},
        </p>
        <p style="font-size:14px;color:#404040;line-height:1.6;margin:0 0 20px">
          Your compliance checkpoint <strong>"${checkpointTitle}"</strong> is due on
          <strong>${formattedDate}</strong>. Please complete the test procedure, upload
          evidence, and attest pass or fail before the deadline.
        </p>
        <a href="${APP_URL}/calendar" style="display:inline-block;padding:10px 24px;background:#2A8BA8;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
          Open Calendar
        </a>
        <p style="font-size:12px;color:#A3A3A3;margin:24px 0 0;border-top:1px solid #E8E8E8;padding-top:16px">
          This is an automated reminder from REPrieve.ai Compliance OS.
        </p>
      </div>
    </div>
  `
}

/**
 * POST /api/reminders
 *
 * Schedules (or cancels) an email reminder for a checkpoint due date.
 * Stores the reminder in the `notifications` table and sends email via Resend.
 *
 * Body: {
 *   action:       "set" | "cancel"
 *   checkpointId: string
 *   orgId:        string
 *   userId:       string
 *   dueDate:      string        // ISO date "YYYY-MM-DD"
 *   checkpointTitle: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      action: 'set' | 'cancel'
      checkpointId: string
      orgId: string
      userId: string
      dueDate: string
      checkpointTitle: string
    }

    const { action, checkpointId, orgId, userId, dueDate, checkpointTitle } = body

    if (!checkpointId || !orgId || !userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    if (action === 'cancel') {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('entity_id', checkpointId)
        .eq('type', 'checkpoint_due_reminder')
        .eq('user_id', userId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, action: 'cancelled' })
    }

    // action === 'set'
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('entity_id', checkpointId)
      .eq('type', 'checkpoint_due_reminder')
      .eq('user_id', userId)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, action: 'already_set', id: existing[0].id })
    }

    const formattedDate = new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        org_id:      orgId,
        user_id:     userId,
        type:        'checkpoint_due_reminder',
        title:       `Due: ${checkpointTitle}`,
        message:     `Your compliance checkpoint "${checkpointTitle}" is due on ${formattedDate}. Please complete the test procedure, upload evidence, and attest pass or fail.`,
        entity_type: 'checkpoint',
        entity_id:   checkpointId,
        is_read:     false,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send email via Resend
    let emailSent = false
    if (resend) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      if (profile?.email) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: profile.email,
            subject: `Compliance Checkpoint Due: ${checkpointTitle}`,
            html: buildReminderHTML(checkpointTitle, formattedDate, profile.full_name || 'Team Member'),
          })
          emailSent = true
        } catch (emailErr) {
          console.error('Resend email failed:', emailErr)
        }
      }
    }

    return NextResponse.json({
      success:      true,
      action:       'set',
      id:           data.id,
      scheduledFor: dueDate,
      emailSent,
    })

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reminders?checkpointId=&userId=
 * Check if a reminder is set for a checkpoint/user pair.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const checkpointId = searchParams.get('checkpointId')
  const userId       = searchParams.get('userId')

  if (!checkpointId || !userId) {
    return NextResponse.json({ error: 'Missing checkpointId or userId' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase
    .from('notifications')
    .select('id, created_at')
    .eq('entity_id', checkpointId)
    .eq('type', 'checkpoint_due_reminder')
    .eq('user_id', userId)
    .limit(1)

  return NextResponse.json({
    isSet: (data?.length ?? 0) > 0,
    notification: data?.[0] ?? null,
  })
}
