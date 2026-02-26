"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Recurrence } from "@/lib/types"

// ── Helpers ────────────────────────────────────────────────────────────────

/** Last calendar day of the given month (1-indexed) */
function getLastDay(year: number, month: number): Date {
  return new Date(year, month, 0)
}

/**
 * Last business day (Mon–Fri) of the given month.
 * month is 1-indexed (1 = January, 12 = December).
 */
function getLastBusinessDay(year: number, month: number): string {
  const date = getLastDay(year, month)
  // Walk back from last day until we hit Mon-Fri
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1)
  }
  return date.toISOString().split("T")[0]
}

/**
 * Whether a given frequency should generate a checkpoint for the given month.
 * month is 1-indexed.
 */
function controlMatchesPeriod(frequency: Recurrence, month: number): boolean {
  switch (frequency) {
    case "monthly":
      return true
    case "quarterly":
      // Q ends: March (3), June (6), September (9), December (12)
      return [3, 6, 9, 12].includes(month)
    case "semi_annual":
      // H1 ends June (6), H2 ends December (12)
      return [6, 12].includes(month)
    case "annual":
      return month === 12
  }
}

/** Map month number to quarter label: 1→Q1, 2→Q1, 3→Q1, 4→Q2, ... */
function getQuarterLabel(month: number): string {
  return `Q${Math.ceil(month / 3)}`
}

/** Period label for the checkpoint record, given frequency and month context */
function getPeriodLabel(
  frequency: Recurrence,
  year: number,
  month: number,
  periodInput: string
): string {
  switch (frequency) {
    case "monthly":
      return periodInput // e.g. "2026-03"
    case "quarterly":
      return `${year}-${getQuarterLabel(month)}` // e.g. "2026-Q1"
    case "semi_annual":
      return `${year}-${month <= 6 ? "H1" : "H2"}` // e.g. "2026-H1"
    case "annual":
      return `${year}` // e.g. "2026"
  }
}

// ── Main exported server action ────────────────────────────────────────────

export interface GenerateResult {
  count: number
  skipped: number
  error: string | null
}

/**
 * Generate checkpoint records for all active controls that fall due in the
 * given period.
 *
 * @param orgId   The organization UUID
 * @param period  Month period string in "YYYY-MM" format (e.g. "2026-03")
 */
export async function generateCheckpoints(
  orgId: string,
  period: string
): Promise<GenerateResult> {
  // Parse period
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return { count: 0, skipped: 0, error: "Invalid period format. Use YYYY-MM." }

  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const dueDate = getLastBusinessDay(year, month)

  // Build server Supabase client (needs auth)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (pairs) => {
          for (const { name, value, options } of pairs) {
            try { cookieStore.set(name, value, options) } catch { /* read-only during render */ }
          }
        },
      },
    }
  )

  // Verify authenticated user and their org
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0, skipped: 0, error: "Not authenticated" }

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .eq("is_active", true)
    .single()
  if (!member) return { count: 0, skipped: 0, error: "Unauthorized: not a member of this org" }

  // Load active controls for the org
  const { data: controls, error: ctrlErr } = await supabase
    .from("controls")
    .select("id, code, title, frequency, default_owner_role")
    .eq("org_id", orgId)
    .eq("is_active", true)

  if (ctrlErr) return { count: 0, skipped: 0, error: ctrlErr.message }
  if (!controls || controls.length === 0) return { count: 0, skipped: 0, error: null }

  // For each control, decide whether it applies to this period
  const applicableControls = controls.filter((c) =>
    controlMatchesPeriod(c.frequency as Recurrence, month)
  )

  if (applicableControls.length === 0) {
    return { count: 0, skipped: 0, error: null }
  }

  // Pre-load org members grouped by role (for assignee lookup)
  const { data: allMembers } = await supabase
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", orgId)
    .eq("is_active", true)

  const membersByRole: Record<string, string[]> = {}
  for (const m of allMembers ?? []) {
    const role = m.role as string
    if (!membersByRole[role]) membersByRole[role] = []
    membersByRole[role].push(m.user_id as string)
  }

  // Check which checkpoints already exist for this period to avoid duplicates
  const { data: existing } = await supabase
    .from("checkpoints")
    .select("control_id")
    .eq("org_id", orgId)
    .in(
      "period",
      applicableControls.map((c) =>
        getPeriodLabel(c.frequency as Recurrence, year, month, period)
      )
    )

  const existingControlIds = new Set((existing ?? []).map((e) => e.control_id as string))

  const toInsert: Array<{
    org_id: string
    control_id: string
    period: string
    status: string
    assigned_to: string | null
    due_date: string
  }> = []

  let skipped = 0

  for (const ctrl of applicableControls) {
    const periodLabel = getPeriodLabel(ctrl.frequency as Recurrence, year, month, period)

    // Skip if checkpoint already exists for this control+period
    if (existingControlIds.has(ctrl.id as string)) {
      skipped++
      continue
    }

    // Find assignee: first org member with the default role, else null
    const role = ctrl.default_owner_role as string | null
    const assigneeId = role && membersByRole[role]?.length > 0
      ? membersByRole[role][0]
      : null

    toInsert.push({
      org_id: orgId,
      control_id: ctrl.id as string,
      period: periodLabel,
      status: "pending",
      assigned_to: assigneeId,
      due_date: dueDate,
    })
  }

  if (toInsert.length === 0) {
    return { count: 0, skipped, error: null }
  }

  const { error: insertErr } = await supabase.from("checkpoints").insert(toInsert)
  if (insertErr) return { count: 0, skipped, error: insertErr.message }

  // Write to audit_log
  await supabase.from("audit_log").insert({
    org_id: orgId,
    user_id: user.id,
    action: "checkpoints.generate",
    entity_type: "checkpoint",
    metadata: {
      period,
      generated: toInsert.length,
      skipped,
      due_date: dueDate,
    },
  })

  return { count: toInsert.length, skipped, error: null }
}
