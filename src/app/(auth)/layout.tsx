import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'REPrieve.ai — Compliance OS',
  description: 'Compliance + Quality Management Operating System for Arizona Behavioral Health',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Left panel — brand / showcase */}
      <div
        style={{
          width: '42%',
          background: 'linear-gradient(165deg, #1e6f88 0%, #2A8BA8 35%, #205f75 70%, #163f50 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 40px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background texture circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '320px', height: '320px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '60px', left: '-60px',
          width: '220px', height: '220px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
          <div style={{
            width: '40px', height: '40px',
            border: '2px solid rgba(255,255,255,0.7)',
            borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: '700',
            fontFamily: "'Source Serif 4', Georgia, serif",
            letterSpacing: '-0.5px',
          }}>
            R
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', lineHeight: 1, letterSpacing: '-0.3px' }}>
              REPrieve.ai
            </div>
            <div style={{ fontSize: '11px', fontWeight: '500', opacity: 0.7, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '2px' }}>
              Compliance OS
            </div>
          </div>
        </div>

        {/* Org showcase */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            fontSize: '11px', fontWeight: '600', letterSpacing: '1.5px',
            textTransform: 'uppercase', opacity: 0.6, marginBottom: '12px',
          }}>
            Member Portal
          </div>
          <h1 style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: '28px', fontWeight: '700', lineHeight: 1.2,
            marginBottom: '16px', letterSpacing: '-0.5px',
          }}>
            Cholla Behavioral Health
          </h1>
          <p style={{
            fontSize: '14px', lineHeight: '1.65', opacity: 0.8,
            marginBottom: '40px', maxWidth: '340px',
          }}>
            Your compliance and quality management program — automated, audit-ready, and always current.
            Powered by an agentic AI team that works alongside your staff.
          </p>

          {/* Feature cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              {
                icon: '🛡',
                title: 'Automated Compliance',
                desc: 'Monthly checkpoints generate automatically from your control library.',
              },
              {
                icon: '📖',
                title: 'Knowledge Vault',
                desc: 'Versioned policies with AI review, approval workflows, and cross-references.',
              },
              {
                icon: '📊',
                title: 'QM Workbench',
                desc: 'AI-assembled meeting packets with audit readiness scores and trend data.',
              },
              {
                icon: '📎',
                title: 'Evidence Binder',
                desc: 'Upload-once proof that organizes itself into audit-ready binders by standard.',
              },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '1px' }}>{card.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{card.title}</div>
                  <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: '1.5' }}>{card.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          fontSize: '11px', opacity: 0.5,
          lineHeight: '1.6', borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '16px',
        }}>
          An IC&RC-aligned Compliance Operating System<br />
          Built for Arizona Behavioral Health
        </div>
      </div>

      {/* Right panel — form area */}
      <div
        style={{
          width: '58%',
          background: '#FAFAFA',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          minHeight: '100vh',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
