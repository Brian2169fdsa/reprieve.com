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
}

interface StandardGroup {
  standard: string
  items: EvidenceRow[]
  missing: MissingEvidence[]
}

// ── Constants ────────────────────────────────────────────

const STANDARD_COLORS: Record<string, { accent: string; bg: string; text: string }> = {
  OIG:        { accent: '#3BA7C9', bg: '#E8F6FA', text: '#0E7490' },
  HIPAA:      { accent: '#7C3AED', bg: '#F5F3FF', text: '#6D28D9' },
  AHCCCS:     { accent: '#16A34A', bg: '#F0FDF4', text: '#15803D' },
  Safety:     { accent: '#D97706', bg: '#FFFBEB', text: '#B45309' },
  Operations: { accent: '#737373', bg: '#F5F5F5', text: '#525252' },
  HR:         { accent: '#DB2777', bg: '#FDF4FF', text: '#9333EA' },
  TJC:        { accent: '#92400E', bg: '#FFF7ED', text: '#92400E' },
  CARF:       { accent: '#4338CA', bg: '#EEF2FF', text: '#4338CA' },
  Internal:   { accent: '#525252', bg: '#F5F5F5', text: '#525252' },
}

const FILE_ICONS: Record<string, { label: string; bg: string; color: string }> = {
  pdf:      { label: 'PDF', bg: '#FEF2F2', color: '#DC2626' },
  image:    { label: 'IMG', bg: '#EFF6FF', color: '#2563EB' },
  video:    { label: 'VID', bg: '#F5F3FF', color: '#7C3AED' },
  document: { label: 'DOC', bg: '#F0FDF4', color: '#16A34A' },
}

// ── Mock seed data ───────────────────────────────────────

const MOCK_EVIDENCE: Array<{
  file_name: string
  file_type: string
  file_size_bytes: number
  standard: string
  controlCode: string
  controlTitle: string
  period: string
  present: boolean
}> = [
  { file_name: 'OIG-SCR-001_Feb2026_Results.pdf', file_type: 'pdf', file_size_bytes: 245000, standard: 'OIG', controlCode: 'OIG-SCR-001', controlTitle: 'Monthly Exclusion Screening', period: '2026-02', present: true },
  { file_name: 'HIPAA-ACCESS-001_Feb2026_Log.pdf', file_type: 'pdf', file_size_bytes: 189000, standard: 'HIPAA', controlCode: 'HIPAA-ACCESS-001', controlTitle: 'Access Log Review', period: '2026-02', present: true },
  { file_name: 'AHCCCS-CA-001_ChartAudit_Feb2026.pdf', file_type: 'pdf', file_size_bytes: 412000, standard: 'AHCCCS', controlCode: 'AHCCCS-CA-001', controlTitle: 'Clinical Chart Audit', period: '2026-02', present: true },
  { file_name: 'SAFE-FD-001_FireDrill_Feb2026.pdf', file_type: 'pdf', file_size_bytes: 0, standard: 'Safety', controlCode: 'SAFE-FD-001', controlTitle: 'Fire Drill Documentation', period: '2026-02', present: false },
  { file_name: 'SAFE-MED-001_TempLog_Feb2026.jpg', file_type: 'image', file_size_bytes: 87000, standard: 'Safety', controlCode: 'SAFE-MED-001', controlTitle: 'Medication Temperature Log', period: '2026-02', present: true },
  { file_name: 'HR-CRED-001_CredVerification_Feb2026.pdf', file_type: 'pdf', file_size_bytes: 156000, standard: 'HR', controlCode: 'HR-CRED-001', controlTitle: 'Staff Credential Verification', period: '2026-02', present: true },
  { file_name: 'OPS-GRV-001_GrievanceLog_Feb2026.pdf', file_type: 'pdf', file_size_bytes: 98000, standard: 'Operations', controlCode: 'OPS-GRV-001', controlTitle: 'Client Grievance Log', period: '2026-02', present: true },
  { file_name: 'SAFE-INC-001_IncidentReport_Feb2026.pdf', file_type: 'pdf', file_size_bytes: 0, standard: 'Safety', controlCode: 'SAFE-INC-001', controlTitle: 'Incident Report Review', period: '2026-02', present: false },
]

