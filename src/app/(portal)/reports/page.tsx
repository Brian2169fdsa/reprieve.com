'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ── Period helpers ──

function getPeriodOptions(): { value: string; label: string }[] {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    opts.push({ value, label });
  }
  return opts;
}

function periodToRange(period: string): { start: string; end: string } {
  const [year, month] = period.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  return { start, end };
}

function shortMonth(period: string) {
  const d = new Date(period + '-15');
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Mock data fallbacks ──

const MOCK_TREND_DATA = [
  { period: '2025-09', label: 'Sep', overall: 72, checkpoint: 70, evidence: 68, policy: 80, capa: 65 },
  { period: '2025-10', label: 'Oct', overall: 75, checkpoint: 73, evidence: 72, policy: 80, capa: 70 },
  { period: '2025-11', label: 'Nov', overall: 78, checkpoint: 76, evidence: 75, policy: 82, capa: 74 },
  { period: '2025-12', label: 'Dec', overall: 81, checkpoint: 80, evidence: 78, policy: 84, capa: 78 },
  { period: '2026-01', label: 'Jan', overall: 83, checkpoint: 82, evidence: 80, policy: 85, capa: 82 },
  { period: '2026-02', label: 'Feb', overall: 84.5, checkpoint: 84, evidence: 82, policy: 86, capa: 85 },
];

const MOCK_STANDARD_DATA = [
  { standard: 'OIG', passed: 4, failed: 0, pending: 0, overdue: 0 },
  { standard: 'HIPAA', passed: 3, failed: 1, pending: 0, overdue: 0 },
  { standard: 'AHCCCS', passed: 5, failed: 0, pending: 1, overdue: 0 },
  { standard: 'Safety', passed: 2, failed: 1, pending: 0, overdue: 1 },
  { standard: 'HR', passed: 3, failed: 0, pending: 0, overdue: 0 },
  { standard: 'Ops', passed: 2, failed: 0, pending: 0, overdue: 0 },
];

const MOCK_FINDINGS_DATA = [
  { name: 'Critical', value: 1, color: '#DC2626' },
  { name: 'High', value: 3, color: '#EA580C' },
  { name: 'Medium', value: 5, color: '#D97706' },
  { name: 'Low', value: 2, color: '#A3A3A3' },
];

const MOCK_CAPA_DATA = [
  { status: 'Open', count: 2, color: '#3BA7C9' },
  { status: 'In Progress', count: 3, color: '#D97706' },
  { status: 'Pending Verification', count: 1, color: '#9333EA' },
  { status: 'Closed', count: 8, color: '#16A34A' },
  { status: 'Overdue', count: 1, color: '#DC2626' },
];

// ── KPI Sparkline ──

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v) => ({ v }));
  return (
    <div style={{ width: 80, height: 32 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Custom tooltip ──

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}>
      <p style={{ fontWeight: 600, color: '#171717', margin: '0 0 6px' }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ margin: '2px 0', color: entry.color }}>
          {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%</strong>
        </p>
      ))}
    </div>
  );
}

// ── PDF Builders ──

