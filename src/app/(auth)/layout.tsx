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
    <div className="flex min-h-screen font-sans">
      {/* Left panel — brand / showcase — hidden on mobile, 35% on tablet, 42% on desktop */}
      <div className="hidden md:flex md:w-[35%] lg:w-[42%] flex-col p-8 lg:p-12 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #1e6f88 0%, #2A8BA8 35%, #205f75 70%, #163f50 100%)',
        }}
      >
        {/* Subtle background texture circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="absolute bottom-16 -left-14 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.03)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 border-2 border-white/70 rounded-[6px] flex items-center justify-center text-xl font-bold font-serif tracking-tight">
            R
          </div>
          <div>
            <div className="text-lg font-bold leading-none tracking-tight">REPrieve.ai</div>
            <div className="text-[11px] font-medium opacity-70 tracking-[0.5px] uppercase mt-0.5">
              Compliance OS
            </div>
          </div>
        </div>

        {/* Org showcase */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-[11px] font-semibold tracking-[1.5px] uppercase opacity-60 mb-3">
            Member Portal
          </div>
          <h1 className="font-serif text-2xl lg:text-[28px] font-bold leading-tight mb-4 tracking-tight">
            Cholla Behavioral Health
          </h1>
          <p className="text-sm leading-relaxed opacity-80 mb-10 max-w-xs lg:max-w-sm">
            Your compliance and quality management program — automated, audit-ready, and always current.
            Powered by an agentic AI team that works alongside your staff.
          </p>

          {/* Feature cards */}
          <div className="flex flex-col gap-3">
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
                className="rounded-lg p-3 px-4 flex items-start gap-3 border"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <span className="text-lg leading-none mt-0.5">{card.icon}</span>
                <div>
                  <div className="text-[13px] font-semibold mb-0.5">{card.title}</div>
                  <div className="text-[12px] opacity-70 leading-snug">{card.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-4 text-[11px] opacity-50 leading-relaxed"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          An IC&RC-aligned Compliance Operating System<br />
          Built for Arizona Behavioral Health
        </div>
      </div>

      {/* Right panel — form area — full width on mobile */}
      <div className="flex-1 bg-g50 flex flex-col items-center justify-center px-6 py-12 md:px-10 min-h-screen">
        {/* Mobile logo — only shows on small screens */}
        <div className="md:hidden flex items-center gap-3 mb-8">
          <div className="w-9 h-9 border-2 border-blue-dark rounded-[6px] flex items-center justify-center text-lg font-bold font-serif text-blue-dark">
            R
          </div>
          <div>
            <div className="text-base font-bold text-g900 leading-none tracking-tight">REPrieve.ai</div>
            <div className="text-[10px] font-medium text-g500 tracking-[0.5px] uppercase mt-0.5">
              Compliance OS
            </div>
          </div>
        </div>

        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}
