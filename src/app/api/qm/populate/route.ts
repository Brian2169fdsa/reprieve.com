import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * POST /api/qm/populate
 *
 * Auto-populates a QM meeting with data from the calendar checkpoint system.
 * Calculates audit readiness scores, generates findings from failed/overdue
 * checkpoints, and writes an executive summary skeleton.
 *
 * Body: { orgId: string, period: string, meetingId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, period, meetingId } = await request.json() as {
      orgId: string
      period: string
      meetingId: string
    }

    if (!orgId || !period || !meetingId) {
      return NextResponse.json({ error: 'Missing orgId, period, or meetingId' }, { status: 400 })
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

    // ── 1. Fetch all checkpoints for the period ──────────────────────

    const { data: checkpoints, error: cpErr } = await supabase
      .from('checkpoints')
      .select(`
        id, status, due_date, period, assigned_to, assignee_name, attestation,
        control:controls!control_id(id, code, title, standard, category, required_evidence),
        evidence(id)
      `)
      .eq('org_id', orgId)
      .eq('period', period)

    if (cpErr) {
      return NextResponse.json({ error: cpErr.message }, { status: 500 })
    }

    const all = checkpoints ?? []
    const total = all.length

    if (total === 0) {
      return NextResponse.json({
        success: true,
        message: 'No checkpoints found for this period',
        stats: { total: 0 },
      })
    }

    // ── 2. Calculate checkpoint stats ────────────────────────────────

    const passed = all.filter(c => c.status === 'passed').length
    const failed = all.filter(c => c.status === 'failed').length
    const overdue = all.filter(c => c.status === 'overdue').length
    const pending = all.filter(c => c.status === 'pending' || c.status === 'in_progress').length
    const skipped = all.filter(c => c.status === 'skipped').length

    const withEvidence = all.filter(c => {
      const ev = c.evidence as unknown as { id: string }[] | null
      return (ev?.length ?? 0) > 0
    }).length

    const completedOnTime = passed // passed implies completed before marked overdue

    // ── 3. Calculate audit readiness scores ──────────────────────────

    const checkpointScore = total > 0 ? (completedOnTime / total) * 100 : 0
    const evidenceScore = total > 0 ? (withEvidence / total) * 100 : 0

    // Policy score: % of org policies in 'effective' status
    const { count: totalPolicies } = await supabase
      .from('policies')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)

    const { count: effectivePolicies } = await supabase
      .from('policies')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'effective')

    const policyScore = (totalPolicies ?? 0) > 0
      ? ((effectivePolicies ?? 0) / (totalPolicies ?? 1)) * 100
      : 100 // No policies = perfect (nothing to be out of compliance on)

    // CAPA score: % of CAPAs closed on time
    const { count: totalCapas } = await supabase
      .from('capas')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)

    const { count: closedCapas } = await supabase
      .from('capas')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'closed')

    const capaScore = (totalCapas ?? 0) > 0
      ? ((closedCapas ?? 0) / (totalCapas ?? 1)) * 100
      : 100

    const overallScore = Math.round(
      (0.35 * checkpointScore) +
      (0.25 * evidenceScore) +
      (0.25 * policyScore) +
      (0.15 * capaScore)
    * 100) / 100

    // ── 4. Auto-generate findings for failed/overdue checkpoints ─────

    const problematic = all.filter(c => c.status === 'failed' || c.status === 'overdue')

    for (const cp of problematic) {
      const ctrl = cp.control as unknown as { id: string; code: string; title: string; standard: string } | null

      // Check if a finding already exists for this checkpoint + meeting
      const { data: existingFinding } = await supabase
        .from('findings')
        .select('id')
        .eq('qm_meeting_id', meetingId)
        .eq('checkpoint_id', cp.id)
        .limit(1)

      if (existingFinding && existingFinding.length > 0) continue

      await supabase.from('findings').insert({
        org_id: orgId,
        qm_meeting_id: meetingId,
        checkpoint_id: cp.id,
        title: `${cp.status === 'failed' ? 'Failed' : 'Overdue'}: ${ctrl?.title ?? 'Unknown Control'}`,
        description: `Checkpoint ${ctrl?.code ?? ''} was ${cp.status} for period ${period}. ${cp.status === 'failed' ? 'Attestation was marked as fail.' : 'The due date passed without completion.'}`,
        severity: cp.status === 'failed' ? 'high' : 'medium',
        standard: ctrl?.standard ?? 'Internal',
      })
    }

    // ── 5. Build executive summary skeleton ──────────────────────────

    const periodLabel = formatPeriodLabel(period)
    const completionPct = total > 0 ? Math.round((passed / total) * 100) : 0
    const evidencePct = total > 0 ? Math.round((withEvidence / total) * 100) : 0
    const missingEvidence = total - withEvidence

    // Group by standard for detailed breakdown
    const byStandard = new Map<string, { total: number; passed: number; failed: number; overdue: number }>()
    for (const cp of all) {
      const ctrl = cp.control as unknown as { standard: string } | null
      const std = ctrl?.standard ?? 'Other'
      const entry = byStandard.get(std) ?? { total: 0, passed: 0, failed: 0, overdue: 0 }
      entry.total++
      if (cp.status === 'passed') entry.passed++
      if (cp.status === 'failed') entry.failed++
      if (cp.status === 'overdue') entry.overdue++
      byStandard.set(std, entry)
    }

    const standardBreakdown = Array.from(byStandard.entries())
      .map(([std, s]) => `- ${std}: ${s.passed}/${s.total} completed${s.failed > 0 ? `, ${s.failed} failed` : ''}${s.overdue > 0 ? `, ${s.overdue} overdue` : ''}`)
      .join('\n')

    const summaryText = [
      `For ${periodLabel}, ${passed} of ${total} compliance checkpoints were completed on time (${completionPct}%).`,
      failed > 0 ? `${failed} checkpoint${failed > 1 ? 's' : ''} failed attestation and require follow-up.` : '',
      overdue > 0 ? `${overdue} checkpoint${overdue > 1 ? 's' : ''} ${overdue === 1 ? 'is' : 'are'} overdue.` : '',
      pending > 0 ? `${pending} checkpoint${pending > 1 ? 's' : ''} ${pending === 1 ? 'is' : 'are'} still pending.` : '',
      `Evidence coverage stands at ${evidencePct}%.${missingEvidence > 0 ? ` ${missingEvidence} checkpoint${missingEvidence > 1 ? 's are' : ' is'} missing documentation.` : ''}`,
      '',
      'Standard Breakdown:',
      standardBreakdown,
      '',
      `Overall audit readiness score: ${overallScore}%`,
    ].filter(Boolean).join('\n')

    // ── 6. Update QM meeting record ──────────────────────────────────

    const { data: currentMeeting } = await supabase
      .from('qm_meetings')
      .select('executive_summary, agenda')
      .eq('id', meetingId)
      .single()

    const updates: Record<string, unknown> = {
      audit_readiness_score: overallScore,
      updated_at: new Date().toISOString(),
    }

    // Only set executive summary if blank
    if (!currentMeeting?.executive_summary) {
      updates.executive_summary = summaryText
    }

    // Auto-populate agenda items based on checkpoint data
    if (!currentMeeting?.agenda || (Array.isArray(currentMeeting.agenda) && currentMeeting.agenda.length === 0)) {
      updates.agenda = [
        { id: 'auto-1', category: 'Completions', description: `Review ${passed}/${total} checkpoints completed (${completionPct}%)`, checked: false },
        ...(failed > 0 ? [{ id: 'auto-2', category: 'Findings', description: `Discuss ${failed} failed checkpoint${failed > 1 ? 's' : ''} and root causes`, checked: false }] : []),
        ...(overdue > 0 ? [{ id: 'auto-3', category: 'Overdue', description: `Address ${overdue} overdue checkpoint${overdue > 1 ? 's' : ''}`, checked: false }] : []),
        { id: 'auto-4', category: 'Scoring', description: `Review audit readiness score: ${overallScore}%`, checked: false },
        ...(missingEvidence > 0 ? [{ id: 'auto-5', category: 'Findings', description: `Review ${missingEvidence} checkpoint${missingEvidence > 1 ? 's' : ''} with missing evidence`, checked: false }] : []),
        { id: 'auto-6', category: 'CAPAs', description: 'Review open CAPAs and deadlines', checked: false },
        { id: 'auto-7', category: 'Actions', description: 'Review previous month\'s action items', checked: false },
        { id: 'auto-8', category: 'Planning', description: 'Set action items for next period', checked: false },
        { id: 'auto-9', category: 'Schedule', description: 'Schedule next QM meeting date', checked: false },
      ]
    }

    await supabase.from('qm_meetings').update(updates).eq('id', meetingId)

    // ── 7. Upsert audit readiness scores ─────────────────────────────

    const { data: existingScore } = await supabase
      .from('audit_readiness_scores')
      .select('id')
      .eq('org_id', orgId)
      .eq('period', period)
      .limit(1)

    const scoreRow = {
      org_id: orgId,
      period,
      overall_score: overallScore,
      checkpoint_score: Math.round(checkpointScore * 100) / 100,
      evidence_score: Math.round(evidenceScore * 100) / 100,
      policy_score: Math.round(policyScore * 100) / 100,
      capa_score: Math.round(capaScore * 100) / 100,
      calculated_at: new Date().toISOString(),
    }

    if (existingScore && existingScore.length > 0) {
      await supabase.from('audit_readiness_scores').update(scoreRow).eq('id', existingScore[0].id)
    } else {
      await supabase.from('audit_readiness_scores').insert(scoreRow)
    }

    return NextResponse.json({
      success: true,
      stats: {
        total,
        passed,
        failed,
        overdue,
        pending,
        skipped,
        withEvidence,
        missingEvidence,
      },
      scores: {
        overall: overallScore,
        checkpoint: Math.round(checkpointScore * 100) / 100,
        evidence: Math.round(evidenceScore * 100) / 100,
        policy: Math.round(policyScore * 100) / 100,
        capa: Math.round(capaScore * 100) / 100,
      },
      findingsCreated: problematic.length,
      summaryGenerated: !currentMeeting?.executive_summary,
    })

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
