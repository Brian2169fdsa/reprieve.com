'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { AuditReadinessScore } from '@/lib/types';

interface ExecutiveSummaryProps {
  period?: string;
  meetingId?: string;
  orgId?: string;
  overallScore?: number;
  executiveSummary?: string;
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatPeriodShort(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

function getPrevPeriods(currentPeriod: string, count: number): string[] {
  const [year, month] = currentPeriod.split('-').map(Number);
  if (!year || !month) return [];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 - (i + 1), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

export function ExecutiveSummary({
  period = '',
  meetingId,
  orgId,
  overallScore,
  executiveSummary,
}: ExecutiveSummaryProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [scoreData, setScoreData] = useState<AuditReadinessScore[]>([]);
  const [editedSummary, setEditedSummary] = useState(executiveSummary ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditedSummary(executiveSummary ?? '');
    setEditing(false);
  }, [executiveSummary, meetingId]);

  const fetchScores = useCallback(async () => {
    if (!orgId || !period) return;
    const prevPeriods = getPrevPeriods(period, 5);
    const allPeriods = [...prevPeriods.reverse(), period];
    const supabase = createClient();
    const { data } = await supabase
      .from('audit_readiness_scores')
      .select('*')
      .eq('org_id', orgId)
      .in('period', allPeriods)
      .order('period', { ascending: true });
    setScoreData(data ?? []);
  }, [orgId, period]);

  useEffect(() => { fetchScores(); }, [fetchScores]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function saveSummary() {
    if (!meetingId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('qm_meetings')
      .update({ executive_summary: editedSummary })
      .eq('id', meetingId);
    setSaving(false);
    setEditing(false);
    showToast('Executive summary saved');
  }

  const prevPeriods = period ? getPrevPeriods(period, 5).reverse() : [];
  const trendPeriods = period ? [...prevPeriods, period] : [];
  const scoreMap = Object.fromEntries(scoreData.map((s) => [s.period, s]));

  const currentScore = scoreMap[period];
  const prevScore = prevPeriods.length > 0 ? scoreMap[prevPeriods[prevPeriods.length - 1]] : undefined;

  const MOCK = { checkpoint: 87, evidence: 75, policy: 88, capa: 66 };
  const noData = scoreData.length === 0;

  const kpis = [
    { label: 'Checkpoint Completion', value: currentScore?.checkpoint_score ?? (noData ? MOCK.checkpoint : null), prev: prevScore?.checkpoint_score, color: '#16A34A', bg: '#F0FDF4' },
    { label: 'Evidence Coverage', value: currentScore?.evidence_score ?? (noData ? MOCK.evidence : null), prev: prevScore?.evidence_score, color: '#3BA7C9', bg: '#E8F6FA' },
    { label: 'Policy Compliance', value: currentScore?.policy_score ?? (noData ? MOCK.policy : null), prev: prevScore?.policy_score, color: '#D97706', bg: '#FFFBEB' },
    { label: 'CAPA Closure Rate', value: currentScore?.capa_score ?? (noData ? MOCK.capa : null), prev: prevScore?.capa_score, color: '#C05A2C', bg: '#FDF0EB' },
  ];

  const chartData = trendPeriods.map((p) => ({
    period: formatPeriodShort(p),
    score: scoreMap[p]?.overall_score ?? (p === period && overallScore != null ? overallScore : null),
  }));

  const hasRealData = chartData.some((d) => d.score != null);
  const displayChartData = hasRealData
    ? chartData
    : trendPeriods.map((p, i) => ({
        period: formatPeriodShort(p),
        score: [72, 74, 78, 80, 82, 84.5][i] ?? null,
      }));

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', background: 'var(--g900, #171717)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '28px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: 'var(--blue-light, #E8F6FA)', color: 'var(--blue-dark, #2A8BA8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                QM Orchestrator
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '20px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 2px' }}>
              {period ? formatPeriodLabel(period) : ''} QM Executive Summary
            </h2>
          </div>
          <button
            onClick={() => showToast('PDF generation coming soon')}
            style={{ padding: '7px 14px', background: '#fff', color: 'var(--g700, #404040)', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            Export as PDF
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--g100, #F5F5F5)', marginBottom: '20px' }} />

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {kpis.map(({ label, value, prev, color, bg }) => {
            const trend = value != null && prev != null
              ? value > prev ? 'up' : value < prev ? 'down' : 'flat'
              : null;
            return (
              <div key={label} style={{ padding: '16px 14px', background: bg, borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color }}>
                    {value != null ? `${Math.round(value)}%` : '—'}
                  </span>
                  {trend && (
                    <span style={{ fontSize: '16px', color: trend === 'up' ? '#16A34A' : trend === 'down' ? '#DC2626' : '#737373' }}>
                      {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--g500, #737373)', margin: 0, fontWeight: 500 }}>{label}</p>
              </div>
            );
          })}
        </div>

        {/* Editable narrative */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--g500, #737373)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Executive Narrative
            </h3>
            {meetingId && !editing && (
              <button
                onClick={() => setEditing(true)}
                style={{ padding: '4px 12px', background: '#fff', color: 'var(--blue, #3BA7C9)', border: '1px solid var(--blue-light, #E8F6FA)', borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div>
              <textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                rows={6}
                placeholder="Write executive summary narrative here..."
                style={{ width: '100%', padding: '12px 14px', fontSize: '14px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', color: 'var(--g700, #404040)', lineHeight: '1.7', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={saveSummary}
                  disabled={saving}
                  style={{ padding: '7px 18px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditedSummary(executiveSummary ?? ''); }}
                  style={{ padding: '7px 14px', background: '#fff', color: 'var(--g600, #525252)', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.75' }}>
              {editedSummary ? (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{editedSummary}</p>
              ) : (
                <p style={{ margin: 0, color: 'var(--g400, #A3A3A3)', fontStyle: 'italic' }}>
                  No executive summary written yet.{meetingId ? ' Click Edit to add one.' : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recharts trend chart */}
        <div style={{ background: 'var(--g50, #FAFAFA)', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '8px', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g500, #737373)', margin: '0 0 12px' }}>
            Audit Readiness Trend — Last 6 Periods
          </p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                <XAxis dataKey="period" fontSize={11} tick={{ fill: '#737373' }} />
                <YAxis domain={[0, 100]} fontSize={11} tick={{ fill: '#737373' }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  formatter={(value: number) => [`${Math.round(value)}%`, 'Audit Readiness']}
                  contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #E8E8E8' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3BA7C9"
                  strokeWidth={2}
                  dot={{ fill: '#3BA7C9', r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
