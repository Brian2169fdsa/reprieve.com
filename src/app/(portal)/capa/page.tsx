export default function CAPAPage() {
  const capas = [
    {
      id: 'CAPA-2026-003',
      title: 'Billing Audit Deficiency — Missing Prior Authorization Documentation',
      finding: 'Chart audit identified 3 of 12 IOP admissions lacked documented prior authorization on file.',
      rootCause: 'Intake team unaware of updated AHCCCS prior auth documentation requirements effective Jan 1, 2026.',
      correctiveAction: 'Issue updated SOP to intake staff; retrain on AHCCCS billing requirements.',
      owner: 'David Kim',
      status: 'overdue',
      dueDate: 'Feb 15, 2026',
      severity: 'high',
      standard: 'AHCCCS',
    },
    {
      id: 'CAPA-2026-004',
      title: 'Fire Drill Documentation — Incomplete Attendance Signatures',
      finding: 'January fire drill log missing 4 staff signatures. Not considered complete per NFPA standards.',
      rootCause: 'Drill conducted across split shifts; off-shift staff not tracked.',
      correctiveAction: 'Revise drill log to capture all shifts. Require supervisor sign-off on completeness.',
      owner: 'Maria Rodriguez',
      status: 'in_progress',
      dueDate: 'Mar 1, 2026',
      severity: 'medium',
      standard: 'Safety',
    },
  ];

  const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    open:                 { bg: 'var(--g100, #F5F5F5)',         color: 'var(--g600, #525252)',   label: 'Open' },
    in_progress:          { bg: 'var(--yellow-light, #FFFBEB)', color: 'var(--yellow, #D97706)', label: 'In Progress' },
    pending_verification: { bg: 'var(--blue-light, #E8F6FA)',   color: 'var(--blue, #3BA7C9)',   label: 'Pending Verification' },
    closed:               { bg: 'var(--green-light, #F0FDF4)',  color: 'var(--green, #16A34A)',  label: 'Closed' },
    overdue:              { bg: 'var(--rust-light, #FDF0EB)',   color: 'var(--rust, #C05A2C)',   label: 'Overdue' },
  };

  const SEV_STYLES: Record<string, { bg: string; color: string }> = {
    low:      { bg: '#F5F5F5',  color: '#737373' },
    medium:   { bg: '#FFFBEB',  color: '#B45309' },
    high:     { bg: '#FEF2F2',  color: '#DC2626' },
    critical: { bg: '#FDF0EB',  color: '#C05A2C' },
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
            Corrective Actions (CAPAs)
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
            Phase 5 — Track corrective and preventive actions to closure
          </p>
        </div>
        <button
          disabled
          style={{
            padding: '8px 16px',
            background: 'var(--blue, #3BA7C9)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          + New CAPA
        </button>
      </div>

      {/* Preview callout */}
      <div style={{
        background: 'var(--blue-bg, #F0F9FC)',
        border: '1px solid var(--blue-light, #E8F6FA)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '24px',
        fontSize: '13px',
        color: 'var(--blue-dark, #2A8BA8)',
      }}>
        <strong>Phase 5 Preview:</strong> Full CAPA lifecycle from finding to verified closure.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>Link CAPAs directly to QM meeting findings and checkpoint failures</li>
          <li>Owner assignments with due date tracking and escalation</li>
          <li>Verification workflow — supervisor signs off on closure evidence</li>
        </ul>
      </div>

      {/* CAPA cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {capas.map((capa) => {
          const ss = STATUS_STYLES[capa.status];
          const sv = SEV_STYLES[capa.severity];
          const isOverdue = capa.status === 'overdue';
          return (
            <div
              key={capa.id}
              style={{
                background: '#fff',
                border: `1px solid ${isOverdue ? 'var(--rust-light, #FDF0EB)' : 'var(--g200, #E8E8E8)'}`,
                borderLeft: `4px solid ${isOverdue ? 'var(--rust, #C05A2C)' : 'var(--yellow, #D97706)'}`,
                borderRadius: '10px',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>{capa.id}</span>
                  <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color }}>
                    {ss.label}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: sv.bg, color: sv.color }}>
                    {capa.severity.charAt(0).toUpperCase() + capa.severity.slice(1)} Severity
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: 'var(--g100, #F5F5F5)', color: 'var(--g600, #525252)' }}>
                    {capa.standard}
                  </span>
                </div>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isOverdue ? 'var(--rust, #C05A2C)' : 'var(--g600, #525252)',
                }}>
                  Due: {capa.dueDate}
                </span>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 8px' }}>
                {capa.title}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 3px' }}>Finding</p>
                  <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: 0, lineHeight: '1.5' }}>{capa.finding}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 3px' }}>Root Cause</p>
                  <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: 0, lineHeight: '1.5' }}>{capa.rootCause}</p>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 3px' }}>Corrective Action</p>
                <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: 0, lineHeight: '1.5' }}>{capa.correctiveAction}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--g500, #737373)' }}>
                  <strong style={{ color: 'var(--g700, #404040)' }}>Owner:</strong> {capa.owner}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button disabled style={{ padding: '6px 14px', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '6px', fontSize: '12px', background: '#fff', color: 'var(--g600, #525252)', cursor: 'not-allowed', opacity: 0.7 }}>
                    View Detail
                  </button>
                  <button disabled style={{ padding: '6px 14px', background: 'var(--blue, #3BA7C9)', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#fff', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>
                    Mark Complete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
