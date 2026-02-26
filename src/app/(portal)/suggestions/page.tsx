export default function SuggestionsPage() {
  const suggestions = [
    {
      id: '1',
      agent: 'Policy Guardian',
      agentIcon: '📖',
      type: 'edit',
      entityCode: 'POL-CRED-001',
      entityType: 'Policy',
      title: 'Add OIG Screening Frequency Clause',
      description: 'POL-CRED-001 (Staff Credentialing & OIG Screening) does not explicitly state that OIG/SAM exclusion checks must occur monthly. Control OIG-SCR-001 enforces this requirement, but the policy lacks supporting language. Suggesting insertion of one paragraph to Section 3: Ongoing Monitoring.',
      suggestedText: '"All employees, contractors, and volunteers shall be screened against the OIG Exclusion List and SAM.gov no less than monthly. Screening documentation must be retained for a minimum of 6 years and made available upon request."',
      confidence: 0.94,
      createdAt: 'Feb 24, 2026 at 6:03 AM',
    },
    {
      id: '2',
      agent: 'Evidence Librarian',
      agentIcon: '📎',
      type: 'flag',
      entityCode: 'SAFE-FD-001',
      entityType: 'Checkpoint',
      title: 'Missing Required Evidence: Fire Drill Attendance Log',
      description: 'Checkpoint SAFE-FD-001 (Fire Drill Log — Feb 2026) has been marked in-progress but is missing the required signed attendance roster. Required evidence includes: (1) Drill log with date/time, (2) Signed attendance roster. Only the drill log has been uploaded.',
      suggestedText: null,
      confidence: 0.99,
      createdAt: 'Feb 24, 2026 at 8:02 AM',
    },
  ];

  const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    edit:   { bg: 'var(--blue-light, #E8F6FA)',   color: 'var(--blue-dark, #2A8BA8)', label: 'Edit Suggestion' },
    flag:   { bg: 'var(--yellow-light, #FFFBEB)', color: 'var(--yellow, #D97706)',    label: 'Flag' },
    create: { bg: 'var(--green-light, #F0FDF4)',  color: 'var(--green, #16A34A)',     label: 'Create' },
    review: { bg: 'var(--rust-light, #FDF0EB)',   color: 'var(--rust, #C05A2C)',      label: 'Review Required' },
  };

  function confidenceColor(c: number) {
    if (c >= 0.9) return 'var(--green, #16A34A)';
    if (c >= 0.7) return 'var(--yellow, #D97706)';
    return 'var(--rust, #C05A2C)';
  }

  return (
    <div style={{ padding: '32px', maxWidth: '820px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
            AI Suggestions
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
            Phase 4 — Review, accept, or reject AI-generated recommendations
          </p>
        </div>
        <span style={{
          padding: '4px 12px',
          background: 'var(--yellow-light, #FFFBEB)',
          color: 'var(--yellow, #D97706)',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
        }}>
          2 Pending
        </span>
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
        <strong>Phase 4 Preview:</strong> AI agents surface suggestions — all require human approval before any change is applied.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>Accept applies the change and writes to the audit log</li>
          <li>Reject dismisses with optional feedback sent to agent context</li>
          <li>Modify lets you edit the suggestion before accepting</li>
        </ul>
      </div>

      {/* Suggestion cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {suggestions.map((s) => {
          const ts = TYPE_STYLES[s.type];
          return (
            <div
              key={s.id}
              style={{
                background: '#fff',
                border: '1px solid var(--g200, #E8E8E8)',
                borderRadius: '10px',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '16px' }}>{s.agentIcon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)' }}>{s.agent}</span>
                  <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: ts.bg, color: ts.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {ts.label}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: 'var(--g100, #F5F5F5)', color: 'var(--g600, #525252)' }}>
                    {s.entityType}: {s.entityCode}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>{s.createdAt}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: confidenceColor(s.confidence) }}>
                    {Math.round(s.confidence * 100)}% confident
                  </span>
                </div>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 8px' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--g600, #525252)', margin: '0 0 12px', lineHeight: '1.6' }}>
                {s.description}
              </p>

              {s.suggestedText && (
                <div style={{
                  background: 'var(--g50, #FAFAFA)',
                  border: '1px solid var(--g200, #E8E8E8)',
                  borderLeft: '3px solid var(--blue, #3BA7C9)',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--blue, #3BA7C9)', margin: '0 0 6px' }}>
                    Suggested Text
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: 0, lineHeight: '1.6', fontStyle: 'italic' }}>
                    {s.suggestedText}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                    background: '#fff',
                    color: 'var(--g700, #404040)',
                    border: '1px solid var(--g300, #D4D4D4)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                    opacity: 0.8,
                  }}
                >
                  Modify
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
                  Accept
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
