"use client"

export default function VaultPage() {
  const policies = [
    {
      code: 'POL-HIPAA-001',
      title: 'HIPAA Privacy & Confidentiality Policy',
      category: 'HIPAA',
      program: ['IOP', 'Residential'],
      status: 'effective',
      owner: 'Sarah Chen',
      version: 3,
      nextReview: 'Jan 15, 2027',
    },
    {
      code: 'POL-CRED-001',
      title: 'Staff Credentialing & OIG Screening',
      category: 'Credentialing',
      program: ['IOP', 'Residential'],
      status: 'effective',
      owner: 'Sarah Chen',
      version: 2,
      nextReview: 'Jan 15, 2027',
    },
    {
      code: 'POL-SAFE-001',
      title: 'Emergency Procedures & Safety',
      category: 'Safety',
      program: ['Residential'],
      status: 'in_review',
      owner: 'Maria Rodriguez',
      version: 1,
      nextReview: 'Mar 1, 2026',
    },
    {
      code: 'POL-CL-001',
      title: 'Clinical Documentation Standards',
      category: 'Clinical',
      program: ['IOP'],
      status: 'effective',
      owner: 'James Williams',
      version: 4,
      nextReview: 'Dec 1, 2026',
    },
    {
      code: 'POL-HR-001',
      title: 'Employee Training & Competency',
      category: 'HR',
      program: ['IOP', 'Residential'],
      status: 'draft',
      owner: 'David Kim',
      version: 1,
      nextReview: '—',
    },
  ];

  const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    draft:     { bg: '#F5F5F5',  color: '#737373', label: 'Draft' },
    in_review: { bg: '#FFFBEB',  color: '#B45309', label: 'In Review' },
    approved:  { bg: '#E8F6FA',  color: '#0E7490', label: 'Approved' },
    effective: { bg: '#F0FDF4',  color: '#15803D', label: 'Effective' },
    retired:   { bg: '#FEF2F2',  color: '#B91C1C', label: 'Retired' },
  };

  const CAT_COLORS: Record<string, { bg: string; color: string }> = {
    HIPAA:         { bg: '#F5F3FF', color: '#6D28D9' },
    Credentialing: { bg: '#EFF6FF', color: '#1D4ED8' },
    Safety:        { bg: '#FFFBEB', color: '#B45309' },
    Clinical:      { bg: '#F0FDF4', color: '#15803D' },
    HR:            { bg: '#FDF4FF', color: '#9333EA' },
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
            Knowledge Vault
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)' }}>
            Phase 2 — Version-controlled policies with approval workflow
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
          + New Policy
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
        <strong>Phase 2 Preview:</strong> Tiptap-powered policy editor with version history and approval workflow.
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          <li>Draft → In Review → Approved → Effective lifecycle with full audit trail</li>
          <li>Cross-reference linking between related policies</li>
          <li>AI Policy Guardian flags conflicts and outdated language as suggestions</li>
        </ul>
      </div>

      {/* Policies table */}
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
              {['Code', 'Policy Title', 'Category', 'Programs', 'Status', 'Version', 'Owner', 'Next Review'].map((h) => (
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
            {policies.map((pol, i) => {
              const ss = STATUS_STYLES[pol.status];
              const cc = CAT_COLORS[pol.category] ?? { bg: '#F5F5F5', color: '#525252' };
              return (
                <tr
                  key={pol.code}
                  style={{ borderBottom: i < policies.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--g50, #FAFAFA)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--g600, #525252)', whiteSpace: 'nowrap' }}>
                    {pol.code}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--g900, #171717)' }}>
                    {pol.title}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: cc.bg, color: cc.color }}>
                      {pol.category}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {pol.program.map((p) => (
                        <span key={p} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: 'var(--g100, #F5F5F5)', color: 'var(--g600, #525252)' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color }}>
                      {ss.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--g600, #525252)', textAlign: 'center' }}>
                    v{pol.version}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--g600, #525252)' }}>
                    {pol.owner}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: pol.nextReview === '—' ? 'var(--g400, #A3A3A3)' : 'var(--g600, #525252)' }}>
                    {pol.nextReview}
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
