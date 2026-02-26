import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen font-sans text-g900">
      {/* ── Navigation ─────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-g200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline gap-0.5">
            <span className="font-serif text-xl font-bold text-blue-dark">
              REPrieve
            </span>
            <span className="text-sm font-semibold text-g400">.ai™</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-g600 transition-colors hover:text-g900 sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded bg-rust px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rust-dark"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-16 text-center text-white"
        style={{
          background:
            "linear-gradient(150deg, #1a6e87 0%, #2A8BA8 50%, #3BA7C9 100%)",
        }}
      >
        {/* Subtle dot-grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative mx-auto max-w-4xl">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-blue-light" />
            Designed for Arizona IOP + Residential Programs
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Compliance & Quality Management,
            <br />
            <span className="text-blue-light">On Autopilot</span>
          </h1>

          {/* Sub */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
            REPrieve.ai is a membership portal that runs your behavioral health
            compliance program like an operating system — powered by an agentic
            AI team that automates monthly checkpoints, maintains policies, and
            builds audit-ready proof.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center rounded bg-rust px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-rust-dark"
            >
              Start Free Trial
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              See How It Works
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </a>
          </div>

          <p className="mt-8 text-sm text-white/40">
            No credit card required · Set up in minutes
          </p>
        </div>

        {/* Wave transition to white */}
        <div className="absolute inset-x-0 bottom-0">
          <svg
            viewBox="0 0 1440 72"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            className="h-18 w-full"
            aria-hidden="true"
          >
            <path
              fill="white"
              d="M0,72 L0,36 C180,72 360,0 540,36 C720,72 900,0 1080,36 C1260,72 1440,36 1440,36 L1440,72 Z"
            />
          </svg>
        </div>
      </section>

      {/* ── Problem / Solution ─────────────────────────── */}
      <section id="how-it-works" className="bg-white px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="font-serif text-3xl font-bold text-g900 sm:text-4xl">
              From Scramble-Before-Audit
              <br />
              to Continuously Compliant
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-g500">
              Most behavioral health teams are reactive. REPrieve makes
              compliance a living, automated program.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Before */}
            <div className="rounded-xl border border-red/20 bg-red-light p-8">
              <h3 className="mb-6 flex items-center gap-3 text-lg font-bold text-red">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red text-sm font-bold text-white">
                  ✕
                </span>
                Before REPrieve
              </h3>
              <ul className="space-y-4">
                {[
                  "Policies scattered in shared drives with no version control",
                  "Manually tracking dozens of monthly compliance checkpoints",
                  "Scrambling for evidence the week before an audit",
                  "QM meetings with no data — just opinions and guesses",
                  "CAPAs opened in spreadsheets, forgotten three days later",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-g700">
                    <span className="mt-0.5 flex-shrink-0 font-bold text-red/60">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="rounded-xl border border-green/20 bg-green-light p-8">
              <h3 className="mb-6 flex items-center gap-3 text-lg font-bold text-green">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green text-sm font-bold text-white">
                  ✓
                </span>
                The REPrieve Way
              </h3>
              <ul className="space-y-4">
                {[
                  "Version-controlled policy vault with draft → review → approval workflow",
                  "Monthly checkpoints generated automatically from your control library",
                  "Evidence organized into audit-ready binders by standard and period",
                  "AI-assembled QM meeting packets with trend analysis, ready before you sit down",
                  "Structured CAPA management with owner, due date, and verification trail",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-g700">
                    <span className="mt-0.5 flex-shrink-0 font-bold text-green">
                      →
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 Pillars ──────────────────────────────────── */}
      <section id="pillars" className="bg-blue-bg px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="font-serif text-3xl font-bold text-g900 sm:text-4xl">
              Everything You Need to Run Compliance
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-g600">
              Four integrated modules covering the full compliance lifecycle.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Pillar 1: Automated Compliance */}
            <div className="rounded-xl border border-g200 bg-white p-7 shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-light text-blue-dark">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-xl font-bold text-g900">
                Automated Compliance
              </h3>
              <p className="leading-relaxed text-g600">
                Monthly checkpoints generated automatically from your control
                library. OIG, HIPAA, AHCCCS, TJC, and CARF requirements tracked
                and assigned — no manual setup required each month.
              </p>
            </div>

            {/* Pillar 2: Knowledge Vault */}
            <div className="rounded-xl border border-g200 bg-white p-7 shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-light text-blue-dark">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-xl font-bold text-g900">
                Knowledge Vault
              </h3>
              <p className="leading-relaxed text-g600">
                Version-controlled policies with a structured draft → review →
                approval workflow. AI flags conflicts, gaps, and outdated
                sections. Full version history and cross-references always
                visible.
              </p>
            </div>

            {/* Pillar 3: QM Workbench */}
            <div className="rounded-xl border border-g200 bg-white p-7 shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-light text-blue-dark">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-xl font-bold text-g900">
                QM Workbench
              </h3>
              <p className="leading-relaxed text-g600">
                Monthly QM meeting packets assembled automatically five days
                before the meeting. Executive summary, findings, open CAPAs, and
                audit readiness score — all ready before your team sits down.
              </p>
            </div>

            {/* Pillar 4: Evidence Binder */}
            <div className="rounded-xl border border-g200 bg-white p-7 shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-light text-blue-dark">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-serif text-xl font-bold text-g900">
                Evidence Binder
              </h3>
              <p className="leading-relaxed text-g600">
                Every upload — images, videos, documents — automatically
                organized into audit-ready binders by standard, program, and
                period. No more hunting for proof when the auditor arrives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Team ────────────────────────────────────── */}
      <section id="ai-team" className="bg-white px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-center">
            <span className="inline-block rounded-full bg-blue-light px-4 py-1 text-sm font-semibold text-blue-dark">
              Agentic AI — Every Suggestion Requires Human Approval
            </span>
          </div>
          <div className="mb-14 text-center">
            <h2 className="font-serif text-3xl font-bold text-g900 sm:text-4xl">
              Your AI Compliance Team
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-g600">
              Four specialized agents work around the clock. AI never modifies
              records directly — every output is queued for your review.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Policy Guardian */}
            <div className="rounded-xl border border-blue/10 bg-blue-light p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-dark text-white">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <h3 className="mb-1 font-serif text-lg font-bold text-g900">
                Policy Guardian
              </h3>
              <p className="text-sm leading-relaxed text-g600">
                Reviews policies weekly for conflicts, gaps, and outdated
                content. Surfaces edit suggestions through the approval queue —
                never modifies directly.
              </p>
            </div>

            {/* Compliance Monitor */}
            <div className="rounded-xl border border-blue/10 bg-blue-light p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-dark text-white">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
                  />
                </svg>
              </div>
              <h3 className="mb-1 font-serif text-lg font-bold text-g900">
                Compliance Monitor
              </h3>
              <p className="text-sm leading-relaxed text-g600">
                Generates monthly checkpoint tasks on the 1st. Tracks progress,
                sends reminders at 7, 3, and 1 day before due dates, and
                escalates overdue items.
              </p>
            </div>

            {/* Evidence Librarian */}
            <div className="rounded-xl border border-blue/10 bg-blue-light p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-dark text-white">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                  />
                </svg>
              </div>
              <h3 className="mb-1 font-serif text-lg font-bold text-g900">
                Evidence Librarian
              </h3>
              <p className="text-sm leading-relaxed text-g600">
                Scans weekly for checkpoints missing required evidence.
                Organizes uploads into audit binders by period, standard, and
                program — automatically.
              </p>
            </div>

            {/* QM Orchestrator */}
            <div className="rounded-xl border border-blue/10 bg-blue-light p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-dark text-white">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h3 className="mb-1 font-serif text-lg font-bold text-g900">
                QM Orchestrator
              </h3>
              <p className="text-sm leading-relaxed text-g600">
                Assembles the monthly QM packet 5 days before the meeting.
                Calculates audit readiness score and drafts the executive
                summary.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Built for Arizona Behavioral Health ────────── */}
      <section
        id="built-for"
        className="px-4 py-20 text-white"
        style={{
          background: "linear-gradient(135deg, #2A8BA8 0%, #1a6e87 100%)",
        }}
      >
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-serif text-3xl font-bold sm:text-4xl">
            Built for Arizona Behavioral Health
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            REPrieve is purpose-built for IOP and Residential programs operating
            in Arizona. Every control, policy template, and checkpoint maps
            directly to the standards your surveyors actually check.
          </p>

          {/* Standards badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              "HIPAA",
              "OIG Compliance",
              "AHCCCS",
              "The Joint Commission",
              "CARF",
              "ADHS",
              "ARS Safety",
            ].map((standard) => (
              <span
                key={standard}
                className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm"
              >
                {standard}
              </span>
            ))}
          </div>

          {/* Stats grid */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "IOP Programs", desc: "Intensive Outpatient" },
              { label: "Residential", desc: "24-Hour Care" },
              { label: "8 User Roles", desc: "Granular RBAC" },
              { label: "All-in-One", desc: "Single Platform" },
            ].map(({ label, desc }) => (
              <div
                key={label}
                className="rounded-lg bg-white/10 p-4 text-center backdrop-blur-sm"
              >
                <div className="font-serif text-lg font-bold">{label}</div>
                <div className="text-sm text-white/70">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="bg-rust px-4 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-3xl font-bold sm:text-4xl">
            Ready to Automate Your Compliance Program?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Join behavioral health organizations that run compliance like an
            operating system.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center rounded bg-white px-8 py-3.5 text-base font-semibold text-rust shadow-lg transition-colors hover:bg-rust-light"
            >
              Start Your Free Trial
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 underline underline-offset-2 transition-colors hover:text-white"
            >
              Already have an account? Sign in →
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/50">
            No credit card required · Set up in minutes
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="bg-g900 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-baseline gap-0.5">
            <span className="font-serif font-bold text-white">REPrieve</span>
            <span className="text-xs font-semibold text-g500">.ai™</span>
          </div>
          <p className="text-center text-sm text-g500">
            Built for Behavioral Health · Arizona · © 2026 REPrieve.ai™
          </p>
          <div className="flex gap-6 text-sm text-g500">
            <Link
              href="/login"
              className="transition-colors hover:text-g300"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="transition-colors hover:text-g300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
