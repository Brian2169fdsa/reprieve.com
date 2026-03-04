"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { getEvidenceUrl } from "@/lib/supabase/storage"

// ── Types ────────────────────────────────────────────────
interface EvidenceRow {
  id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size_bytes: number | null
  created_at: string
  uploaded_by: string | null
  checkpoint_id: string | null
  tags: Record<string, unknown>
  checkpoint?: {
    id: string
    period: string
    status: string
    control?: {
      id: string
      code: string
      title: string
      standard: string
    }
  }
  uploader?: { full_name: string } | null
}

interface MissingEvidence {
  checkpointId: string
  controlCode: string
  controlTitle: string
  standard: string
  period: string
  status: string
}

interface StandardGroup {
  standard: string
  period: string
  items: EvidenceRow[]
  missing: MissingEvidence[]
}

// ── Constants ────────────────────────────────────────────

const STANDARD_COLORS: Record<string, { accent: string; bg: string; text: string; icon: string }> = {
  OIG:        { accent: '#3BA7C9', bg: '#E8F6FA', text: '#0E7490', icon: '🛡' },
  HIPAA:      { accent: '#7C3AED', bg: '#F5F3FF', text: '#6D28D9', icon: '🔒' },
  AHCCCS:     { accent: '#16A34A', bg: '#F0FDF4', text: '#15803D', icon: '📋' },
  Safety:     { accent: '#D97706', bg: '#FFFBEB', text: '#B45309', icon: '⚠' },
  Operations: { accent: '#737373', bg: '#F5F5F5', text: '#525252', icon: '⚙' },
  HR:         { accent: '#DB2777', bg: '#FDF4FF', text: '#9333EA', icon: '👤' },
  TJC:        { accent: '#92400E', bg: '#FFF7ED', text: '#92400E', icon: '🏥' },
  CARF:       { accent: '#4338CA', bg: '#EEF2FF', text: '#4338CA', icon: '📊' },
  Internal:   { accent: '#525252', bg: '#F5F5F5', text: '#525252', icon: '📁' },
}

const FILE_ICONS: Record<string, { label: string; bg: string; color: string }> = {
  pdf:      { label: 'PDF', bg: '#FEF2F2', color: '#DC2626' },
  image:    { label: 'IMG', bg: '#EFF6FF', color: '#2563EB' },
  video:    { label: 'VID', bg: '#F5F3FF', color: '#7C3AED' },
  document: { label: 'DOC', bg: '#F0FDF4', color: '#16A34A' },
}

// ── Demo data (shown when no real data exists) ───────────

const DEMO_EVIDENCE: { standard: string; period: string; files: { name: string; type: string; date: string; size: number }[]; missing: { code: string; title: string }[] }[] = [
  {
    standard: 'AHCCCS',
    period: '2026-03',
    files: [
      { name: 'chart-audit-scoring-mar2026.pdf', type: 'pdf', date: '2026-03-19', size: 245000 },
      { name: 'deidentified-chart-sample.xlsx', type: 'document', date: '2026-03-19', size: 89000 },
    ],
    missing: [],
  },
  {
    standard: 'HIPAA',
    period: '2026-03',
    files: [
      { name: 'hipaa-risk-analysis-2026.pdf', type: 'pdf', date: '2026-03-10', size: 1200000 },
      { name: 'vendor-baa-inventory.xlsx', type: 'document', date: '2026-03-10', size: 156000 },
    ],
    missing: [
      { code: 'HIPAA-PRIV-001', title: 'Quarterly privacy & consent controls review' },
    ],
  },
  {
    standard: 'Safety',
    period: '2026-03',
    files: [
      { name: 'workplace-violence-analysis-2026.pdf', type: 'pdf', date: '2026-03-10', size: 890000 },
      { name: 'disaster-drill-signin-sheets.pdf', type: 'pdf', date: '2026-03-21', size: 340000 },
      { name: 'drill-after-action-review.pdf', type: 'pdf', date: '2026-03-21', size: 210000 },
    ],
    missing: [
      { code: 'EMER-READY-001', title: "Quarterly '2-hour readiness' document retrieval drill" },
    ],
  },
  {
    standard: 'Internal',
    period: '2026-03',
    files: [
      { name: 'qm-pi-meeting-minutes-mar2026.pdf', type: 'pdf', date: '2026-03-12', size: 180000 },
      { name: 'qm-attendance-sheet.pdf', type: 'pdf', date: '2026-03-12', size: 45000 },
      { name: 'annual-qm-evaluation-2026.pdf', type: 'pdf', date: '2026-03-10', size: 520000 },
    ],
    missing: [],
  },
  {
    standard: 'HR',
    period: '2026-03',
    files: [
      { name: 'training-completion-report-mar2026.pdf', type: 'pdf', date: '2026-03-26', size: 310000 },
    ],
    missing: [
      { code: 'WORK-COMP-001', title: 'Workforce: competency checklists needed' },
    ],
  },
  {
    standard: 'Operations',
    period: '2026-03',
    files: [],
    missing: [
      { code: 'BILL-INT-001', title: 'Billing/encounter integrity & timely filing' },
    ],
  },
]

