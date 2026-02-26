'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { CAPAStatus } from '@/lib/types';

interface CAPARow {
  id: string;
  code: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  status: CAPAStatus;
  dueDate: string;
  daysOpen: number;
  standard?: string;
}

const SEED_CAPAS: CAPARow[] = [
  {
    id: '1',
    code: 'CAPA-2026-003',
    title: 'Medication storage temperature logging gaps',
    severity: 'critical',
    owner: 'James Williams',
    status: 'overdue',
    dueDate: 'Feb 20, 2026',
    daysOpen: 15,
    standard: 'AHCCCS',
  },
  {
    id: '2',
    code: 'CAPA-2026-004',
    title: 'Telehealth consent form update needed',
    severity: 'medium',
    owner: 'Sarah Chen',
    status: 'in_progress',
    dueDate: 'Mar 10, 2026',
    daysOpen: 10,
    standard: 'HIPAA',
  },
  {
    id: '3',
    code: 'CAPA-2026-005',
    title: 'Fire drill documentation gap',
    severity: 'high',
    owner: 'Maria Rodriguez',
    status: 'open',
    dueDate: 'Mar 15, 2026',
    daysOpen: 5,
    standard: 'Safety',
  },
];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  open:                 { bg: '#EFF6FF',  color: '#1D4ED8', label: 'Open' },
  in_progress:          { bg: '#FFFBEB',  color: '#B45309', label: 'In Progress' },
  pending_verification: { bg: '#F5F3FF',  color: '#6D28D9', label: 'Pending Verification' },
  closed:               { bg: '#F0FDF4',  color: '#15803D', label: 'Closed' },
  overdue:              { bg: '#FEF2F2',  color: '#DC2626', label: 'Overdue' },
};

const SEV_STYLES: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#FEF2F2', color: '#DC2626' },
  high:     { bg: '#FDF0EB', color: '#C05A2C' },
  medium:   { bg: '#FFFBEB', color: '#B45309' },
  low:      { bg: '#F0FDF4', color: '#16A34A' },
};

const STD_COLORS: Record<string, { bg: string; color: string }> = {
  AHCCCS: { bg: '#F0FDF4', color: '#15803D' },
  HIPAA:  { bg: '#F5F3FF', color: '#6D28D9' },
  Safety: { bg: '#FFFBEB', color: '#B45309' },
  OIG:    { bg: '#EFF6FF', color: '#1D4ED8' },
};

const ALL_STATUSES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'closed', label: 'Closed' },
  { value: 'overdue', label: 'Overdue' },
];

const ALL_SEVERITIES = ['All Severities', 'Critical', 'High', 'Medium', 'Low'];

