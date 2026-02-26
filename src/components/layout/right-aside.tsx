export default function RightAside() {
  const stats = [
    { label: "Audit Readiness", value: "87%", color: "#16A34A" },
    { label: "Checkpoints (Feb)", value: "18/24", color: "#3BA7C9" },
    { label: "Policies Effective", value: "44/47", color: "#3BA7C9" },
    { label: "Evidence Coverage", value: "94%", color: "#16A34A" },
    { label: "Open CAPAs", value: "2", color: "#C05A2C" },
    { label: "AI Suggestions", value: "5 pending", color: "#D97706" },
  ]

  return (
    <aside
      className="flex flex-col py-4 shrink-0 overflow-y-auto"
      style={{
        width: 240,
        backgroundColor: "#FAFAFA",
        borderLeft: "1px solid #E8E8E8",
      }}
    >
      {/* Header */}
      <div className="px-4 mb-3">
        <div
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "#2A8BA8" }}
        >
          Compliance Summary
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 flex flex-col gap-0">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className="flex items-center justify-between py-2"
            style={{ borderBottom: "1px solid #F0F0F0" }}
          >
            <span className="text-[12px]" style={{ color: "#525252" }}>
              {label}
            </span>
            <span className="text-[12px] font-semibold" style={{ color }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Attention Required alert */}
      <div className="mx-4 mt-4 rounded-md p-3" style={{
        backgroundColor: "#FDF0EB",
        border: "1px solid #C05A2C",
      }}>
        <div className="flex items-start gap-2">
          <span className="text-sm mt-px">⚠️</span>
          <div>
            <div
              className="text-[11px] font-bold uppercase tracking-wide mb-1"
              style={{ color: "#9E4520" }}
            >
              Attention Required
            </div>
            <p className="text-[11px] leading-snug" style={{ color: "#C05A2C" }}>
              Medication Storage Safety CAPA is overdue by 4 days. Immediate action required.
            </p>
          </div>
        </div>
      </div>

      {/* AI Insight card */}
      <div className="mx-4 mt-3 rounded-md p-3" style={{
        backgroundColor: "#E8F6FA",
        border: "1px solid #3BA7C9",
      }}>
        <div className="flex items-start gap-2">
          <span className="text-sm mt-px">🤖</span>
          <div>
            <div
              className="text-[11px] font-bold uppercase tracking-wide mb-1"
              style={{ color: "#2A8BA8" }}
            >
              AI Insight
            </div>
            <p className="text-[11px] leading-snug" style={{ color: "#2A8BA8" }}>
              3-month compliance trend is positive. Overall score up 6% since November.
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
