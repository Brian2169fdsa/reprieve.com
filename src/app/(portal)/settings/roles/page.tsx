export default function RolesPage() {
  const roles = [
    {
      role: 'Admin',
      color: { bg: '#EFF6FF', color: '#1D4ED8' },
      permissions: [
        'Full access to all org data',
        'Manage members, roles, and invites',
        'Create and archive controls, policies, checkpoints',
        'Approve/reject AI suggestions',
        'Access all reports and dashboards',
        'Configure org settings and integrations',
      ],
    },
    {
      role: 'Compliance',
      color: { bg: '#F0FDF4', color: '#15803D' },
      permissions: [
        'Full CRUD on controls, checkpoints, and evidence',
        'Create, edit, and submit policies for review',
        'Manage CAPAs — create, assign, and close',
        'Review and act on AI suggestions',
        'Access all compliance reports',
        'Read-only access to QM workbench',
      ],
    },
    {
      role: 'Clinical',
      color: { bg: '#F5F3FF', color: '#6D28D9' },
      permissions: [
        'View all policies and controls',
        'Complete assigned checkpoints',
        'Upload and tag evidence',
        'View own CAPA assignments',
        'Read-only access to calendar and evidence library',
      ],
    },
    {
      role: 'Ops',
      color: { bg: '#FFF7ED', color: '#C2410C' },
      permissions: [
        'Complete assigned checkpoints',
        'Upload and tag evidence',
        'View own CAPA assignments',
        'Read-only access to relevant policies and controls',
      ],
    },
    {
      role: 'HR',
      color: { bg: '#FDF4FF', color: '#9333EA' },
      permissions: [
        'Complete HR-related checkpoints',
        'Upload HR-related evidence',
        'View HR policies and controls',
        'Read-only access to HR CAPA assignments',
      ],
    },
    {
      role: 'Billing',
      color: { bg: '#FFFBEB', color: '#B45309' },
      permissions: [
        'Complete billing-related checkpoints',
        'Upload billing-related evidence',
        'View billing policies and controls',
        'Read-only access to billing CAPA assignments',
      ],
    },
    {
      role: 'Supervisor',
      color: { bg: '#E8F6FA', color: '#0E7490' },
      permissions: [
        'View all org data (read-only by default)',
        'Complete assigned checkpoints',
        'Upload evidence',
        'Approve AI suggestions',
        'View all CAPAs and findings',
        'Access calendar and evidence library',
      ],
    },
    {
      role: 'Executive',
      color: { bg: '#FEF2F2', color: '#B91C1C' },
      permissions: [
        'Read-only access to all dashboards',
        'View QM workbench and meeting packets',
        'Download reports and audit binders',
        'View audit readiness scores and trends',
        'No write access to any records',
      ],
    },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
        Role Permissions
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', marginBottom: '32px' }}>
        Each role defines what a member can see and do within your organization.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {roles.map(({ role, color, permissions }) => (
          <div
            key={role}
            style={{
              background: '#fff',
              border: '1px solid var(--g200, #E8E8E8)',
              borderRadius: '10px',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
            }}
          >
            {/* Role badge column */}
            <div style={{ flexShrink: 0, width: '100px' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: 700,
                background: color.bg,
                color: color.color,
              }}>
                {role}
              </span>
            </div>

            {/* Permissions list */}
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
              {permissions.map((p) => (
                <li key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--g700, #404040)' }}>
                  <span style={{ color: 'var(--blue, #3BA7C9)', fontWeight: 700 }}>·</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>
        Role permissions are enforced at both the UI layer and the database level via Row-Level Security policies.
      </p>
    </div>
  );
}