export default function CAPAPage() {
  const [capas, setCapas] = useState<CAPARow[]>(SEED_CAPAS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [ownerFilter, setOwnerFilter] = useState('All Owners');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCapas = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: memberData } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!memberData?.org_id) { setIsLoading(false); return; }

      const { data, error } = await supabase
        .from('capas')
        .select('*, owner:profiles!owner_id(full_name), finding:findings(title, severity, standard)')
        .eq('org_id', memberData.org_id)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: CAPARow[] = data.map((c, i) => ({
          id: c.id,
          code: `CAPA-${new Date(c.created_at).getFullYear()}-${String(i + 1).padStart(3, '0')}`,
          title: c.title,
          severity: (c.finding?.severity ?? 'medium') as CAPARow['severity'],
          owner: c.owner?.full_name ?? 'Unassigned',
          status: c.status as CAPAStatus,
          dueDate: c.due_date ? new Date(c.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date',
          daysOpen: Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000),
          standard: c.finding?.standard,
        }));
        setCapas(mapped);
      }
    } catch {
      // Use seed data
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCapas(); }, [fetchCapas]);

  const owners = ['All Owners', ...Array.from(new Set(capas.map((c) => c.owner)))];

  const filtered = capas.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (severityFilter !== 'All Severities' && c.severity !== severityFilter.toLowerCase()) return false;
    if (ownerFilter !== 'All Owners' && c.owner !== ownerFilter) return false;
    return true;
  });

  const counts = {
    open: capas.filter((c) => c.status === 'open').length,
    overdue: capas.filter((c) => c.status === 'overdue').length,
    in_progress: capas.filter((c) => c.status === 'in_progress').length,
  };

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 4px' }}>
            Corrective &amp; Preventive Actions
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', margin: 0 }}>
            Track findings to verified closure
          </p>
        </div>
        <button
          style={{
            padding: '8px 16px',
            background: 'var(--blue, #3BA7C9)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + New CAPA
        </button>
      </div>

      {/* Summary stat strip */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: capas.length, color: 'var(--g700)', bg: '#fff', border: 'var(--g200, #E8E8E8)' },
          { label: 'Open', value: counts.open, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
          { label: 'In Progress', value: counts.in_progress, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Overdue', value: counts.overdue, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{
            padding: '10px 18px',
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</span>
            <span style={{ fontSize: '12px', color: 'var(--g500, #737373)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { value: statusFilter, setter: setStatusFilter, options: ALL_STATUSES.map((s) => s.value), labels: ALL_STATUSES.map((s) => s.label) },
          { value: severityFilter, setter: setSeverityFilter, options: ALL_SEVERITIES, labels: ALL_SEVERITIES },
          { value: ownerFilter, setter: setOwnerFilter, options: owners, labels: owners },
        ].map((f, i) => (
          <select
            key={i}
            value={f.value}
            onChange={(e) => f.setter(e.target.value)}
            style={{
              padding: '7px 12px',
              border: '1px solid var(--g300, #D4D4D4)',
              borderRadius: '6px',
              fontSize: '13px',
              background: '#fff',
              cursor: 'pointer',
              color: 'var(--g800, #262626)',
            }}
          >
            {f.options.map((opt, j) => (
              <option key={opt} value={opt}>{f.labels[j]}</option>
            ))}
          </select>
        ))}
        {(statusFilter !== 'all' || severityFilter !== 'All Severities' || ownerFilter !== 'All Owners') && (
          <button
            onClick={() => { setStatusFilter('all'); setSeverityFilter('All Severities'); setOwnerFilter('All Owners'); }}
            style={{ padding: '7px 12px', background: 'none', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '6px', fontSize: '13px', color: 'var(--g500, #737373)', cursor: 'pointer' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* CAPA table */}
      {isLoading ? (
        <p style={{ color: 'var(--g400, #A3A3A3)', fontSize: '14px' }}>Loading…</p>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--g50, #FAFAFA)', borderBottom: '1px solid var(--g200, #E8E8E8)' }}>
                {['Code', 'Title', 'Severity', 'Owner', 'Status', 'Due Date', 'Days Open', ''].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--g500, #737373)',
                    textAlign: 'left',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--g400, #A3A3A3)' }}>
                    No CAPAs match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((capa, i) => {
                  const ss = STATUS_STYLES[capa.status];
                  const sv = SEV_STYLES[capa.severity];
                  const std = capa.standard ? (STD_COLORS[capa.standard] ?? { bg: '#F5F5F5', color: '#525252' }) : null;
                  const isOverdue = capa.status === 'overdue';
                  return (
                    <tr
                      key={capa.id}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--g50, #FAFAFA)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--g500, #737373)', whiteSpace: 'nowrap' }}>
                        {capa.code}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g900, #171717)', margin: 0 }}>{capa.title}</p>
                        {std && (
                          <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '11px', background: std.bg, color: std.color, marginTop: '3px', display: 'inline-block' }}>
                            {capa.standard}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: sv.bg, color: sv.color, textTransform: 'capitalize' }}>
                          {capa.severity}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--g600, #525252)', whiteSpace: 'nowrap' }}>
                        {capa.owner}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                          {ss.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: isOverdue ? 600 : 400, color: isOverdue ? 'var(--red, #DC2626)' : 'var(--g600, #525252)', whiteSpace: 'nowrap' }}>
                        {isOverdue && <span style={{ marginRight: '4px' }}>⚠</span>}
                        {capa.dueDate}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--g500, #737373)' }}>
                        {capa.daysOpen}d
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link
                          href={`/capa/${capa.id}`}
                          style={{
                            padding: '5px 14px',
                            background: 'var(--blue-bg, #F0F9FC)',
                            color: 'var(--blue-dark, #2A8BA8)',
                            border: '1px solid var(--blue-light, #E8F6FA)',
                            borderRadius: '5px',
                            fontSize: '12px',
                            fontWeight: 500,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
