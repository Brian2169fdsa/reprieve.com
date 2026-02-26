'use client';

import { useRouter } from 'next/navigation';

export interface FindingItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  checkpoint?: string | null;
  standard: string;
  isPositive?: boolean;
}

const SEED_FINDINGS: FindingItem[] = [
  {
    id: 'f1',
    severity: 'critical',
    title: 'Fire Drill Not Conducted',
    description: 'No complete documented fire drill for the Residential facility in February 2026. Incomplete attendance log does not satisfy NFPA 101 Life Safety Code requirements.',
    checkpoint: 'SAFE-FD-001 — Feb 2026',
    standard: 'Safety',
    isPositive: false,
  },
  {
    id: 'f2',
    severity: 'high',
    title: 'Medication Storage CAPA Overdue',
    description: 'CAPA-2026-003 for medication storage temperature logging gaps is past its due date of Feb 20, 2026. Owner has not updated status in 5 days.',
    checkpoint: null,
    standard: 'AHCCCS',
    isPositive: false,
  },
  {
    id: 'f3',
    severity: 'medium',
    title: 'Telehealth ↔ Consent Policy Conflict',
    description: 'Draft policy POL-CLN-002 (Telehealth Service Delivery) references a digital consent process not defined in the current Consent Procedures policy. Cross-reference gap flagged by Policy Guardian.',
    checkpoint: null,
    standard: 'HIPAA',
    isPositive: false,
  },
  {
    id: 'f4',
    severity: 'low',
    title: 'Chart Audit Excellence — 100% Pass Rate',
    description: 'IOP Chart Audit achieved 100% pass rate for the third consecutive month (Dec 2025 – Feb 2026). Consistent documentation quality reflects strong clinical leadership.',
    checkpoint: 'AHCCCS-CHA-001 — Feb 2026',
    standard: 'AHCCCS',
    isPositive: true,
  },
];

const SEV_CONFIG: Record<string, { bg: string; borderColor: string; color: string; headerBg: string; label: string }> = {
  critical: { bg: '#FEF2F2', borderColor: '#DC2626', color: '#DC2626', headerBg: '#FEE2E2', label: 'Critical' },
  high:     { bg: '#FDF0EB', borderColor: '#C05A2C', color: '#C05A2C', headerBg: '#FBDDD0', label: 'High' },
  medium:   { bg: '#FFFBEB', borderColor: '#D97706', color: '#D97706', headerBg: '#FEF3C7', label: 'Medium' },
  low:      { bg: '#F0FDF4', borderColor: '#16A34A', color: '#16A34A', headerBg: '#DCFCE7', label: 'Low' },
};

const STD_COLORS: Record<string, { bg: string; color: string }> = {
  Safety: { bg: '#FFFBEB', color: '#B45309' },
  AHCCCS: { bg: '#F0FDF4', color: '#15803D' },
  HIPAA:  { bg: '#F5F3FF', color: '#6D28D9' },
};

interface FindingsGridProps {
  findings?: FindingItem[];
  onCreateCAPA?: (findingId: string, title: string) => void;
}

export function FindingsGrid({ findings = SEED_FINDINGS, onCreateCAPA }: FindingsGridProps) {
  const router = useRouter();

  function handleCreateCAPA(findingId: string, title: string) {
    if (onCreateCAPA) {
      onCreateCAPA(findingId, title);
    } else {
      router.push('/capa');
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
      {findings.map((finding) => {
        const cfg = SEV_CONFIG[finding.severity];
        const std = STD_COLORS[finding.standard] ?? { bg: '#F5F5F5', color: '#525252' };
        return (
          <div
            key={finding.id}
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.borderColor}30`,
              borderTop: `3px solid ${cfg.borderColor}`,
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ padding: '16px 18px' }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: cfg.headerBg,
                  color: cfg.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {cfg.label}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: std.bg, color: std.color }}>
                    {finding.standard}
                  </span>
                  {finding.isPositive && (
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#F0FDF4', color: '#15803D' }}>
                      Positive
                    </span>
                  )}
                </div>
              </div>

              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 8px' }}>
                {finding.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: '0 0 12px', lineHeight: '1.55' }}>
                {finding.description}
              </p>

              {finding.checkpoint && (
                <p style={{ fontSize: '12px', color: 'var(--g500, #737373)', margin: '0 0 12px' }}>
                  <span style={{ fontWeight: 500 }}>Checkpoint: </span>{finding.checkpoint}
                </p>
              )}

              {!finding.isPositive && (
                <button
                  onClick={() => handleCreateCAPA(finding.id, finding.title)}
                  style={{
                    padding: '6px 14px',
                    background: 'var(--blue, #3BA7C9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create CAPA
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
