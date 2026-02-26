"use client"

import { useRouter } from "next/navigation"
import type { Checkpoint } from "@/lib/types"

const STANDARD_COLORS: Record<string, { bg: string; color: string }> = {
  OIG: { bg: "#EFF6FF", color: "#1D4ED8" },
  HIPAA: { bg: "#F5F3FF", color: "#6D28D9" },
  AHCCCS: { bg: "#F0FDF4", color: "#15803D" },
  TJC: { bg: "#FFF7ED", color: "#C2410C" },
  CARF: { bg: "#FCE7F3", color: "#9D174D" },
  Safety: { bg: "#FFFBEB", color: "#B45309" },
  Internal: { bg: "#F5F5F5", color: "#525252" },
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#FFFBEB", color: "#D97706", label: "Pending" },
  in_progress: { bg: "#E8F6FA", color: "#2A8BA8", label: "In Progress" },
  passed: { bg: "#F0FDF4", color: "#16A34A", label: "Passed" },
  failed: { bg: "#FEF2F2", color: "#DC2626", label: "Failed" },
  overdue: { bg: "#FEF2F2", color: "#DC2626", label: "Overdue" },
  skipped: { bg: "#F5F5F5", color: "#A3A3A3", label: "Skipped" },
}

interface Props {
  checkpoint: Checkpoint
}

export default function CheckpointCard({ checkpoint }: Props) {
  const router = useRouter()
  const ctrl = checkpoint.control
  const assignee = checkpoint.assignee
  const status = STATUS_STYLES[checkpoint.status] ?? STATUS_STYLES.pending
  const standard = ctrl?.standard ?? ""
  const sc = STANDARD_COLORS[standard] ?? { bg: "#F5F5F5", color: "#525252" }

  const dueDateObj = new Date(checkpoint.due_date)
  const isOverdue =
    checkpoint.status === "overdue" ||
    (checkpoint.status === "pending" && dueDateObj < new Date())

  return (
    <div
      onClick={() => router.push(`/checkpoints/${checkpoint.id}`)}
      style={{
        backgroundColor: "#fff",
        border: `1px solid ${isOverdue ? "#DC2626" : "#E8E8E8"}`,
        borderRadius: 8,
        padding: "14px 16px",
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)")}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#171717", lineHeight: 1.3, marginBottom: 3 }}>
            {ctrl?.title ?? "Untitled Checkpoint"}
          </div>
          <code style={{ fontSize: 11, color: "#737373", fontFamily: "monospace" }}>
            {ctrl?.code ?? checkpoint.control_id.slice(0, 8)}
          </code>
        </div>
        <span
          style={{
            padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
            backgroundColor: status.bg, color: status.color,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Badges row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {standard && (
          <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
            {standard}
          </span>
        )}
        <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, backgroundColor: "#F5F5F5", color: "#525252" }}>
          {checkpoint.period}
        </span>
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Assignee */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff",
              backgroundColor: "#2A8BA8", flexShrink: 0,
            }}
          >
            {assignee?.full_name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span style={{ fontSize: 12, color: "#525252" }}>
            {assignee?.full_name ?? "Unassigned"}
          </span>
        </div>

        {/* Due date */}
        <span
          style={{
            fontSize: 12, fontWeight: 500,
            color: isOverdue ? "#DC2626" : "#737373",
          }}
        >
          Due {dueDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {isOverdue && " ⚠"}
        </span>
      </div>
    </div>
  )
}
