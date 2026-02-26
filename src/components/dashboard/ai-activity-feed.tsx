interface ActivityEntry {
  id: string
  agentIcon: string
  agentName: string
  agentColor: string
  description: string
  timestamp: string
}

const entries: ActivityEntry[] = [
  {
    id: "1",
    agentIcon: "🤖",
    agentName: "Compliance Monitor",
    agentColor: "#3BA7C9",
    description: "Generated 24 checkpoint tasks for February 2026",
    timestamp: "2h ago",
  },
  {
    id: "2",
    agentIcon: "🛡",
    agentName: "Policy Guardian",
    agentColor: "#6D28D9",
    description: "Detected conflict between Telehealth Policy and Consent Procedures",
    timestamp: "5h ago",
  },
  {
    id: "3",
    agentIcon: "📎",
    agentName: "Evidence Librarian",
    agentColor: "#047857",
    description: "3 checkpoints missing required evidence documentation",
    timestamp: "1d ago",
  },
  {
    id: "4",
    agentIcon: "📊",
    agentName: "QM Orchestrator",
    agentColor: "#C05A2C",
    description: "February QM meeting packet draft ready for review",
    timestamp: "2d ago",
  },
]

export default function AIActivityFeed() {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid #E8E8E8",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #E8E8E8", backgroundColor: "#FAFAFA" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🤖</span>
          <span className="text-[13px] font-semibold" style={{ color: "#262626" }}>
            AI Agent Activity
          </span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: "#3BA7C9", cursor: "pointer" }}>
          View all →
        </span>
      </div>

      {/* Entries */}
      <div className="bg-white">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors"
            style={index < entries.length - 1 ? { borderBottom: "1px solid #F0F0F0" } : undefined}
          >
            {/* Agent icon bubble */}
            <div
              className="flex items-center justify-center rounded-full shrink-0 text-sm"
              style={{
                width: 32,
                height: 32,
                backgroundColor: entry.agentColor + "18",
                border: `1px solid ${entry.agentColor}40`,
                marginTop: 1,
              }}
            >
              {entry.agentIcon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {/* Agent name badge */}
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: entry.agentColor + "18",
                    color: entry.agentColor,
                  }}
                >
                  {entry.agentName}
                </span>
                <span className="text-[11px]" style={{ color: "#A3A3A3" }}>
                  {entry.timestamp}
                </span>
              </div>
              <p className="text-[12px] leading-snug" style={{ color: "#404040" }}>
                {entry.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
