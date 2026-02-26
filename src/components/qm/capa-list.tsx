'use client';

import Link from 'next/link';

export interface CAPAListItem {
  id: string;
  code: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  status: 'open' | 'in_progress' | 'pending_verification' | 'closed' | 'overdue';
  dueDate: string;
  daysOpen: number;
  standard?: string;
}

export const SEED_CAPAS: CAPAListItem[] = [
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

interface CAPAListProps {
  capas?: CAPAListItem[];
  showAddButton?: boolean;
  compact?: boolean;
}

export function CAPAList({ capas = SEED_CAPAS, showAddButton = true, compact = false }: CAPAListProps) {
  return (
    <div>
      {showAddButton && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <Link
            href="/capa"
            style={{
              padding: '8px 16px',
              background: 'var(--blue, #3BA7C9)',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            + New CAPA
          </Link>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--g50, #FAFAFA)', borderBottom: '1px solid var(--g200, #E8E8E8)' }}>
              {['Code', 'Title', 'Severity', 'Owner', 'Status', 'Due Date', 'Days Open', ''].map((h) => (
                <th key={h} style={{
                  padding: compact ? '8px 14px' : '10px 16px',
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
            {capas.map((capa, i) => {
              const ss = STATUS_STYLES[capa.status];
              const sv = SEV_STYLES[capa.severity];
              const isOverdue = capa.status === 'overdue';
              return (
                <tr
                  key={capa.id}
                  style={{ borderBottom: i < capas.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none' }}
                >
                  <td style={{ padding: compact ? '10px 14px' : '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--g500, #737373)', whiteSpace: 'nowrap' }}>
                    {capa.code}
                  </td>
                  <td style={{ padding: compact ? '10px 14px' : '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--g900, #171717)', maxWidth: '280px' }}>
                    {capa.title}
                  </td>
                  <td style={{ padding: compact ? '10px 14px' : '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: sv.bg, color: sv.color, textTransform: 'capitalize' }}>
                      {capa.severity}
                    </span>
                  </td>
                  <td style={{ padding: compact ? '10px 14px' : '12px 16px', fontSize: '13px', color: 'var(--g600, #525252)', whiteSpace: 'nowrap' }}>
                    {capa.owner}
                  </td>
                  <td style={{ padding: compact ? '10px 14px' : '12px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                      {ss.label}
                    </span>
                  </td>
                  <td style={{ padding: compact ? '10px 14px' : '12px 16px', fontSize: '13px', fontWeight: isOverdue ? 600 : 400, color: isOverdue ? 'var(--red, #DC2626)' : 'var(--g600, #525252)', whiteSpace: 'nowrap' }}>
                    {capa.dueDate}
                  </td>
                  <td style={{ padding: compact ? '10px 14px' : '12px 16px', fontSize: '13px', color: 'var(--g500, #737373)' }}>
                    {capa.daysOpen}d
                  </td>
                  <td style={{ padding: compact ? '10px 14px' : '12px 16px' }}>
                    <Link
                      href={`/capa/${capa.id}`}
                      style={{
                        padding: '4px 12px',
                        background: '#fff',
                        color: 'var(--blue, #3BA7C9)',
                        border: '1px solid var(--blue-light, #E8F6FA)',
                        borderRadius: '5px',
                        fontSize: '12px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
