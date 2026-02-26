export default function ReportsPage() {
  const reports = [
    {
      id: '1',
      title: 'Monthly Compliance Report',
      description: 'Checkpoint completion rates, pass/fail breakdown by standard, evidence coverage, and overdue items for February 2026.',
      icon: '📋',
      period: 'February 2026',
      lastGenerated: 'Feb 24, 2026',
      format: 'PDF',
      sections: ['Checkpoint Summary', 'By Standard Breakdown', 'Evidence Coverage', 'Overdue Items', 'Trend vs. Prior Month'],
      status: 'ready',
    },
    {
      id: '2',
      title: 'QM Executive Summary',
      description: 'Board-ready executive summary with audit readiness score, key findings, open CAPAs, and month-over-month trend for QM meeting.',
      icon: '📊',
      period: 'February 2026',
      lastGenerated: 'Pending — runs Feb 26',
      format: 'PDF',
      sections: ['Audit Readiness Score', 'Key Findings', 'Open CAPAs', 'Score Trends', 'Upcoming Actions'],
      status: 'pending',
    },
    {
      id: '3',
      title: 'Audit Binder Export',
      description: 'Complete audit-ready binder with all evidence files, checkpoint attestations, and policy effective versions for a selected date range.',
      icon: '🗂',
      period: 'Q1 2026',
      lastGenerated: 'Not yet generated',
      format: 'ZIP + PDF index',
      sections: ['Evidence Files by Standard', 'Checkpoint Attestations', 'Policy Snapshots', 'AI Suggestion Log', 'Audit Trail'],
      status: 'not_generated',
    },
  ];

  const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    ready:         { bg: 'var(--green-light, #F0FDF4)',  color: 'var(--green, #16A34A)',  label: 'Ready' },
    pending:       { bg: 'var(--yellow-light, #FFFBEB)', color: 'var(--yellow, #D97706)', label: 'Generating Soon' },
    not_generated: { bg: 'var(--g100, #F5F5F5)',         color: 'var(--g500, #737373)',   label: 'Not Generated' },
  };

  return (
    <div style={{ padding: '32px', maxWidth: '860px' }}>
      <div style={{ marginBottom: '8px' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
          Reports
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
          Phase 5 — Generate and download compliance reports and audit binders
        </p>
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
        <strong>Phase 5 Preview:</strong> On-demand PDF exports for compliance reporting and external audit prep.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>Reports generated server-side with @react-pdf/renderer — no third-party tools needed</li>
          <li>Audit binder bundles all evidence, attestations, and policy snapshots into one download</li>
          <li>Executive reports are board-presentation ready with branding</li>
        </ul>
      </div>

      {/* Report cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reports.map((report) => {
          const ss = STATUS_STYLES[report.status];
          return (
            <div
              key={report.id}
              style={{
                background: '#fff',
                border: '1px solid var(--g200, #E8E8E8)',
                borderRadius: '10px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: '36px', lineHeight: 1, flexShrink: 0 }}>{report.icon}</span>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 2px' }}>
                      {report.title}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>Period: {report.period} · Format: {report.format}</span>
                  </div>
                  <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color }}>
                    {ss.label}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--g600, #525252)', margin: '0 0 12px', lineHeight: '1.6' }}>
                  {report.description}
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 6px' }}>
                    Includes
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {report.sections.map((sec) => (
                      <span key={sec} style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: 'var(--g100, #F5F5F5)',
                        color: 'var(--g600, #525252)',
                      }}>
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>
                    Last generated: {report.lastGenerated}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      disabled
                      style={{
                        padding: '7px 16px',
                        background: '#fff',
                        color: 'var(--g700, #404040)',
                        border: '1px solid var(--g300, #D4D4D4)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        opacity: 0.7,
                      }}
                    >
                      Generate
                    </button>
                    <button
                      disabled={report.status !== 'ready'}
                      style={{
                        padding: '7px 16px',
                        background: report.status === 'ready' ? 'var(--blue, #3BA7C9)' : 'var(--g200, #E8E8E8)',
                        color: report.status === 'ready' ? '#fff' : 'var(--g400, #A3A3A3)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: report.status === 'ready' ? 'not-allowed' : 'not-allowed',
                        opacity: report.status === 'ready' ? 0.8 : 1,
                      }}
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
