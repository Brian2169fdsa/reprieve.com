export default function AIActivityPage() {
  const agents = [
    {
      name: 'Compliance Monitor',
      key: 'compliance_monitor',
      icon: '🛡',
      description: 'Generates monthly checkpoints, sends reminders, escalates overdue tasks, and detects missing-proof patterns.',
      trigger: 'Scheduled — 1st of month + daily overdue scan',
      lastRun: {
        status: 'completed',
        date: 'Feb 1, 2026 at 12:00 AM',
        summary: 'Generated 18 checkpoint tasks for February 2026. Sent 3 overdue reminders.',
        duration: '4.2s',
        tokens: 1840,
      },
    },
    {
      name: 'Evidence Librarian',
      key: 'evidence_librarian',
      icon: '📎',
      description: 'Scans for checkpoints missing required evidence. Organizes uploads into audit-ready binders.',
      trigger: 'Scheduled — Mondays at 8:00 AM',
      lastRun: {
        status: 'completed',
        date: 'Feb 24, 2026 at 8:00 AM',
        summary: 'Found 2 checkpoints missing required evidence. Created notifications for owners.',
        duration: '2.8s',
        tokens: 920,
      },
    },
    {
      name: 'Policy Guardian',
      key: 'policy_guardian',
      icon: '📖',
      description: 'Reviews policies for conflicts, gaps, and outdated language. Creates suggestions routed through approval workflow.',
      trigger: 'Weekly + on policy save events',
      lastRun: {
        status: 'completed',
        date: 'Feb 24, 2026 at 6:00 AM',
        summary: 'Reviewed 5 policies. Created 1 suggestion: missing OIG screening clause in POL-CRED-001.',
        duration: '8.1s',
        tokens: 3420,
      },
    },
    {
      name: 'QM Orchestrator',
      key: 'qm_orchestrator',
      icon: '📊',
      description: 'Assembles monthly QM packets, drafts meeting agendas, calculates audit readiness scores.',
      trigger: '5 business days before QM meeting date',
      lastRun: {
        status: 'pending',
        date: 'Next run: Feb 26, 2026',
        summary: 'Waiting to assemble February 2026 QM packet.',
        duration: null,
        tokens: null,
      },
    },
  ];

  const recentActivity = [
    { time: 'Feb 24 · 8:02 AM', agent: 'Evidence Librarian', action: 'Sent missing evidence alert to David Kim for SAFE-FD-001', type: 'alert' },
    { time: 'Feb 24 · 6:03 AM', agent: 'Policy Guardian',    action: 'Created suggestion: Add OIG screening frequency clause to POL-CRED-001', type: 'suggestion' },
    { time: 'Feb 24 · 6:01 AM', agent: 'Policy Guardian',    action: 'Reviewed POL-HIPAA-001 v3 — no conflicts detected', type: 'info' },
    { time: 'Feb 7 · 9:00 AM',  agent: 'Compliance Monitor', action: 'Escalated AHCCCS-CHA-001 — overdue 3 days, notified James Williams', type: 'alert' },
    { time: 'Feb 1 · 12:01 AM', agent: 'Compliance Monitor', action: 'Generated 18 checkpoint tasks for February 2026', type: 'success' },
  ];

  const TYPE_STYLES: Record<string, { color: string; dot: string }> = {
    success:    { color: 'var(--green, #16A34A)',  dot: '#16A34A' },
    alert:      { color: 'var(--rust, #C05A2C)',   dot: '#C05A2C' },
    suggestion: { color: 'var(--blue, #3BA7C9)',   dot: '#3BA7C9' },
    info:       { color: 'var(--g500, #737373)',   dot: '#A3A3A3' },
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '8px' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
          AI Activity
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
          Phase 4 — Monitor your agentic AI team&apos;s activity
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
        <strong>Phase 4 Preview:</strong> Live activity feed and run logs for your 4-agent AI compliance team.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>Each agent runs on schedule via Supabase pg_cron + Edge Functions</li>
          <li>Realtime feed updates as agents complete runs and create suggestions</li>
          <li>All agent outputs require human approval — AI never writes directly</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {agents.map((agent) => (
          <div
            key={agent.key}
            style={{
              background: '#fff',
              border: '1px solid var(--g200, #E8E8E8)',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{agent.icon}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g900, #171717)', margin: 0 }}>{agent.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>{agent.trigger}</p>
                </div>
              </div>
              <span style={{
                padding: '2px 10px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                background: agent.lastRun.status === 'completed' ? 'var(--green-light, #F0FDF4)' : 'var(--yellow-light, #FFFBEB)',
                color: agent.lastRun.status === 'completed' ? 'var(--green, #16A34A)' : 'var(--yellow, #D97706)',
              }}>
                {agent.lastRun.status === 'completed' ? 'Last Run OK' : 'Scheduled'}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--g600, #525252)', margin: '0 0 12px', lineHeight: '1.5' }}>
              {agent.description}
            </p>

            <div style={{ borderTop: '1px solid var(--g100, #F5F5F5)', paddingTop: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--g500, #737373)', margin: '0 0 4px' }}>
                <strong style={{ color: 'var(--g700, #404040)' }}>{agent.lastRun.date}</strong>
              </p>
              <p style={{ fontSize: '12px', color: 'var(--g600, #525252)', margin: '0 0 6px', lineHeight: '1.5' }}>
                {agent.lastRun.summary}
              </p>
              {agent.lastRun.duration && (
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--g400, #A3A3A3)' }}>
                  <span>Duration: {agent.lastRun.duration}</span>
                  <span>Tokens: {agent.lastRun.tokens?.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity feed */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--g200, #E8E8E8)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--g100, #F5F5F5)', background: 'var(--g50, #FAFAFA)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', margin: 0 }}>
            Recent Activity
          </h3>
        </div>
        <div>
          {recentActivity.map((item, i) => {
            const ts = TYPE_STYLES[item.type];
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 20px',
                  borderBottom: i < recentActivity.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ts.dot, marginTop: '5px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: 'var(--g800, #262626)', margin: '0 0 2px', lineHeight: '1.5' }}>
                    <strong style={{ color: 'var(--g500, #737373)', fontWeight: 500 }}>{item.agent}:</strong>{' '}
                    {item.action}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>{item.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