// ── Helpers ──────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatPeriod(period: string): string {
  if (period.includes('Q')) {
    const [year, q] = period.split('-')
    return `${q} ${year}`
  }
  const [year, month] = period.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getFileTypeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video'
  return 'document'
}

// ── Component ────────────────────────────────────────────

export default function EvidenceBinderPage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [evidenceRows, setEvidenceRows] = useState<EvidenceRow[]>([])
  const [missingEvidence, setMissingEvidence] = useState<MissingEvidence[]>([])
  const [activePeriod, setActivePeriod] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  // Detect if we should show demo data
  const isDemo = evidenceRows.length === 0 && missingEvidence.length === 0 && !loading

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!membership) {
      setError('No organization found.')
      setLoading(false)
      return
    }

    setOrgId(membership.org_id)

    // Fetch evidence with checkpoint + control joins
    const { data: evidence, error: evErr } = await supabase
      .from('evidence')
      .select(`
        *,
        checkpoint:checkpoints!checkpoint_id(
          id, period, status,
          control:controls!control_id(id, code, title, standard)
        ),
        uploader:profiles!uploaded_by(full_name)
      `)
      .eq('org_id', membership.org_id)
      .order('created_at', { ascending: false })

    if (evErr) {
      setError(evErr.message)
      setLoading(false)
      return
    }

    // Fetch checkpoints that are completed/passed but have no evidence
    const { data: checkpoints } = await supabase
      .from('checkpoints')
      .select(`
        id, period, status,
        control:controls!control_id(id, code, title, standard)
      `)
      .eq('org_id', membership.org_id)
      .in('status', ['passed', 'failed', 'in_progress', 'pending', 'overdue'])

    const evidenceCheckpointIds = new Set((evidence ?? []).map(e => e.checkpoint_id).filter(Boolean))
    const missing: MissingEvidence[] = []
    for (const cp of (checkpoints ?? [])) {
      if (!evidenceCheckpointIds.has(cp.id) && cp.control) {
        const ctrl = cp.control as unknown as { id: string; code: string; title: string; standard: string }
        missing.push({
          checkpointId: cp.id,
          controlCode: ctrl.code,
          controlTitle: ctrl.title,
          standard: ctrl.standard,
          period: cp.period,
          status: cp.status,
        })
      }
    }

    const rows = (evidence ?? []) as unknown as EvidenceRow[]

    setEvidenceRows(rows)
    setMissingEvidence(missing)

    // Pick the most recent period as default
    const allPeriods = new Set<string>()
    rows.forEach(r => {
      if (r.checkpoint?.period) allPeriods.add(r.checkpoint.period)
    })
    missing.forEach(m => allPeriods.add(m.period))
    const sorted = Array.from(allPeriods).sort().reverse()
    setActivePeriod(sorted[0] ?? '2026-03')
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Compute available periods (real or demo)
  const periods = useMemo(() => {
    if (isDemo) {
      return [...new Set(DEMO_EVIDENCE.map(d => d.period))].sort().reverse()
    }
    const set = new Set<string>()
    evidenceRows.forEach(r => {
      if (r.checkpoint?.period) set.add(r.checkpoint.period)
    })
    missingEvidence.forEach(m => set.add(m.period))
    if (set.size === 0) {
      const now = new Date()
      return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`]
    }
    return Array.from(set).sort().reverse()
  }, [evidenceRows, missingEvidence, isDemo])

  // Build standard groups from real data
  const standardGroups: StandardGroup[] = useMemo(() => {
    if (isDemo) {
      // Build demo groups
      return DEMO_EVIDENCE.filter(d => d.period === (activePeriod || '2026-03')).map(d => ({
        standard: d.standard,
        period: d.period,
        items: d.files.map((f, i) => ({
          id: `demo-${d.standard}-${i}`,
          file_name: f.name,
          file_path: '',
          file_type: f.type,
          file_size_bytes: f.size,
          created_at: f.date,
          uploaded_by: null,
          checkpoint_id: null,
          tags: {},
        })),
        missing: d.missing.map((m, i) => ({
          checkpointId: `demo-missing-${d.standard}-${i}`,
          controlCode: m.code,
          controlTitle: m.title,
          standard: d.standard,
          period: d.period,
          status: 'pending',
        })),
      })).sort((a, b) => a.standard.localeCompare(b.standard))
    }

    const groups = new Map<string, StandardGroup>()
    const periodItems = evidenceRows.filter(r => r.checkpoint?.period === activePeriod)
    for (const item of periodItems) {
      const std = item.checkpoint?.control?.standard ?? 'Other'
      const key = `${std}-${activePeriod}`
      if (!groups.has(key)) {
        groups.set(key, { standard: std, period: activePeriod, items: [], missing: [] })
      }
      groups.get(key)!.items.push(item)
    }
    const periodMissing = missingEvidence.filter(m => m.period === activePeriod)
    for (const m of periodMissing) {
      const key = `${m.standard}-${activePeriod}`
      if (!groups.has(key)) {
        groups.set(key, { standard: m.standard, period: activePeriod, items: [], missing: [] })
      }
      groups.get(key)!.missing.push(m)
    }
    return Array.from(groups.values()).sort((a, b) => a.standard.localeCompare(b.standard))
  }, [evidenceRows, missingEvidence, activePeriod, isDemo])

  async function handleViewFile(item: EvidenceRow) {
    if (!orgId || !item.file_path) return
    const url = await getEvidenceUrl(orgId, item.file_path)
    if (url) window.open(url, '_blank')
  }

  async function handleExportBinder() {
    setExporting(true)
    try {
      const allItems = standardGroups.flatMap(g => g.items)
      const allMissing = standardGroups.flatMap(g => g.missing)

      const rows = allItems.map(item => {
        const std = item.checkpoint?.control?.standard ?? '—'
        const code = item.checkpoint?.control?.code ?? '—'
        const title = item.checkpoint?.control?.title ?? '—'
        const uploader = item.uploader?.full_name ?? '—'
        const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        return `<tr>
          <td style="padding:8px 12px;border:1px solid #ddd">${item.file_name}</td>
          <td style="padding:8px 12px;border:1px solid #ddd">${std}</td>
          <td style="padding:8px 12px;border:1px solid #ddd">${code}</td>
          <td style="padding:8px 12px;border:1px solid #ddd">${title}</td>
          <td style="padding:8px 12px;border:1px solid #ddd">${formatFileSize(item.file_size_bytes)}</td>
          <td style="padding:8px 12px;border:1px solid #ddd">${uploader}</td>
          <td style="padding:8px 12px;border:1px solid #ddd">${date}</td>
        </tr>`
      }).join('')

      const missingRows = allMissing.map(m => {
        return `<tr style="background:#FEF2F2">
          <td style="padding:8px 12px;border:1px solid #ddd;color:#DC2626;font-weight:600">MISSING</td>
          <td style="padding:8px 12px;border:1px solid #ddd">${m.standard}</td>
          <td style="padding:8px 12px;border:1px solid #ddd">${m.controlCode}</td>
          <td style="padding:8px 12px;border:1px solid #ddd">${m.controlTitle}</td>
          <td style="padding:8px 12px;border:1px solid #ddd" colspan="3">Evidence not uploaded</td>
        </tr>`
      }).join('')

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Evidence Binder — ${formatPeriod(activePeriod)}</title>
<style>
  body { font-family: 'Source Sans 3', system-ui, sans-serif; padding: 40px; color: #262626; }
  h1 { font-family: Georgia, serif; color: #171717; }
  h2 { color: #2A8BA8; margin-top: 32px; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 13px; }
  th { background: #F5F5F5; padding: 10px 12px; text-align: left; border: 1px solid #ddd; font-weight: 600; }
  .summary { display: flex; gap: 24px; margin: 20px 0; }
  .stat { padding: 16px; background: #F0F9FC; border-radius: 8px; text-align: center; }
  .stat-num { font-size: 28px; font-weight: 700; color: #2A8BA8; }
  .stat-label { font-size: 12px; color: #737373; margin-top: 4px; }
</style></head><body>
<h1>REPrieve.ai Evidence Binder</h1>
<p style="color:#737373">Period: <strong>${formatPeriod(activePeriod)}</strong> | Generated: ${new Date().toLocaleString()}</p>
<div class="summary">
  <div class="stat"><div class="stat-num">${allItems.length}</div><div class="stat-label">Evidence Files</div></div>
  <div class="stat"><div class="stat-num">${allMissing.length}</div><div class="stat-label">Missing Items</div></div>
  <div class="stat"><div class="stat-num">${standardGroups.length}</div><div class="stat-label">Standards</div></div>
</div>
<h2>Evidence Index</h2>
<table>
  <thead><tr><th>File Name</th><th>Standard</th><th>Control</th><th>Checkpoint</th><th>Size</th><th>Uploaded By</th><th>Date</th></tr></thead>
  <tbody>${rows}${missingRows}</tbody>
</table>
</body></html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } finally {
      setExporting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────

  // Period summary stats
  const periodStats = useMemo(() => {
    const allItems = standardGroups.flatMap(g => g.items)
    const allMissing = standardGroups.flatMap(g => g.missing)
    const totalCheckpoints = allItems.length + allMissing.length
    const coveragePct = totalCheckpoints > 0 ? Math.round((allItems.length / totalCheckpoints) * 100) : 0
    const standardSet = new Set(standardGroups.map(g => g.standard))
    return {
      files: allItems.length,
      missing: allMissing.length,
      coverage: coveragePct,
      standards: standardSet.size,
    }
  }, [standardGroups])

  return (
    <div style={{ padding: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 700, color: '#171717', marginBottom: '4px' }}>
            Evidence Binder
          </h1>
          <p style={{ fontSize: '14px', color: '#737373' }}>
            Audit-ready evidence organized by standard and period
          </p>
        </div>
        <button
          onClick={handleExportBinder}
          disabled={exporting || isDemo}
          title={isDemo ? 'Export available when real evidence is uploaded' : undefined}
          style={{
            padding: '9px 18px',
            background: exporting || isDemo ? '#A3A3A3' : '#2A8BA8',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: exporting || isDemo ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {exporting ? 'Preparing binder...' : 'Export Binder'}
        </button>
      </div>

      {/* Demo Banner */}
      {isDemo && (
        <div style={{
          background: '#E8F6FA',
          border: '1px solid #B8E3F0',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '15px', flexShrink: 0 }}>ℹ</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0E7490' }}>
              Sample Data
            </span>
            <span style={{ fontSize: '13px', color: '#0E7490', marginLeft: '8px' }}>
              — This is demo evidence. Upload real files via checkpoint pages to replace it.
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#B91C1C', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Period Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {periods.map(period => {
          const isActive = period === activePeriod
          return (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: isActive ? 'none' : '1px solid #D4D4D4',
                background: isActive ? '#2A8BA8' : '#fff',
                color: isActive ? '#fff' : '#525252',
                transition: 'all 0.15s',
              }}
            >
              {formatPeriod(period)}
            </button>
          )
        })}
      </div>

      {/* Period Summary Stats */}
      {!loading && standardGroups.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Evidence Files', value: String(periodStats.files), color: '#2A8BA8', bg: '#E8F6FA' },
            { label: 'Missing Evidence', value: String(periodStats.missing), color: periodStats.missing > 0 ? '#DC2626' : '#16A34A', bg: periodStats.missing > 0 ? '#FEF2F2' : '#F0FDF4' },
            { label: 'Coverage', value: `${periodStats.coverage}%`, color: periodStats.coverage >= 80 ? '#16A34A' : periodStats.coverage >= 50 ? '#D97706' : '#DC2626', bg: periodStats.coverage >= 80 ? '#F0FDF4' : periodStats.coverage >= 50 ? '#FFFBEB' : '#FEF2F2' },
            { label: 'Standards', value: String(periodStats.standards), color: '#525252', bg: '#F5F5F5' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ padding: '14px 12px', background: bg, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#737373', fontWeight: 500, marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Missing Evidence Alert */}
      {!loading && periodStats.missing > 0 && !isDemo && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px',
          padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>!</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#B91C1C' }}>
              {periodStats.missing} checkpoint{periodStats.missing !== 1 ? 's' : ''} missing evidence
            </span>
            <span style={{ fontSize: '13px', color: '#DC2626', marginLeft: '8px' }}>
              — Upload via the Calendar checkpoint popover
            </span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px' }}>
          Loading evidence...
        </div>
      )}

      {/* Standards Grid */}
      {!loading && standardGroups.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
          {standardGroups.map(group => {
            const sc = STANDARD_COLORS[group.standard] ?? STANDARD_COLORS.Internal
            const totalCount = group.items.length + group.missing.length
            const presentCount = group.items.length
            const allPresent = group.missing.length === 0

            return (
              <div
                key={`${group.standard}-${group.period}`}
                style={{
                  background: '#fff',
                  border: '1px solid #E8E8E8',
                  borderRadius: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                }}
              >
                {/* Card header — "Standard — Period" format */}
                <div style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #E8E8E8',
                  background: '#FAFAFA',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: sc.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      flexShrink: 0,
                    }}>
                      {sc.icon}
                    </span>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#171717' }}>
                        {group.standard}
                      </span>
                      <span style={{ fontSize: '14px', color: '#A3A3A3', margin: '0 6px' }}>—</span>
                      <span style={{ fontSize: '14px', color: '#737373', fontWeight: 500 }}>
                        {formatPeriod(group.period)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: allPresent ? '#16A34A' : '#DC2626',
                      display: 'inline-block',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '12px', color: '#737373', fontWeight: 500 }}>
                      {presentCount} of {totalCount}
                    </span>
                  </div>
                </div>

                {/* Evidence items */}
                <div style={{ padding: '4px 0' }}>
                  {group.items.map(item => {
                    const ft = FILE_ICONS[item.file_type ?? getFileTypeFromName(item.file_name)] ?? FILE_ICONS.document
                    const hasPath = !!item.file_path
                    return (
                      <div
                        key={item.id}
                        onClick={() => hasPath && handleViewFile(item)}
                        style={{
                          padding: '10px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: hasPath ? 'pointer' : 'default',
                        }}
                        onMouseEnter={(e) => { if (hasPath) e.currentTarget.style.background = '#FAFAFA' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        {/* File type badge */}
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: ft.bg,
                          color: ft.color,
                          letterSpacing: '0.03em',
                          flexShrink: 0,
                        }}>
                          {ft.label}
                        </span>

                        {/* File name */}
                        <span style={{ fontSize: '13px', color: '#262626', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.file_name}
                        </span>

                        {/* Short date */}
                        <span style={{ fontSize: '12px', color: '#A3A3A3', flexShrink: 0 }}>
                          {shortDate(item.created_at)}
                        </span>
                      </div>
                    )
                  })}

                  {/* Missing evidence rows */}
                  {group.missing.map(m => (
                    <div
                      key={m.checkpointId}
                      style={{
                        margin: '4px 12px',
                        padding: '10px 14px',
                        background: '#FEF2F2',
                        border: '1px dashed #FECACA',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>!</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600 }}>
                          Missing:
                        </span>
                        {' '}
                        <span style={{ fontSize: '13px', color: '#B91C1C' }}>
                          {m.controlTitle} evidence
                        </span>
                        {m.status === 'overdue' && (
                          <span style={{
                            marginLeft: '6px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: '#DC2626',
                            color: '#fff',
                          }}>
                            overdue
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#A3A3A3', fontFamily: 'monospace', flexShrink: 0 }}>
                        {m.controlCode}
                      </span>
                    </div>
                  ))}

                  {/* Empty state within card */}
                  {group.items.length === 0 && group.missing.length === 0 && (
                    <div style={{ padding: '16px 18px', fontSize: '13px', color: '#A3A3A3', fontStyle: 'italic' }}>
                      No evidence for this standard
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state (no groups, not demo, not loading) */}
      {!loading && standardGroups.length === 0 && !isDemo && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px' }}>
          No evidence found for {formatPeriod(activePeriod)}. Upload evidence via checkpoint pages.
        </div>
      )}
    </div>
  )
}