async function buildComplianceReportPDF(period: string, orgName: string, data: {
  checkpoints: { title: string; standard: string; status: string; due_date: string }[];
  score: number | null;
}) {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer');

  const styles = StyleSheet.create({
    page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', color: '#262626' },
    header: { marginBottom: 24, borderBottom: '2 solid #3BA7C9', paddingBottom: 12 },
    orgName: { fontSize: 9, color: '#737373', marginBottom: 4 },
    title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#171717', marginBottom: 2 },
    subtitle: { fontSize: 11, color: '#525252' },
    section: { marginTop: 20 },
    sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#171717', marginBottom: 8, borderBottom: '1 solid #E8E8E8', paddingBottom: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1 solid #F5F5F5' },
    label: { fontSize: 10, color: '#525252', flex: 3 },
    value: { fontSize: 10, color: '#171717', flex: 1, textAlign: 'right' },
    stat: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    statBox: { flex: 1, padding: 12, backgroundColor: '#F5F5F5', borderRadius: 6 },
    statNum: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#171717' },
    statLbl: { fontSize: 9, color: '#737373', marginTop: 2 },
    footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: '#A3A3A3' },
  });

  const periodLabel = new Date(period + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const passed = data.checkpoints.filter((c) => c.status === 'passed').length;
  const failed = data.checkpoints.filter((c) => c.status === 'failed').length;
  const overdue = data.checkpoints.filter((c) => c.status === 'overdue').length;
  const total = data.checkpoints.length;

  const byStandard: Record<string, { pass: number; fail: number; overdue: number; total: number }> = {};
  data.checkpoints.forEach((c) => {
    const std = c.standard ?? 'Other';
    if (!byStandard[std]) byStandard[std] = { pass: 0, fail: 0, overdue: 0, total: 0 };
    byStandard[std].total++;
    if (c.status === 'passed') byStandard[std].pass++;
    if (c.status === 'failed') byStandard[std].fail++;
    if (c.status === 'overdue') byStandard[std].overdue++;
  });

  const overdueItems = data.checkpoints.filter((c) => c.status === 'overdue' || c.status === 'failed');

  const doc = React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.orgName }, orgName.toUpperCase()),
        React.createElement(Text, { style: styles.title }, 'Monthly Compliance Report'),
        React.createElement(Text, { style: styles.subtitle }, `Period: ${periodLabel}  ·  Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
      ),
      React.createElement(View, { style: styles.stat },
        React.createElement(View, { style: styles.statBox },
          React.createElement(Text, { style: styles.statNum }, String(total)),
          React.createElement(Text, { style: styles.statLbl }, 'Total Checkpoints')
        ),
        React.createElement(View, { style: { ...styles.statBox, backgroundColor: '#F0FDF4' } },
          React.createElement(Text, { style: { ...styles.statNum, color: '#16A34A' } }, String(passed)),
          React.createElement(Text, { style: styles.statLbl }, 'Passed')
        ),
        React.createElement(View, { style: { ...styles.statBox, backgroundColor: '#FEF2F2' } },
          React.createElement(Text, { style: { ...styles.statNum, color: '#DC2626' } }, String(failed + overdue)),
          React.createElement(Text, { style: styles.statLbl }, 'Failed / Overdue')
        ),
        React.createElement(View, { style: { ...styles.statBox, backgroundColor: '#F0F9FC' } },
          React.createElement(Text, { style: { ...styles.statNum, color: '#2A8BA8' } }, data.score !== null ? `${data.score.toFixed(0)}%` : 'N/A'),
          React.createElement(Text, { style: styles.statLbl }, 'Audit Readiness Score')
        )
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Checkpoint Results by Standard'),
        ...Object.entries(byStandard).map(([std, counts]) =>
          React.createElement(View, { style: styles.row, key: std },
            React.createElement(Text, { style: styles.label }, std),
            React.createElement(Text, { style: styles.value }, `${counts.pass} passed  ${counts.fail + counts.overdue} failed  (${counts.total} total)`)
          )
        )
      ),
      overdueItems.length > 0 ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Items Requiring Attention'),
        ...overdueItems.slice(0, 20).map((c, i) =>
          React.createElement(View, { style: styles.row, key: i },
            React.createElement(Text, { style: styles.label }, c.title),
            React.createElement(Text, { style: { ...styles.value, color: '#DC2626' } }, c.status)
          )
        )
      ) : null,
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, null, `REPrieve.ai — ${orgName}`),
        React.createElement(Text, null, `Confidential — ${periodLabel}`)
      )
    )
  );

  return pdf(doc).toBlob();
}

async function buildQMSummaryPDF(period: string, orgName: string, data: {
  meeting: { executive_summary?: string; audit_readiness_score?: number; meeting_date?: string } | null;
  findings: { title: string; severity: string; standard?: string }[];
  capas: { title: string; status: string; due_date?: string }[];
  score: number | null;
}) {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer');

  const styles = StyleSheet.create({
    page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', color: '#262626' },
    header: { marginBottom: 24, borderBottom: '2 solid #3BA7C9', paddingBottom: 12 },
    orgName: { fontSize: 9, color: '#737373', marginBottom: 4 },
    title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#171717', marginBottom: 2 },
    subtitle: { fontSize: 11, color: '#525252' },
    section: { marginTop: 20 },
    sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#171717', marginBottom: 8, borderBottom: '1 solid #E8E8E8', paddingBottom: 4 },
    bodyText: { fontSize: 11, lineHeight: 1.6, color: '#404040' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1 solid #F5F5F5' },
    label: { fontSize: 10, color: '#525252', flex: 3 },
    value: { fontSize: 10, color: '#171717', flex: 1, textAlign: 'right' },
    scoreBox: { padding: 20, backgroundColor: '#F0F9FC', borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    scoreNum: { fontSize: 48, fontFamily: 'Helvetica-Bold', color: '#2A8BA8' },
    scoreLbl: { fontSize: 12, color: '#525252', marginTop: 4 },
    footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: '#A3A3A3' },
  });

  const periodLabel = new Date(period + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const score = data.meeting?.audit_readiness_score ?? data.score;
  const openCapas = data.capas.filter((c) => c.status !== 'closed');

  const doc = React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.orgName }, orgName.toUpperCase()),
        React.createElement(Text, { style: styles.title }, 'QM Executive Summary'),
        React.createElement(Text, { style: styles.subtitle }, `Period: ${periodLabel}  ·  Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
      ),
      React.createElement(View, { style: styles.scoreBox },
        React.createElement(Text, { style: styles.scoreNum }, score !== null && score !== undefined ? `${score.toFixed(0)}%` : 'N/A'),
        React.createElement(Text, { style: styles.scoreLbl }, 'Audit Readiness Score')
      ),
      data.meeting?.executive_summary ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Executive Summary'),
        React.createElement(Text, { style: styles.bodyText }, data.meeting.executive_summary)
      ) : null,
      data.findings.length > 0 ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, `Key Findings (${data.findings.length})`),
        ...data.findings.slice(0, 15).map((f, i) =>
          React.createElement(View, { style: styles.row, key: i },
            React.createElement(Text, { style: styles.label }, f.title),
            React.createElement(Text, { style: styles.value }, `${f.severity}${f.standard ? ` · ${f.standard}` : ''}`)
          )
        )
      ) : null,
      openCapas.length > 0 ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, `Open CAPAs (${openCapas.length})`),
        ...openCapas.slice(0, 15).map((c, i) =>
          React.createElement(View, { style: styles.row, key: i },
            React.createElement(Text, { style: styles.label }, c.title),
            React.createElement(Text, { style: styles.value }, `${c.status}${c.due_date ? ` · due ${new Date(c.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`)
          )
        )
      ) : null,
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, null, `REPrieve.ai — ${orgName}`),
        React.createElement(Text, null, `Board Confidential — ${periodLabel}`)
      )
    )
  );

  return pdf(doc).toBlob();
}

async function buildAuditBinderPDF(period: string, orgName: string, data: {
  evidence: { file_name: string; file_type?: string; file_size_bytes?: number; tags: Record<string, unknown>; created_at: string; uploader?: string }[];
  checkpoints: { title: string; standard: string; status: string; attestation?: string }[];
}) {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer');

  const styles = StyleSheet.create({
    page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', color: '#262626' },
    header: { marginBottom: 24, borderBottom: '2 solid #3BA7C9', paddingBottom: 12 },
    orgName: { fontSize: 9, color: '#737373', marginBottom: 4 },
    title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#171717', marginBottom: 2 },
    subtitle: { fontSize: 11, color: '#525252' },
    section: { marginTop: 20 },
    sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#171717', marginBottom: 8, borderBottom: '1 solid #E8E8E8', paddingBottom: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1 solid #F5F5F5' },
    label: { fontSize: 10, color: '#525252', flex: 3 },
    value: { fontSize: 10, color: '#171717', flex: 1, textAlign: 'right' },
    noteBox: { padding: 12, backgroundColor: '#FFFBEB', borderRadius: 6, marginTop: 20 },
    noteText: { fontSize: 10, color: '#92400E' },
    footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: '#A3A3A3' },
  });

  const periodLabel = new Date(period + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const byStandard: Record<string, typeof data.evidence> = {};
  data.evidence.forEach((e) => {
    const std = (e.tags?.standard as string) ?? 'Uncategorized';
    if (!byStandard[std]) byStandard[std] = [];
    byStandard[std].push(e);
  });

  const doc = React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.orgName }, orgName.toUpperCase()),
        React.createElement(Text, { style: styles.title }, 'Audit Binder — Evidence Index'),
        React.createElement(Text, { style: styles.subtitle }, `Period: ${periodLabel}  ·  Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Summary'),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Total evidence files'),
          React.createElement(Text, { style: styles.value }, String(data.evidence.length))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Checkpoints with attestation'),
          React.createElement(Text, { style: styles.value }, String(data.checkpoints.filter((c) => c.attestation).length))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Standards covered'),
          React.createElement(Text, { style: styles.value }, String(Object.keys(byStandard).length))
        )
      ),
      ...Object.entries(byStandard).map(([std, files]) =>
        React.createElement(View, { style: styles.section, key: std },
          React.createElement(Text, { style: styles.sectionTitle }, `${std} (${files.length} files)`),
          ...files.slice(0, 30).map((f, i) =>
            React.createElement(View, { style: styles.row, key: i },
              React.createElement(Text, { style: styles.label }, f.file_name),
              React.createElement(Text, { style: styles.value },
                `${f.file_type ?? '—'}  ${f.file_size_bytes ? `${(f.file_size_bytes / 1024).toFixed(0)} KB` : ''}`
              )
            )
          )
        )
      ),
      React.createElement(View, { style: styles.noteBox },
        React.createElement(Text, { style: styles.noteText }, 'Note: This index lists evidence files stored in the REPrieve.ai system. Actual files are available for download from the Evidence Library.')
      ),
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, null, `REPrieve.ai — ${orgName}`),
        React.createElement(Text, null, `Audit Binder — ${periodLabel}`)
      )
    )
  );

  return pdf(doc).toBlob();
}

