"use client"

export default function ControlsPage() {
  const controls = [
    {
      code: 'OIG-SCR-001',
      title: 'OIG/SAM Exclusion Screening',
      standard: 'OIG',
      category: 'Credentialing',
      frequency: 'Monthly',
      ownerRole: 'Compliance',
      evidence: ['Screening report', 'Staff roster'],
      isActive: true,
    },
    {
      code: 'HIPAA-SA-001',
      title: 'HIPAA Security Safeguards Audit',
      standard: 'HIPAA',
      category: 'Privacy & Security',
      frequency: 'Monthly',
      ownerRole: 'Compliance',
      evidence: ['Risk assessment', 'Audit log'],
      isActive: true,
    },
    {
      code: 'AHCCCS-CHA-001',
      title: 'Chart Audit — IOP Program',
      standard: 'AHCCCS',
      category: 'Clinical Quality',
      frequency: 'Monthly',
      ownerRole: 'Clinical',
      evidence: ['Audit tool', 'Corrective memo'],
      isActive: true,
    },
    {
      code: 'SAFE-FD-001',
      title: 'Fire Drill Log — All Facilities',
      standard: 'Safety',
      category: 'Safety',
      frequency: 'Monthly',
      ownerRole: 'Ops',
      evidence: ['Drill log', 'Signed attendance'],
      isActive: true,
    },
    {
      code: 'HR-TRNG-001',
      title: 'Staff Training Verification',
      standard: 'Internal',
      category: 'HR',
      frequency: 'Quarterly',
      ownerRole: 'HR',
      evidence: ['Training certificates', 'Completion roster'],
      isActive: true,
    },
  ];

  const STANDARD_COLORS: Record<string, { bg: string; color: string }> = {
    OIG:      { bg: '#EFF6FF', color: '#1D4ED8' },
    HIPAA:    { bg: '#F5F3FF', color: '#6D28D9' },
    AHCCCS:   { bg: '#F0FDF4', color: '#15803D' },
    Safety:   { bg: '#FFFBEB', color: '#B45309' },
    Internal: { bg: '#F5F5F5', color: '#525252' },
  };

  const FREQ_COLORS: Record<string, { bg: string; color: string }> = {
    Monthly:   { bg: 'var(--blue-light, #E8F6FA)', color: 'var(--blue-dark, #2A8BA8)' },
    Quarterly: { bg: '#FDF4FF', color: '#9333EA' },
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
            Control Library
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
            Phase 3 — Browse and manage your compliance control definitions
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
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
          disabled
        >
          + Add Control
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
        <strong>Phase 3 Preview:</strong> Full control library with search, standard filters, and control detail pages.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>Define test procedures, required evidence types, and review frequency</li>
          <li>Link controls to policies in the Knowledge Vault</li>
          <li>Generate monthly checkpoint tasks from active controls</li>
        </ul>
      </div>

      {/* Controls table */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--g200, #E8E8E8)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--g50, #FAFAFA)', borderBottom: '1px solid var(--g200, #E8E8E8)' }}>
              {['Code', 'Control Title', 'Standard', 'Frequency', 'Owner Role', 'Required Evidence', 'Status'].map((h) => (
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
            {controls.map((ctrl, i) => {
              const sc = STANDARD_COLORS[ctrl.standard] ?? { bg: '#F5F5F5', color: '#525252' };
              const fc = FREQ_COLORS[ctrl.frequency] ?? { bg: '#F5F5F5', color: '#525252' };
              return (
                <tr key={ctrl.code} style={{ borderBottom: i < controls.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--g50, #FAFAFA)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--g600, #525252)', whiteSpace: 'nowrap' }}>
                    {ctrl.code}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--g900, #171717)' }}>
                    {ctrl.title}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: sc.bg, color: sc.color }}>
                      {ctrl.standard}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: fc.bg, color: fc.color }}>
                      {ctrl.frequency}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--g600, #525252)' }}>
                    {ctrl.ownerRole}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {ctrl.evidence.map((ev) => (
                        <span key={ev} style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: 'var(--g100, #F5F5F5)',
                          color: 'var(--g600, #525252)',
                          whiteSpace: 'nowrap',
                        }}>
                          {ev}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: ctrl.isActive ? 'var(--green-light, #F0FDF4)' : 'var(--g100, #F5F5F5)',
                      color: ctrl.isActive ? 'var(--green, #16A34A)' : 'var(--g400, #A3A3A3)',
                    }}>
                      {ctrl.isActive ? 'Active' : 'Inactive'}
                    </span>
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
