export default function QMPage() {
  const tabs = ['Checklist', 'Executive Summary', 'Findings', 'CAPAs'];

  const checklistItems = [
    { label: 'OIG Screening — Feb 2026',           status: 'passed',      assignee: 'Sarah Chen' },
    { label: 'HIPAA Safeguards Audit — Feb 2026',  status: 'passed',      assignee: 'Sarah Chen' },
    { label: 'Chart Audit IOP — Feb 2026',         status: 'in_progress', assignee: 'James Williams' },
    { label: 'Fire Drill Log — Feb 2026',           status: 'in_progress', assignee: 'Maria Rodriguez' },
    { label: 'Staff Training Verification — Q1',   status: 'pending',     assignee: 'David Kim' },
  ];

  const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    passed:      { bg: 'var(--green-light, #F0FDF4)',  color: 'var(--green, #16A34A)',   label: 'Passed' },
    in_progress: { bg: 'var(--yellow-light, #FFFBEB)', color: 'var(--yellow, #D97706)',  label: 'In Progress' },
    pending:     { bg: 'var(--g100, #F5F5F5)',         color: 'var(--g500, #737373)',    label: 'Pending' },
    failed:      { bg: 'var(--red-light, #FEF2F2)',    color: 'var(--red, #DC2626)',     label: 'Failed' },
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
            QM Workbench
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
            Phase 5 — Meeting packets, findings, and CAPA tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 12px',
            background: 'var(--blue-light, #E8F6FA)',
            color: 'var(--blue-dark, #2A8BA8)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            February 2026
          </span>
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
            Export PDF
          </button>
        </div>
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
        <strong>Phase 5 Preview:</strong> AI-assembled monthly QM packet — auto-generated 5 business days before meeting.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>QM Orchestrator agent builds checklist, summary, and findings automatically</li>
          <li>Track open CAPAs and verify closures in context</li>
          <li>Export audit-ready PDF with one click</li>
        </ul>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--g200, #E8E8E8)',
        marginBottom: '24px',
        gap: '0',
      }}>
        {tabs.map((tab, i) => (
          <button
            key={tab}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: i === 0 ? '2px solid var(--blue, #3BA7C9)' : '2px solid transparent',
              marginBottom: '-2px',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? 'var(--blue, #3BA7C9)' : 'var(--g500, #737373)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content: Checklist (default active) */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--g200, #E8E8E8)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: '16px',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--g100, #F5F5F5)', background: 'var(--g50, #FAFAFA)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', margin: 0 }}>
            Monthly Checkpoint Checklist
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--g100, #F5F5F5)' }}>
              {['Checkpoint', 'Assignee', 'Status'].map((h) => (
                <th key={h} style={{
                  padding: '10px 20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--g500, #737373)',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {checklistItems.map((item, i) => {
              const ss = STATUS_STYLES[item.status];
              return (
                <tr key={i} style={{ borderBottom: i < checklistItems.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none' }}>
                  <td style={{ padding: '12px 20px', fontSize: '14px', color: 'var(--g900, #171717)' }}>
                    {item.label}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--g500, #737373)' }}>
                    {item.assignee}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: ss.bg,
                      color: ss.color,
                    }}>
                      {ss.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', fontStyle: 'italic' }}>
        Executive Summary, Findings, and CAPAs tabs will be active in Phase 5.
      </p>
    </div>
  );
}
