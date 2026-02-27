import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * POST /api/reminders
 *
 * Schedules (or cancels) an email reminder for a checkpoint due date.
 * Stores the reminder in the `notifications` table.
 * When an email provider (e.g., Resend, Postmark) is configured,
 * connect it here — the notification record is the source of truth.
 *
 * Body: {
 *   action:       "set" | "cancel"
 *   checkpointId: string
 *   orgId:        string
 *   userId:       string        // user to notify (assignee or requester)
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
    // Check if one already exists to avoid duplicates
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
        title:       `Due Today: ${checkpointTitle}`,
        message:     `Your compliance checkpoint "${checkpointTitle}" is due today (${formattedDate}). Please complete the test procedure, upload evidence, and attest pass or fail.`,
        entity_type: 'checkpoint',
        entity_id:   checkpointId,
        is_read:     false,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // TODO: When email provider is configured, trigger send here.
    // Example with Resend:
    //
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'noreply@reprieve.ai',
    //   to: userEmail,
    //   subject: `Compliance Checkpoint Due: ${checkpointTitle}`,
    //   html: `<p>Your checkpoint "${checkpointTitle}" is due on ${formattedDate}.</p>`,
    //   scheduledAt: dueDate + 'T09:00:00Z', // send at 9am on due date
    // })

    return NextResponse.json({
      success:    true,
      action:     'set',
      id:         data.id,
      scheduledFor: dueDate,
      note:       'Notification stored. Connect an email provider (Resend/Postmark) in /api/reminders/route.ts to enable email delivery.',
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