// ── Helpers ──────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatPeriod(period: string): string {
  // "2026-02" → "Feb 2026", "2026-Q1" → "Q1 2026"
  if (period.includes('Q')) {
    const [year, q] = period.split('-')
    return `${q} ${year}`
  }
  const [year, month] = period.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
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
      .in('status', ['passed', 'failed', 'in_progress', 'pending'])

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
        })
      }
    }

    const rows = (evidence ?? []) as unknown as EvidenceRow[]

    // If no real data, use mock
    if (rows.length === 0 && missing.length === 0) {
      setEvidenceRows([])
      setMissingEvidence([])
      setActivePeriod('2026-02')
      setLoading(false)
      return
    }

    setEvidenceRows(rows)
    setMissingEvidence(missing)

    // Pick the most recent period as default
    const allPeriods = new Set<string>()
    rows.forEach(r => {
      if (r.checkpoint?.period) allPeriods.add(r.checkpoint.period)
    })
    missing.forEach(m => allPeriods.add(m.period))
    const sorted = Array.from(allPeriods).sort().reverse()
    setActivePeriod(sorted[0] ?? '2026-02')
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Compute available periods
  const periods = useMemo(() => {
    const set = new Set<string>()
    evidenceRows.forEach(r => {
      if (r.checkpoint?.period) set.add(r.checkpoint.period)
    })
    missingEvidence.forEach(m => set.add(m.period))
    // If no data, show mock periods
    if (set.size === 0) {
      return ['2026-02', '2026-01', '2025-Q4', '2025-Q3']
    }
    return Array.from(set).sort().reverse()
  }, [evidenceRows, missingEvidence])

  // Filter by active period and group by standard
  const standardGroups: StandardGroup[] = useMemo(() => {
    const useReal = evidenceRows.length > 0 || missingEvidence.length > 0

    if (!useReal) {
      // Build from mock data
      const groups = new Map<string, StandardGroup>()
      for (const mock of MOCK_EVIDENCE) {
        if (mock.period !== activePeriod) continue
        if (!groups.has(mock.standard)) {
          groups.set(mock.standard, { standard: mock.standard, items: [], missing: [] })
        }
        const g = groups.get(mock.standard)!
        if (mock.present) {
          g.items.push({
            id: mock.file_name,
            file_name: mock.file_name,
            file_path: '',
            file_type: mock.file_type,
            file_size_bytes: mock.file_size_bytes,
            created_at: new Date().toISOString(),
            uploaded_by: null,
            checkpoint_id: null,
            tags: {},
          })
        } else {
          g.missing.push({
            checkpointId: mock.controlCode,
            controlCode: mock.controlCode,
            controlTitle: mock.controlTitle,
            standard: mock.standard,
            period: mock.period,
          })
        }
      }
      return Array.from(groups.values()).sort((a, b) => a.standard.localeCompare(b.standard))
    }

    // Real data
    const groups = new Map<string, StandardGroup>()
    const periodItems = evidenceRows.filter(r => r.checkpoint?.period === activePeriod)
    for (const item of periodItems) {
      const std = item.checkpoint?.control?.standard ?? 'Other'
      if (!groups.has(std)) {
        groups.set(std, { standard: std, items: [], missing: [] })
      }
      groups.get(std)!.items.push(item)
    }
    const periodMissing = missingEvidence.filter(m => m.period === activePeriod)
    for (const m of periodMissing) {
      if (!groups.has(m.standard)) {
        groups.set(m.standard, { standard: m.standard, items: [], missing: [] })
      }
      groups.get(m.standard)!.missing.push(m)
    }
    return Array.from(groups.values()).sort((a, b) => a.standard.localeCompare(b.standard))
  }, [evidenceRows, missingEvidence, activePeriod])

  async function handleViewFile(item: EvidenceRow) {
    if (!orgId || !item.file_path) return
    const url = await getEvidenceUrl(orgId, item.file_path)
    if (url) window.open(url, '_blank')
  }

  async function handleExportBinder() {
    setExporting(true)
    try {
      // Collect all evidence items for the period
      const allItems = standardGroups.flatMap(g => g.items)
      const allMissing = standardGroups.flatMap(g => g.missing)

      // Build HTML manifest
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
          disabled={exporting}
          style={{
            padding: '9px 18px',
            background: exporting ? '#A3A3A3' : '#2A8BA8',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {exporting ? '⏳ Preparing binder…' : '📥 Export Binder'}
        </button>
      </div>

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

      {/* Loading */}
      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px' }}>
          Loading evidence…
        </div>
      )}

      {/* Standards Grid */}
      {!loading && standardGroups.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px' }}>
          No evidence found for {formatPeriod(activePeriod)}. Upload evidence via checkpoint pages.
        </div>
      )}

      {!loading && standardGroups.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
          {standardGroups.map(group => {
            const sc = STANDARD_COLORS[group.standard] ?? STANDARD_COLORS.Internal
            const totalCount = group.items.length + group.missing.length
            const presentCount = group.items.length
            const allPresent = group.missing.length === 0

            return (
              <div
                key={group.standard}
                style={{
                  background: '#fff',
                  border: '1px solid #E8E8E8',
                  borderRadius: '10px',
                  borderLeft: `3px solid ${sc.accent}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                }}
              >
                {/* Card header */}
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: sc.bg,
                      color: sc.text,
                    }}>
                      {group.standard}
                    </span>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: allPresent ? '#16A34A' : '#DC2626',
                      display: 'inline-block',
                      flexShrink: 0,
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', color: '#737373', fontWeight: 500 }}>
                    {presentCount} of {totalCount} items
                  </span>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: '#E8E8E8' }} />

                {/* Evidence items */}
                <div style={{ padding: '8px 0' }}>
                  {group.items.map(item => {
                    const ft = FILE_ICONS[item.file_type ?? getFileTypeFromName(item.file_name)] ?? FILE_ICONS.document
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleViewFile(item)}
                        style={{
                          padding: '10px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: item.file_path ? 'pointer' : 'default',
                        }}
                        onMouseEnter={(e) => { if (item.file_path) e.currentTarget.style.background = '#FAFAFA' }}
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

                        {/* File size */}
                        <span style={{ fontSize: '12px', color: '#A3A3A3', flexShrink: 0 }}>
                          {formatFileSize(item.file_size_bytes)}
                        </span>

                        {/* View button */}
                        {item.file_path && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewFile(item) }}
                            style={{
                              padding: '3px 8px',
                              background: '#F5F5F5',
                              border: '1px solid #E8E8E8',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#525252',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              flexShrink: 0,
                            }}
                          >
                            👁 View
                          </button>
                        )}
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
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600 }}>
                          Missing:
                        </span>
                        {' '}
                        <span style={{ fontSize: '13px', color: '#B91C1C' }}>
                          {m.controlTitle} evidence
                        </span>
                        <span style={{ fontSize: '11px', color: '#A3A3A3', marginLeft: '6px', fontFamily: 'monospace' }}>
                          {m.controlCode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
