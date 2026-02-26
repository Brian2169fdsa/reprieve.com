interface StatCard {
  label: string
  value: string
  subtext: string
  color: string
  bgColor: string
  icon: string
  arrow?: "up" | "down"
}

const cards: StatCard[] = [
  {
    label: "Audit Readiness",
    value: "87%",
    subtext: "+3% from last month",
    color: "#16A34A",
    bgColor: "#F0FDF4",
    icon: "🎯",
    arrow: "up",
  },
  {
    label: "Checkpoints",
    value: "18 / 24",
    subtext: "Completed this period",
    color: "#2A8BA8",
    bgColor: "#E8F6FA",
    icon: "✅",
  },
  {
    label: "Policies",
    value: "44 / 47",
    subtext: "Effective status",
    color: "#2A8BA8",
    bgColor: "#E8F6FA",
    icon: "📖",
  },
  {
    label: "Open CAPAs",
    value: "2",
    subtext: "1 overdue",
    color: "#C05A2C",
    bgColor: "#FDF0EB",
    icon: "🔄",
  },
]

export default function StatsGrid() {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg p-4 flex flex-col gap-2"
          style={{
            backgroundColor: "white",
            border: "1px solid #E8E8E8",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "#737373" }}>
              {card.label}
            </span>
            <span className="text-lg">{card.icon}</span>
          </div>
          <div className="flex items-end gap-2">
            <span
              className="text-[28px] font-bold leading-none"
              style={{ color: card.color }}
            >
              {card.value}
            </span>
            {card.arrow && (
              <span
                className="text-sm font-semibold mb-0.5"
                style={{ color: card.arrow === "up" ? "#16A34A" : "#DC2626" }}
              >
                {card.arrow === "up" ? "↑" : "↓"}
              </span>
            )}
          </div>
          <div
            className="text-[11px] font-medium"
            style={{
              color: card.label === "Open CAPAs" ? "#C05A2C" : "#737373",
            }}
          >
            {card.subtext}
          </div>
        </div>
      ))}
    </div>
  )
}
