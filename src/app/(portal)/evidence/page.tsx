"use client"

export default function EvidencePage() {
  const evidenceItems = [
    {
      id: '1',
      fileName: 'OIG_Screening_Feb2026.pdf',
      fileType: 'pdf',
      checkpoint: 'OIG-SCR-001 — Feb 2026',
      standard: 'OIG',
      program: 'IOP',
      period: '2026-02',
      uploadedBy: 'Sarah Chen',
      uploadedAt: 'Feb 3, 2026',
      fileSize: '142 KB',
    },
    {
      id: '2',
      fileName: 'HIPAA_RiskAssessment_Q1.pdf',
      fileType: 'pdf',
      checkpoint: 'HIPAA-SA-001 — Feb 2026',
      standard: 'HIPAA',
      program: 'All',
      period: '2026-02',
      uploadedBy: 'Sarah Chen',
      uploadedAt: 'Feb 5, 2026',
      fileSize: '318 KB',
    },
    {
      id: '3',
      fileName: 'ChartAudit_IOP_Feb2026.xlsx',
      fileType: 'spreadsheet',
      checkpoint: 'AHCCCS-CHA-001 — Feb 2026',
      standard: 'AHCCCS',
      program: 'IOP',
      period: '2026-02',
      uploadedBy: 'James Williams',
      uploadedAt: 'Feb 10, 2026',
      fileSize: '87 KB',
    },
    {
      id: '4',
      fileName: 'FireDrill_Log_Feb2026.pdf',
      fileType: 'pdf',
      checkpoint: 'SAFE-FD-001 — Feb 2026',
      standard: 'Safety',
      program: 'Residential',
      period: '2026-02',
      uploadedBy: 'Maria Rodriguez',
      uploadedAt: 'Feb 10, 2026',
      fileSize: '54 KB',
    },
    {
      id: '5',
      fileName: 'StaffTraining_Q1_Roster.pdf',
      fileType: 'pdf',
      checkpoint: 'HR-TRNG-001 — Q1 2026',
      standard: 'Internal',
      program: 'All',
      period: '2026-Q1',
      uploadedBy: 'David Kim',
      uploadedAt: 'Feb 14, 2026',
      fileSize: '211 KB',
    },
  ];

  const FILE_ICONS: Record<string, string> = {
    pdf:         '📄',
    spreadsheet: '📊',
    image:       '🖼',
    video:       '🎥',
    document:    '📝',
  };

  const STANDARD_COLORS: Record<string, { bg: string; color: string }> = {
    OIG:      { bg: '#EFF6FF', color: '#1D4ED8' },
    HIPAA:    { bg: '#F5F3FF', color: '#6D28D9' },
    AHCCCS:   { bg: '#F0FDF4', color: '#15803D' },
    Safety:   { bg: '#FFFBEB', color: '#B45309' },
    Internal: { bg: '#F5F5F5', color: '#525252' },
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
            Evidence Library
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
            Phase 3 — Audit binder view of all uploaded evidence
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
          Upload Evidence
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
        <strong>Phase 3 Preview:</strong> Fully searchable audit binder with filter by period, standard, and program.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>Org-scoped Supabase Storage — evidence never crosses tenant boundaries</li>
          <li>AI Evidence Librarian flags checkpoints missing required uploads</li>
          <li>Export audit-ready binder as PDF with one click</li>
        </ul>
      </div>

      {/* Evidence grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {evidenceItems.map((item) => {
          const sc = STANDARD_COLORS[item.standard] ?? { bg: '#F5F5F5', color: '#525252' };
          return (
            <div
              key={item.id}
              style={{
                background: '#fff',
                border: '1px solid var(--g200, #E8E8E8)',
                borderRadius: '10px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px', lineHeight: 1 }}>{FILE_ICONS[item.fileType] ?? '📄'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.fileName}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>{item.fileSize}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: sc.bg, color: sc.color }}>
                  {item.standard}
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: 'var(--g100, #F5F5F5)', color: 'var(--g600, #525252)' }}>
                  {item.program}
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: 'var(--blue-light, #E8F6FA)', color: 'var(--blue-dark, #2A8BA8)' }}>
                  {item.period}
                </span>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--g500, #737373)', margin: '0 0 4px' }}>
                <span style={{ fontWeight: 500 }}>Checkpoint:</span> {item.checkpoint}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>
                Uploaded by {item.uploadedBy} · {item.uploadedAt}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
