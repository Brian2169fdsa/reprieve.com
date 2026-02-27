"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react"

interface Props {
  orgId: string
  userId: string | null
}

interface TaskRow {
  id: string
  title: string
  standard: string
  dueDate: string
  dueDateRaw: string
  status: "pending" | "in_progress" | "overdue" | "passed"
}

const standardColors: Record<string, { bg: string; text: string }> = {
  OIG: { bg: "#E8F6FA", text: "#2A8BA8" },
  HIPAA: { bg: "#F3F0FF", text: "#6D28D9" },
  AHCCCS: { bg: "#ECFDF5", text: "#047857" },
  Safety: { bg: "#FFF7ED", text: "#C2410C" },
  TJC: { bg: "#FEF3C7", text: "#92400E" },
  CARF: { bg: "#FCE7F3", text: "#9D174D" },
  Internal: { bg: "#F1F5F9", text: "#475569" },
}

// Mock tasks for empty orgs / demos
const MOCK_TASKS: TaskRow[] = [
  {
    id: "mock-1",
    title: "OIG Exclusion Screening",
    standard: "OIG",
    dueDate: "Feb 14",
    dueDateRaw: "2026-02-14",
    status: "passed",
  },
  {
    id: "mock-2",
    title: "HIPAA Access Review",
    standard: "HIPAA",
    dueDate: "Feb 15",
    dueDateRaw: "2026-02-15",
    status: "passed",
  },
  {
    id: "mock-3",
    title: "Incident Report Review",
    standard: "Safety",
    dueDate: "Feb 18",
    dueDateRaw: "2026-02-18",
    status: "passed",
  },
  {
    id: "mock-4",
    title: "Fire Drill Documentation",
    standard: "Safety",
    dueDate: "Feb 22",
    dueDateRaw: "2026-02-22",
    status: "pending",
  },
  {
    id: "mock-5",
    title: "Chart Audit — IOP",
    standard: "AHCCCS",
    dueDate: "Feb 25",
    dueDateRaw: "2026-02-25",
    status: "pending",
  },
  {
    id: "mock-6",
    title: "Medication Storage Check",
    standard: "TJC",
    dueDate: "Feb 27",
    dueDateRaw: "2026-02-27",
    status: "in_progress",
  },
  {
    id: "mock-7",
    title: "Staff Training Verification",
    standard: "CARF",
    dueDate: "Feb 20",
    dueDateRaw: "2026-02-20",
    status: "overdue",
  },
  {
    id: "mock-8",
    title: "Grievance Log Review",
    standard: "Internal",
    dueDate: "Feb 19",
    dueDateRaw: "2026-02-19",
    status: "overdue",
  },
]

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleString("default", { month: "short", day: "numeric" })
}

export default function UpcomingTasks({ orgId, userId }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const supabase = createClient()

    // Get user's assigned checkpoints (pending, in_progress, overdue + recently passed)
    let query = supabase
      .from("checkpoints")
      .select("id, due_date, status, control:controls(title, standard)")
      .eq("org_id", orgId)
      .in("status", ["pending", "in_progress", "overdue", "passed"])
      .order("due_date", { ascending: true })
      .limit(10)

    if (userId) {
      query = query.eq("assigned_to", userId)
    }

    const { data } = await query

    if (!data || data.length === 0) {
      setTasks(MOCK_TASKS)
      setIsLoading(false)
      return
    }

    // Show up to 8 tasks: overdue first, then pending/in_progress, then last few passed
    const mapped: TaskRow[] = (data as any[]).map((row) => ({
      id: row.id,
      title: row.control?.title ?? "Checkpoint",
      standard: row.control?.standard ?? "Internal",
      dueDate: row.due_date ? formatDueDate(row.due_date) : "—",
      dueDateRaw: row.due_date ?? "",
      status: row.status as TaskRow["status"],
    }))

    // Sort: overdue first, then pending/in_progress by due date, then passed
    const sorted = mapped.sort((a, b) => {
      const order = { overdue: 0, in_progress: 1, pending: 2, passed: 3 }
      const diff = order[a.status] - order[b.status]
      if (diff !== 0) return diff
      return a.dueDateRaw.localeCompare(b.dueDateRaw)
    })

    setTasks(sorted.slice(0, 8))
    setIsLoading(false)
  }, [orgId, userId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useRealtime({
    table: "checkpoints",
    filter: `org_id=eq.${orgId}`,
    callback: () => fetchTasks(),
  })

  const isPassed = (status: string) => status === "passed"
  const isOverdue = (status: string) => status === "overdue"

  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{
        border: "1px solid #E8E8E8",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        backgroundColor: "white",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #E8E8E8", backgroundColor: "#FAFAFA" }}
      >
        <span
          className="text-[13px] font-semibold"
          style={{ color: "#262626" }}
        >
          My Checkpoint Tasks
        </span>
        <span
          className="text-[11px] font-semibold cursor-pointer"
          style={{ color: "#3BA7C9" }}
          onClick={() => router.push("/calendar")}
        >
          View All &rarr;
        </span>
      </div>

      {/* Task rows */}
      <div className="flex-1">
        {isLoading ? (
          <div className="px-4 py-3 flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded animate-pulse"
                style={{ height: 36, backgroundColor: "#F5F5F5" }}
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div
            className="px-4 py-10 text-center text-[13px]"
            style={{ color: "#A3A3A3" }}
          >
            All caught up! No pending tasks.
          </div>
        ) : (
          tasks.map((task, index) => {
            const std = standardColors[task.standard] ?? {
              bg: "#F5F5F5",
              text: "#525252",
            }
            const passed = isPassed(task.status)
            const overdue = isOverdue(task.status)

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
                style={{
                  borderBottom:
                    index < tasks.length - 1
                      ? "1px solid #F0F0F0"
                      : undefined,
                  opacity: passed ? 0.6 : 1,
                }}
                onClick={() => {
                  if (!task.id.startsWith("mock-")) {
                    router.push(`/checkpoints/${task.id}`)
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#FAFAFA"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = ""
                }}
              >
                {/* Checkbox icon */}
                {passed ? (
                  <CheckCircle2
                    size={18}
                    style={{ color: "#16A34A", flexShrink: 0 }}
                  />
                ) : (
                  <Circle
                    size={18}
                    style={{
                      color: overdue ? "#DC2626" : "#D4D4D4",
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Task title */}
                <span
                  className="flex-1 text-[13px] font-medium truncate"
                  style={{
                    color: passed ? "#A3A3A3" : "#262626",
                    textDecoration: passed ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </span>

                {/* Standard badge */}
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: std.bg, color: std.text }}
                >
                  {task.standard}
                </span>

                {/* Due date */}
                <span
                  className="text-[11px] font-medium w-14 text-right shrink-0"
                  style={{ color: overdue ? "#DC2626" : "#737373" }}
                >
                  {task.dueDate}
                </span>

                {/* Status indicator */}
                {overdue && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: "#FEF2F2",
                      color: "#DC2626",
                    }}
                  >
                    <AlertTriangle size={10} />
                    Overdue
                  </span>
                )}
                {task.status === "in_progress" && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: "#E8F6FA",
                      color: "#2A8BA8",
                    }}
                  >
                    In Progress
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
