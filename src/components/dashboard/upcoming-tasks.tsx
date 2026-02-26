interface Task {
  id: string
  title: string
  standard: string
  dueDate: string
  status: "pending" | "in_progress" | "overdue"
}

const tasks: Task[] = [
  {
    id: "1",
    title: "OIG Exclusion Screening",
    standard: "OIG",
    dueDate: "Feb 28",
    status: "pending",
  },
  {
    id: "2",
    title: "Staff Training Verification",
    standard: "AHCCCS",
    dueDate: "Mar 1",
    status: "pending",
  },
  {
    id: "3",
    title: "HIPAA Risk Assessment",
    standard: "HIPAA",
    dueDate: "Mar 5",
    status: "pending",
  },
  {
    id: "4",
    title: "Incident Report Review",
    standard: "Safety",
    dueDate: "Mar 8",
    status: "pending",
  },
]

const standardColors: Record<string, { bg: string; text: string }> = {
  OIG: { bg: "#E8F6FA", text: "#2A8BA8" },
  HIPAA: { bg: "#F3F0FF", text: "#6D28D9" },
  AHCCCS: { bg: "#ECFDF5", text: "#047857" },
  Safety: { bg: "#FFF7ED", text: "#C2410C" },
  TJC: { bg: "#FEF3C7", text: "#92400E" },
  CARF: { bg: "#FCE7F3", text: "#9D174D" },
  Internal: { bg: "#F1F5F9", text: "#475569" },
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FFFBEB", text: "#D97706", label: "Pending" },
  in_progress: { bg: "#E8F6FA", text: "#2A8BA8", label: "In Progress" },
  overdue: { bg: "#FEF2F2", text: "#DC2626", label: "Overdue" },
}

export default function UpcomingTasks() {
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
          <span className="text-sm">📅</span>
          <span className="text-[13px] font-semibold" style={{ color: "#262626" }}>
            Upcoming Checkpoints
          </span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: "#3BA7C9", cursor: "pointer" }}>
          View all →
        </span>
      </div>

      {/* Task rows */}
      <div className="bg-white">
        {tasks.map((task, index) => {
          const std = standardColors[task.standard] ?? { bg: "#F5F5F5", text: "#525252" }
          const sta = statusColors[task.status]
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors"
              style={index < tasks.length - 1 ? { borderBottom: "1px solid #F0F0F0" } : undefined}
            >
              {/* Checkbox circle */}
              <div
                className="shrink-0 rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid #D4D4D4",
                }}
              />

              {/* Title */}
              <span className="flex-1 text-[13px] font-medium" style={{ color: "#262626" }}>
                {task.title}
              </span>

              {/* Standard badge */}
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: std.bg, color: std.text }}
              >
                {task.standard}
              </span>

              {/* Due date */}
              <span className="text-[12px] font-medium w-16 text-right" style={{ color: "#737373" }}>
                {task.dueDate}
              </span>

              {/* Status badge */}
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: sta.bg, color: sta.text, minWidth: 60, textAlign: "center" }}
              >
                {sta.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
