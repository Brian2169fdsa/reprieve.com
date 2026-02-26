export default function CalendarPage() {
  // February 2026: starts on Sunday
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDay = 0; // Sunday
  const totalDays = 28;

  const events: Record<number, { label: string; color: string; status: string }[]> = {
    3:  [{ label: 'OIG Screening', color: '#16A34A', status: 'passed' }],
    5:  [{ label: 'HIPAA Audit', color: '#3BA7C9', status: 'pending' }],
    10: [{ label: 'Chart Audit IOP', color: '#3BA7C9', status: 'in_progress' }, { label: 'Fire Drill Log', color: '#D97706', status: 'pending' }],
    14: [{ label: 'Staff Training', color: '#3BA7C9', status: 'pending' }],
    20: [{ label: 'OIG Screening', color: '#16A34A', status: 'passed' }],
    24: [{ label: 'Billing Audit', color: '#D97706', status: 'overdue' }],
    28: [{ label: 'QM Meeting', color: '#C05A2C', status: 'pending' }],
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
            Checkpoint Calendar
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
            Phase 3 — Monthly calendar view with color-coded compliance checkpoints
          </p>
        </div>
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
      </div>

      {/* What's coming callout */}
      <div style={{
        background: 'var(--blue-bg, #F0F9FC)',
        border: '1px solid var(--blue-light, #E8F6FA)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '24px',
        fontSize: '13px',
        color: 'var(--blue-dark, #2A8BA8)',
      }}>
        <strong>Phase 3 Preview:</strong> Full calendar with drag-to-reschedule, filter by standard/program/owner, and one-click checkpoint detail.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>Color-coded by status: green = passed, blue = pending, yellow = overdue, rust = failed</li>
          <li>Click any event to open checkpoint detail, upload evidence, and attest pass/fail</li>
          <li>Generate next month's checkpoints from the active control library</li>
        </ul>
      </div>

      {/* Calendar grid */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--g200, #E8E8E8)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--g200, #E8E8E8)' }}>
          {days.map((d) => (
            <div key={d} style={{
              padding: '10px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--g500, #737373)',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'var(--g50, #FAFAFA)',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, idx) => (
            <div
              key={idx}
              style={{
                minHeight: '90px',
                padding: '8px',
                borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--g100, #F5F5F5)' : 'none',
                borderBottom: idx < cells.length - 7 ? '1px solid var(--g100, #F5F5F5)' : 'none',
                background: day === 25 ? 'var(--blue-bg, #F0F9FC)' : '#fff',
              }}
            >
              {day !== null && (
                <>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '13px',
                    fontWeight: day === 25 ? 700 : 400,
                    color: day === 25 ? 'var(--blue, #3BA7C9)' : 'var(--g700, #404040)',
                    marginBottom: '4px',
                  }}>
                    {day}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {(events[day] ?? []).map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: ev.color + '1A',
                          color: ev.color,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                        }}
                        title={ev.label}
                      >
                        {ev.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
        {[
          { label: 'Passed', color: '#16A34A' },
          { label: 'Pending', color: '#3BA7C9' },
          { label: 'Overdue', color: '#D97706' },
          { label: 'Failed', color: '#C05A2C' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--g600, #525252)' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, display: 'inline-block' }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
