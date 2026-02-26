export default function ApprovalsPage() {
  const approvals = [
    {
      id: '1',
      type: 'Policy Change',
      title: 'HIPAA Privacy & Confidentiality Policy — v4 Draft',
      description: 'Sarah Chen submitted an updated version of POL-HIPAA-001 adding language around mobile device usage and remote access procedures. Changes affect 3 sections.',
      requestedBy: 'Sarah Chen',
      requestedAt: 'Feb 22, 2026',
      entityCode: 'POL-HIPAA-001',
      urgency: 'normal',
      changeCount: 3,
    },
    {
      id: '2',
      type: 'AI Suggestion',
      title: 'Policy Guardian: Add OIG screening frequency clause to POL-CRED-001',
      description: 'AI Policy Guardian detected that POL-CRED-001 does not explicitly state the monthly OIG/SAM screening requirement that is enforced in control OIG-SCR-001. Suggests adding one paragraph to Section 3.',
      requestedBy: 'Policy Guardian (AI)',
      requestedAt: 'Feb 24, 2026',
      entityCode: 'POL-CRED-001',
      urgency: 'high',
      changeCount: 1,
    },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '8px' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
          Pending Approvals
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
          Phase 2 — Review and approve policy changes and AI suggestions
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
        <strong>Phase 2 Preview:</strong> Unified approval queue for policy drafts and AI-generated suggestions.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>Side-by-side diff view for policy version changes</li>
          <li>One-click approve, reject, or request revisions</li>
          <li>All approvals logged to append-only audit trail</li>
        </ul>
      </div>

      {/* Approval cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {approvals.map((item) => (
          <div
            key={item.id}
            style={{
              background: '#fff',
              border: `1px solid ${item.urgency === 'high' ? 'var(--rust-light, #FDF0EB)' : 'var(--g200, #E8E8E8)'}`,
              borderLeft: `4px solid ${item.urgency === 'high' ? 'var(--rust, #C05A2C)' : 'var(--blue, #3BA7C9)'}`,
              borderRadius: '10px',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: item.type === 'AI Suggestion' ? 'var(--blue-light, #E8F6FA)' : 'var(--g100, #F5F5F5)',
                  color: item.type === 'AI Suggestion' ? 'var(--blue-dark, #2A8BA8)' : 'var(--g600, #525252)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {item.type}
                </span>
                {item.urgency === 'high' && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'var(--rust-light, #FDF0EB)',
                    color: 'var(--rust, #C05A2C)',
                    textTransform: 'uppercase',
                  }}>
                    High Priority
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>{item.requestedAt}</span>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 8px' }}>
              {item.title}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--g600, #525252)', margin: '0 0 12px', lineHeight: '1.6' }}>
              {item.description}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--g500, #737373)' }}>
                <span><strong style={{ color: 'var(--g700, #404040)' }}>Entity:</strong> {item.entityCode}</span>
                <span><strong style={{ color: 'var(--g700, #404040)' }}>Requested by:</strong> {item.requestedBy}</span>
                <span><strong style={{ color: 'var(--g700, #404040)' }}>Changes:</strong> {item.changeCount} section{item.changeCount !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled
                  style={{
                    padding: '7px 16px',
                    background: '#fff',
                    color: 'var(--rust, #C05A2C)',
                    border: '1px solid var(--rust-light, #FDF0EB)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                    opacity: 0.8,
                  }}
                >
                  Reject
                </button>
                <button
                  disabled
                  style={{
                    padding: '7px 16px',
                    background: 'var(--blue, #3BA7C9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                    opacity: 0.8,
                  }}
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
