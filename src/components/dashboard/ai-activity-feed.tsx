"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface Props {
  orgId: string
}

interface FeedEntry {
  id: string
  agent: string
  description: string
  createdAt: string
  confidence?: number
  actionLabel: string
  actionHref: string
}

const agentMeta: Record<
  string,
  { name: string; color: string; dotColor: string }
> = {
  policy_guardian: {
    name: "Policy Guardian",
    color: "#6D28D9",
    dotColor: "#6D28D9",
  },
  compliance_monitor: {
    name: "Compliance Monitor",
    color: "#2A8BA8",
    dotColor: "#3BA7C9",
  },
  evidence_librarian: {
    name: "Evidence Librarian",
    color: "#047857",
    dotColor: "#16A34A",
  },
  qm_orchestrator: {
    name: "QM Orchestrator",
    color: "#C05A2C",
    dotColor: "#C05A2C",
  },
}

// Mock data for empty orgs / demos
const MOCK_ENTRIES: FeedEntry[] = [
  {
    id: "mock-1",
    agent: "policy_guardian",
    description:
      "Found 2 potential conflicts between HIPAA and Safety policies",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    confidence: 0.87,
    actionLabel: "Review",
    actionHref: "/suggestions",
  },
  {
    id: "mock-2",
    agent: "compliance_monitor",
    description: "3 checkpoints approaching due date this week",
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    actionLabel: "Send Reminders",
    actionHref: "/calendar",
  },
  {
    id: "mock-3",
    agent: "compliance_monitor",
    description: "Generated 24 checkpoints for March 2026",
    createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    actionLabel: "View March Tasks",
    actionHref: "/calendar",
  },
  {
    id: "mock-4",
    agent: "evidence_librarian",
    description: "2 checkpoints completed without evidence uploads",
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    actionLabel: "Review",
    actionHref: "/evidence",
  },
  {
    id: "mock-5",
    agent: "qm_orchestrator",
    description: "Monthly QM packet assembled for February 2026",
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    actionLabel: "Open QM Packet",
    actionHref: "/qm",
  },
]

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 2) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return diffDay === 1 ? "1d ago" : `${diffDay}d ago`
}

function getActionForAgent(agent: string): {
  label: string
  href: string
} {
  switch (agent) {
    case "policy_guardian":
      return { label: "Review", href: "/suggestions" }
    case "compliance_monitor":
      return { label: "View Tasks", href: "/calendar" }
    case "evidence_librarian":
      return { label: "Review", href: "/evidence" }
    case "qm_orchestrator":
      return { label: "Open QM Packet", href: "/qm" }
    default:
      return { label: "View", href: "/ai" }
  }
}

export default function AIActivityFeed({ orgId }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("ai_agent_runs")
      .select("id, agent, output_summary, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (!data || data.length === 0) {
      setEntries(MOCK_ENTRIES)
      setIsLoading(false)
      return
    }

    setEntries(
      data.map((run: any) => {
        const action = getActionForAgent(run.agent)
        return {
          id: run.id,
          agent: run.agent,
          description: run.output_summary ?? "Agent run completed.",
          createdAt: run.created_at,
          actionLabel: action.label,
          actionHref: action.href,
        }
      })
    )
    setIsLoading(false)
  }, [orgId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

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
        style={{
          borderBottom: "1px solid #E8E8E8",
          backgroundColor: "#FAFAFA",
        }}
      >
        <span
          className="text-[13px] font-semibold"
          style={{ color: "#262626" }}
        >
          AI Agent Activity
        </span>
        <span
          className="text-[11px] font-semibold cursor-pointer"
          style={{ color: "#3BA7C9" }}
          onClick={() => router.push("/ai")}
        >
          View All &rarr;
        </span>
      </div>

      {/* Entries */}
      <div className="flex-1">
        {isLoading ? (
          <div className="px-4 py-3 flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded animate-pulse"
                style={{ height: 52, backgroundColor: "#F5F5F5" }}
              />
            ))}
          </div>
        ) : (
          entries.map((entry, index) => {
            const meta = agentMeta[entry.agent] ?? {
              name: entry.agent,
              color: "#737373",
              dotColor: "#737373",
            }
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    index < entries.length - 1
                      ? "1px solid #F0F0F0"
                      : undefined,
                }}
              >
                {/* Colored dot */}
                <div
                  className="rounded-full shrink-0 mt-1.5"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: meta.dotColor,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[12px] font-bold"
                      style={{ color: meta.color }}
                    >
                      {meta.name}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: "#A3A3A3" }}
                    >
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                    {entry.confidence != null && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor:
                            entry.confidence >= 0.8
                              ? "#F0FDF4"
                              : entry.confidence >= 0.6
                                ? "#FFFBEB"
                                : "#FEF2F2",
                          color:
                            entry.confidence >= 0.8
                              ? "#16A34A"
                              : entry.confidence >= 0.6
                                ? "#D97706"
                                : "#DC2626",
                        }}
                      >
                        {Math.round(entry.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[12px] leading-snug mb-2"
                    style={{ color: "#404040" }}
                  >
                    {entry.description}
                  </p>
                  <button
                    className="text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
                    style={{
                      color: "#2A8BA8",
                      backgroundColor: "#E8F6FA",
                      border: "1px solid #D0EDF5",
                    }}
                    onClick={() => router.push(entry.actionHref)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#D0EDF5"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#E8F6FA"
                    }}
                  >
                    {entry.actionLabel}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