// ── Main component ──

export default function ReportsPage() {
  const PERIOD_OPTIONS = getPeriodOptions();
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].value);
  const [periodRange, setPeriodRange] = useState<'1' | '3' | '6' | 'ytd'>('6');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('Your Organization');
  const [generating, setGenerating] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSections, setCustomSections] = useState<Record<string, boolean>>({
    checkpoints: true, evidence: true, policies: false, capas: false, findings: false, scores: true,
  });

  // Analytics data
  const [trendData, setTrendData] = useState(MOCK_TREND_DATA);
  const [standardData, setStandardData] = useState(MOCK_STANDARD_DATA);
  const [findingsData, setFindingsData] = useState(MOCK_FINDINGS_DATA);
  const [capaData, setCapaData] = useState(MOCK_CAPA_DATA);
  const [kpi, setKpi] = useState({
    auditReadiness: 84.5,
    auditTrend: 1.5,
    checkpointCompletion: '19/22',
    checkpointPct: 86,
    evidenceCoverage: 82,
    capaClosureRate: 85,
    sparkAudit: [72, 75, 78, 81, 83, 84.5],
    sparkCheckpoint: [70, 73, 76, 80, 82, 84],
    sparkEvidence: [68, 72, 75, 78, 80, 82],
    sparkCapa: [65, 70, 74, 78, 82, 85],
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    const stored = localStorage.getItem('reprieve_report_timestamps');
    if (stored) {
      try { setLastGenerated(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('org_members')
        .select('org_id, org:organizations!org_id(name)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
        .then(({ data }) => {
          if (data) {
            setOrgId(data.org_id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setOrgName((data as any).org?.name ?? 'Your Organization');
          }
        });
    });
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();
    const { start, end } = periodToRange(period);

    // Fetch trend data (last 6 periods)
    const { data: scoreHistory } = await supabase
      .from('audit_readiness_scores')
      .select('period, overall_score, checkpoint_score, evidence_score, policy_score, capa_score')
      .eq('org_id', orgId)
      .order('period', { ascending: true })
      .limit(12);

    if (scoreHistory && scoreHistory.length > 0) {
      const mapped = scoreHistory.slice(-6).map((s) => ({
        period: s.period,
        label: shortMonth(s.period),
        overall: s.overall_score ?? 0,
        checkpoint: s.checkpoint_score ?? 0,
        evidence: s.evidence_score ?? 0,
        policy: s.policy_score ?? 0,
        capa: s.capa_score ?? 0,
      }));
      setTrendData(mapped);

      const latest = scoreHistory[scoreHistory.length - 1];
      const prev = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length - 2] : null;
      setKpi((k) => ({
        ...k,
        auditReadiness: latest.overall_score ?? k.auditReadiness,
        auditTrend: prev ? (latest.overall_score ?? 0) - (prev.overall_score ?? 0) : k.auditTrend,
        sparkAudit: scoreHistory.slice(-6).map((s) => s.overall_score ?? 0),
        sparkCheckpoint: scoreHistory.slice(-6).map((s) => s.checkpoint_score ?? 0),
        sparkEvidence: scoreHistory.slice(-6).map((s) => s.evidence_score ?? 0),
        sparkCapa: scoreHistory.slice(-6).map((s) => s.capa_score ?? 0),
        evidenceCoverage: latest.evidence_score ?? k.evidenceCoverage,
        capaClosureRate: latest.capa_score ?? k.capaClosureRate,
      }));
    }

    // Fetch checkpoints for period by standard
    const { data: checkpointData } = await supabase
      .from('checkpoints')
      .select('status, control:controls!control_id(standard)')
      .eq('org_id', orgId)
      .gte('due_date', start)
      .lte('due_date', end);

    if (checkpointData && checkpointData.length > 0) {
      const byStd: Record<string, { passed: number; failed: number; pending: number; overdue: number }> = {};
      let totalCompleted = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checkpointData.forEach((c: any) => {
        const std = c.control?.standard ?? 'Other';
        if (!byStd[std]) byStd[std] = { passed: 0, failed: 0, pending: 0, overdue: 0 };
        const s = c.status as string;
        if (s === 'passed') { byStd[std].passed++; totalCompleted++; }
        else if (s === 'failed') byStd[std].failed++;
        else if (s === 'overdue') byStd[std].overdue++;
        else byStd[std].pending++;
      });
      setStandardData(Object.entries(byStd).map(([standard, counts]) => ({ standard, ...counts })));
      setKpi((k) => ({
        ...k,
        checkpointCompletion: `${totalCompleted}/${checkpointData.length}`,
        checkpointPct: checkpointData.length > 0 ? Math.round((totalCompleted / checkpointData.length) * 100) : 0,
      }));
    }

    // Fetch findings
    const { data: findingRows } = await supabase
      .from('findings')
      .select('severity')
      .eq('org_id', orgId);

    if (findingRows && findingRows.length > 0) {
      const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
      findingRows.forEach((f) => { counts[f.severity] = (counts[f.severity] || 0) + 1; });
      setFindingsData([
        { name: 'Critical', value: counts.critical, color: '#DC2626' },
        { name: 'High', value: counts.high, color: '#EA580C' },
        { name: 'Medium', value: counts.medium, color: '#D97706' },
        { name: 'Low', value: counts.low, color: '#A3A3A3' },
      ]);
    }

    // Fetch CAPAs
    const { data: capaRows } = await supabase
      .from('capas')
      .select('status')
      .eq('org_id', orgId);

    if (capaRows && capaRows.length > 0) {
      const counts: Record<string, number> = {};
      capaRows.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
      setCapaData([
        { status: 'Open', count: counts['open'] ?? 0, color: '#3BA7C9' },
        { status: 'In Progress', count: counts['in_progress'] ?? 0, color: '#D97706' },
        { status: 'Pending Verification', count: counts['pending_verification'] ?? 0, color: '#9333EA' },
        { status: 'Closed', count: counts['closed'] ?? 0, color: '#16A34A' },
        { status: 'Overdue', count: counts['overdue'] ?? 0, color: '#DC2626' },
      ]);
    }
  }, [orgId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  function bumpLastGenerated(reportId: string) {
    const ts = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setLastGenerated((prev) => {
      const next = { ...prev, [`${reportId}-${period}`]: ts };
      localStorage.setItem('reprieve_report_timestamps', JSON.stringify(next));
      return next;
    });
  }

  // ── Report generation handlers ──

  async function generateComplianceReport() {
    if (!orgId) { showToast('Not signed in to an organization'); return; }
    setGenerating('compliance');
    try {
      const supabase = createClient();
      const { start, end } = periodToRange(period);
      const { data: checkpointData } = await supabase
        .from('checkpoints')
        .select('id, status, attestation, due_date, control:controls!control_id(title, standard)')
        .eq('org_id', orgId)
        .gte('due_date', start)
        .lte('due_date', end);
      const { data: scoreData } = await supabase
        .from('audit_readiness_scores')
        .select('overall_score')
        .eq('org_id', orgId)
        .eq('period', period)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkpoints = (checkpointData ?? []).map((c: any) => ({
        title: c.control?.title ?? 'Unknown',
        standard: c.control?.standard ?? 'Other',
        status: c.status ?? 'pending',
        due_date: c.due_date ?? '',
      }));
      const blob = await buildComplianceReportPDF(period, orgName, { checkpoints, score: scoreData?.overall_score ?? null });
      triggerDownload(blob, `compliance-report-${period}.pdf`);
      bumpLastGenerated('compliance');
      showToast('Monthly Compliance Report downloaded');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  }

  async function generateQMSummary() {
    if (!orgId) { showToast('Not signed in to an organization'); return; }
    setGenerating('qm');
    try {
      const supabase = createClient();
      const { data: meetingData } = await supabase.from('qm_meetings').select('executive_summary, audit_readiness_score, meeting_date').eq('org_id', orgId).eq('period', period).order('created_at', { ascending: false }).limit(1).single();
      const { data: findingsRows } = await supabase.from('findings').select('title, severity, standard').eq('org_id', orgId);
      const { data: capaRows } = await supabase.from('capas').select('title, status, due_date').eq('org_id', orgId).neq('status', 'closed');
      const { data: scoreData } = await supabase.from('audit_readiness_scores').select('overall_score').eq('org_id', orgId).eq('period', period).order('calculated_at', { ascending: false }).limit(1).single();
      const blob = await buildQMSummaryPDF(period, orgName, {
        meeting: meetingData ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        findings: (findingsRows ?? []) as any[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        capas: (capaRows ?? []) as any[],
        score: scoreData?.overall_score ?? null,
      });
      triggerDownload(blob, `qm-executive-summary-${period}.pdf`);
      bumpLastGenerated('qm');
      showToast('QM Executive Summary downloaded');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  }

  async function generateAuditBinder() {
    if (!orgId) { showToast('Not signed in to an organization'); return; }
    setGenerating('binder');
    try {
      const supabase = createClient();
      const { start, end } = periodToRange(period);
      const { data: evidenceData } = await supabase.from('evidence').select('file_name, file_type, file_size_bytes, tags, created_at, uploader:profiles!uploaded_by(full_name)').eq('org_id', orgId).gte('created_at', start).lte('created_at', end + 'T23:59:59');
      const { data: checkpointData } = await supabase.from('checkpoints').select('status, attestation, control:controls!control_id(title, standard)').eq('org_id', orgId).gte('due_date', start).lte('due_date', end);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evidence = (evidenceData ?? []).map((e: any) => ({ file_name: e.file_name, file_type: e.file_type, file_size_bytes: e.file_size_bytes, tags: e.tags ?? {}, created_at: e.created_at, uploader: e.uploader?.full_name }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkpoints = (checkpointData ?? []).map((c: any) => ({ title: c.control?.title ?? 'Unknown', standard: c.control?.standard ?? 'Other', status: c.status ?? 'pending', attestation: c.attestation }));
      const blob = await buildAuditBinderPDF(period, orgName, { evidence, checkpoints });
      triggerDownload(blob, `audit-binder-${period}.pdf`);
      bumpLastGenerated('binder');
      showToast('Audit Binder index downloaded');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  }

  async function generateCustomReport() {
    const selectedSections = Object.entries(customSections).filter(([, v]) => v).map(([k]) => k);
    if (selectedSections.length === 0) { showToast('Select at least one section'); return; }
    // Reuse the compliance report generator with the selected period for now
    await generateComplianceReport();
  }

  const reports = [
    { id: 'compliance', title: 'Monthly Compliance Report', description: 'Checkpoint completion rates, pass/fail breakdown by standard, evidence coverage, and overdue items.', icon: '📋', format: 'PDF', sections: ['Checkpoint Summary', 'By Standard Breakdown', 'Failed / Overdue Items', 'Audit Readiness Score'], onGenerate: generateComplianceReport },
    { id: 'qm', title: 'QM Executive Summary', description: 'Board-ready executive summary with audit readiness score, key findings, open CAPAs for QM meeting.', icon: '📊', format: 'PDF', sections: ['Audit Readiness Score', 'Executive Summary', 'Key Findings', 'Open CAPAs'], onGenerate: generateQMSummary },
    { id: 'binder', title: 'Audit Binder Export', description: 'Evidence index with all files for the period, grouped by standard. Cover page for the full audit package.', icon: '🗂', format: 'PDF index', sections: ['Evidence by Standard', 'Checkpoint Attestations', 'File Metadata', 'Coverage Summary'], onGenerate: generateAuditBinder },
  ];

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;
  const findingsTotal = findingsData.reduce((sum, d) => sum + d.value, 0);

  // ── Render ──

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', background: '#171717', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: '#171717', margin: '0 0 4px' }}>
            Reports & Analytics
          </h1>
          <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
            Compliance analytics, trends, and downloadable reports
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: '#525252' }}>Period:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #D4D4D4', borderRadius: '6px', fontSize: '13px', background: '#fff', color: '#262626', cursor: 'pointer' }}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ═══════════════════ ANALYTICS DASHBOARD ═══════════════════ */}

      {/* Row 1: KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'Audit Readiness', value: `${kpi.auditReadiness.toFixed(1)}%`, trend: kpi.auditTrend, spark: kpi.sparkAudit, color: '#2A8BA8' },
          { label: 'Checkpoint Completion', value: kpi.checkpointCompletion, trend: null, sub: `${kpi.checkpointPct}%`, spark: kpi.sparkCheckpoint, color: '#16A34A' },
          { label: 'Evidence Coverage', value: `${kpi.evidenceCoverage.toFixed(0)}%`, trend: null, spark: kpi.sparkEvidence, color: '#D97706' },
          { label: 'CAPA Closure Rate', value: `${kpi.capaClosureRate.toFixed(0)}%`, trend: null, spark: kpi.sparkCapa, color: '#9333EA' },
        ].map((card) => (
          <div key={card.label} style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                {card.label}
              </p>
              <Sparkline data={card.spark} color={card.color} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#171717', lineHeight: 1 }}>{card.value}</span>
              {card.trend !== null && card.trend !== undefined && (
                <span style={{ fontSize: '13px', fontWeight: 600, color: card.trend >= 0 ? '#16A34A' : '#DC2626' }}>
                  {card.trend >= 0 ? '↑' : '↓'} {Math.abs(card.trend).toFixed(1)}%
                </span>
              )}
              {card.sub && (
                <span style={{ fontSize: '13px', color: '#A3A3A3' }}>{card.sub}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Compliance Trend + Checkpoints by Standard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Compliance Trend */}
        <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#171717', margin: 0 }}>Compliance Trend</h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['1', '3', '6'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setPeriodRange(r)}
                  style={{
                    padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: periodRange === r ? '#E8F6FA' : '#F5F5F5',
                    color: periodRange === r ? '#2A8BA8' : '#737373',
                  }}
                >
                  {r}M
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData.slice(-(parseInt(periodRange) || 6))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#737373' }} />
              <YAxis tick={{ fontSize: 12, fill: '#737373' }} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="overall" name="Overall" stroke="#2A8BA8" fill="#E8F6FA" strokeWidth={2} />
              <Area type="monotone" dataKey="checkpoint" name="Checkpoints" stroke="#16A34A" fill="#F0FDF4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="evidence" name="Evidence" stroke="#D97706" fill="#FFFBEB" strokeWidth={1.5} />
              <Area type="monotone" dataKey="policy" name="Policy" stroke="#9333EA" fill="#F5F3FF" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Checkpoints by Standard */}
        <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#171717', margin: '0 0 16px' }}>Checkpoints by Standard</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={standardData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis dataKey="standard" tick={{ fontSize: 11, fill: '#737373' }} />
              <YAxis tick={{ fontSize: 12, fill: '#737373' }} allowDecimals={false} />
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="passed" name="Passed" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" name="Failed" stackId="a" fill="#DC2626" />
              <Bar dataKey="pending" name="Pending" stackId="a" fill="#D97706" />
              <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#EA580C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Findings by Severity + CAPA Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '36px' }}>
        {/* Findings Donut */}
        <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#171717', margin: '0 0 16px' }}>Findings by Severity</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={findingsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {findingsData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#171717', lineHeight: 1 }}>{findingsTotal}</div>
                <div style={{ fontSize: '10px', color: '#A3A3A3', marginTop: 2 }}>Total</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {findingsData.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#525252' }}>{d.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#171717' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CAPA Status */}
        <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#171717', margin: '0 0 16px' }}>CAPA Status Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {capaData.map((d) => {
              const maxCount = Math.max(...capaData.map((c) => c.count), 1);
              const pct = (d.count / maxCount) * 100;
              return (
                <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#525252', width: 140, flexShrink: 0, textAlign: 'right' }}>{d.status}</span>
                  <div style={{ flex: 1, background: '#F5F5F5', borderRadius: '4px', height: 24, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: '4px', transition: 'width 0.4s ease', minWidth: d.count > 0 ? 8 : 0 }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#171717', width: 28, textAlign: 'right' }}>{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════ DOWNLOADABLE REPORTS ═══════════════════ */}

      <div style={{ marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '20px', fontWeight: 600, color: '#171717', margin: '0 0 4px' }}>
          Downloadable Reports
        </h2>
        <p style={{ fontSize: '13px', color: '#737373', margin: 0 }}>
          Generate and download compliance reports and audit binders for {periodLabel}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {reports.map((report) => {
          const isGen = generating === report.id;
          const lastKey = `${report.id}-${period}`;
          const lastTs = lastGenerated[lastKey];
          return (
            <div
              key={report.id}
              style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', gap: '20px', alignItems: 'flex-start' }}
            >
              <span style={{ fontSize: '36px', lineHeight: 1, flexShrink: 0 }}>{report.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#171717', margin: '0 0 2px' }}>{report.title}</h3>
                    <span style={{ fontSize: '12px', color: '#A3A3A3' }}>Period: {periodLabel} · Format: {report.format}</span>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#525252', margin: '0 0 12px', lineHeight: '1.6' }}>{report.description}</p>
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#A3A3A3', margin: '0 0 6px' }}>Includes</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {report.sections.map((sec) => (
                      <span key={sec} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: '#F5F5F5', color: '#525252' }}>{sec}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#A3A3A3' }}>
                    {lastTs ? `Last generated: ${lastTs}` : 'Not yet generated for this period'}
                  </span>
                  <button
                    onClick={report.onGenerate}
                    disabled={isGen || !!generating}
                    style={{
                      padding: '7px 20px',
                      background: isGen ? '#E8E8E8' : '#3BA7C9',
                      color: isGen ? '#737373' : '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: isGen || !!generating ? 'wait' : 'pointer',
                      opacity: !isGen && !!generating ? 0.6 : 1,
                      transition: 'background 0.15s',
                    }}
                  >
                    {isGen ? 'Generating PDF…' : 'Generate & Download'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════ CUSTOM REPORT BUILDER ═══════════════════ */}

      <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <button
          onClick={() => setCustomOpen(!customOpen)}
          style={{
            width: '100%', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#171717',
          }}
        >
          <span>Build Custom Report</span>
          <span style={{ fontSize: '18px', color: '#A3A3A3', transform: customOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
            ▾
          </span>
        </button>

        {customOpen && (
          <div style={{ padding: '0 24px 24px', borderTop: '1px solid #F5F5F5' }}>
            <p style={{ fontSize: '13px', color: '#737373', margin: '16px 0 12px' }}>
              Select sections to include in your custom report:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { key: 'checkpoints', label: 'Checkpoints' },
                { key: 'evidence', label: 'Evidence' },
                { key: 'policies', label: 'Policies' },
                { key: 'capas', label: 'CAPAs' },
                { key: 'findings', label: 'Findings' },
                { key: 'scores', label: 'Audit Scores' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                    border: `1px solid ${customSections[key] ? '#3BA7C9' : '#E8E8E8'}`,
                    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                    background: customSections[key] ? '#F0F9FC' : '#fff',
                    color: customSections[key] ? '#2A8BA8' : '#525252',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={customSections[key]}
                    onChange={(e) => setCustomSections((prev) => ({ ...prev, [key]: e.target.checked }))}
                    style={{ accentColor: '#3BA7C9' }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <button
              onClick={generateCustomReport}
              disabled={!!generating}
              style={{
                padding: '8px 24px', background: '#2A8BA8', color: '#fff', border: 'none', borderRadius: '6px',
                fontSize: '13px', fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.6 : 1,
              }}
            >
              {generating === 'compliance' ? 'Generating…' : 'Generate Custom Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
