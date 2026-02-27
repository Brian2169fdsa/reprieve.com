"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"
import { Shield, CheckCircle2, Target, AlertCircle } from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

interface Props {
  orgId: string
  period: string
}

interface StatsData {
  activeCheckpoints: number
  completedCheckpoints: number
  totalCheckpoints: number
  auditScore: number | null
  prevAuditScore: number | null
  openCapas: number
  inProgressCapas: number
  overdueCapas: number
  hasMockData: boolean
}

// Mock data for empty orgs / demos
const MOCK_STATS: StatsData = {
  activeCheckpoints: 18,
  completedCheckpoints: 18,
  totalCheckpoints: 24,
  auditScore: 87,
  prevAuditScore: 82,
  openCapas: 4,
  inProgressCapas: 2,
  overdueCapas: 1,
  hasMockData: true,
}

const MOCK_TREND = [
  { month: "Sep", score: 72 },
  { month: "Oct", score: 76 },
  { month: "Nov", score: 79 },
  { month: "Dec", score: 82 },
  { month: "Jan", score: 84 },
  { month: "Feb", score: 87 },
]

function getPreviousPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number)
  const d = new Date(year, month - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#16A34A"
  if (score >= 60) return "#D97706"
  return "#DC2626"
}

function getScoreBg(score: number): string {
  if (score >= 80) return "#F0FDF4"
  if (score >= 60) return "#FFFBEB"
  return "#FEF2F2"
}

export default function StatsGrid({ orgId, period }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [trendData, setTrendData] = useState<{ month: string; score: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const prevPeriod = getPreviousPeriod(period)

    const [
      { data: checkpoints },
      { count: openCapas },
      { count: inProgressCapas },
      { count: overdueCapas },
      { data: currentScoreRow },
      { data: prevScoreRow },
      { data: scoreHistory },
    ] = await Promise.all([
      supabase
        .from("checkpoints")
        .select("status")
        .eq("org_id", orgId)
        .eq("period", period),
      supabase
        .from("capas")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["open", "in_progress", "pending_verification", "overdue"]),
      supabase
        .from("capas")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "in_progress"),
      supabase
        .from("capas")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "overdue"),
      supabase
        .from("audit_readiness_scores")
        .select("overall_score")
        .eq("org_id", orgId)
        .eq("period", period)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("audit_readiness_scores")
        .select("overall_score")
        .eq("org_id", orgId)
        .eq("period", prevPeriod)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("audit_readiness_scores")
        .select("period, overall_score")
        .eq("org_id", orgId)
        .order("period", { ascending: true })
        .limit(6),
    ])

    const cps = checkpoints ?? []
    const active = cps.filter(
      (c) => c.status === "pending" || c.status === "in_progress"
    ).length
    const completed = cps.filter(
      (c) => c.status === "passed" || c.status === "failed"
    ).length

    // If org has no checkpoints at all, use mock data
    if (cps.length === 0 && !currentScoreRow && (openCapas ?? 0) === 0) {
      setStats(MOCK_STATS)
      setTrendData(MOCK_TREND)
      setIsLoading(false)
      return
    }

    setStats({
      activeCheckpoints: active,
      completedCheckpoints: completed,
      totalCheckpoints: cps.length,
      auditScore: currentScoreRow?.overall_score ?? null,
      prevAuditScore: prevScoreRow?.overall_score ?? null,
      openCapas: openCapas ?? 0,
      inProgressCapas: inProgressCapas ?? 0,
      overdueCapas: overdueCapas ?? 0,
      hasMockData: false,
    })

    // Build trend data from score history
    if (scoreHistory && scoreHistory.length > 0) {
      setTrendData(
        scoreHistory.map((s: { period: string; overall_score: number | null }) => {
          const [, m] = s.period.split("-")
          const monthName = new Date(2026, parseInt(m) - 1).toLocaleString(
            "default",
            { month: "short" }
          )
          return { month: monthName, score: s.overall_score ?? 0 }
        })
      )
    } else {
      setTrendData([])
    }

    setIsLoading(false)
  }, [orgId, period])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useRealtime({
    table: "checkpoints",
    filter: `org_id=eq.${orgId}`,
    callback: () => fetchStats(),
  })

  if (isLoading) {
    return (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg animate-pulse"
            style={{
              height: 110,
              backgroundColor: "#F5F5F5",
              border: "1px solid #E8E8E8",
            }}
          />
        ))}
      </div>
    )
  }

  if (!stats) return null

  const auditTrend =
    stats.auditScore != null && stats.prevAuditScore != null
      ? stats.auditScore - stats.prevAuditScore
      : null

  const completionPct =
    stats.totalCheckpoints > 0
      ? Math.round((stats.completedCheckpoints / stats.totalCheckpoints) * 100)
      : 0

  const auditColor = stats.auditScore != null ? getScoreColor(stats.auditScore) : "#A3A3A3"
  const auditBg = stats.auditScore != null ? getScoreBg(stats.auditScore) : "#F5F5F5"
  const sparkTrend = trendData.length > 0 ? trendData : MOCK_TREND

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
    >
      {/* Card 1: Active Checkpoints */}
      <div
        className="rounded-lg p-4 flex flex-col justify-between"
        style={{
          backgroundColor: "white",
          border: "1px solid #E8E8E8",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          minHeight: 110,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "#737373" }}
          >
            Active Checkpoints
          </span>
          <div
            className="flex items-center justify-center rounded-md"
            style={{
              width: 28,
              height: 28,
              backgroundColor: "#E8F6FA",
            }}
          >
            <Shield size={14} style={{ color: "#2A8BA8" }} />
          </div>
        </div>
        <div>
          <span
            className="text-[32px] font-bold leading-none"
            style={{ color: "#2A8BA8" }}
          >
            {stats.activeCheckpoints}
          </span>
          <p
            className="text-[11px] font-medium mt-1"
            style={{ color: "#737373" }}
          >
            pending or in progress
          </p>
        </div>
      </div>

      {/* Card 2: Completed This Month */}
      <div
        className="rounded-lg p-4 flex flex-col justify-between"
        style={{
          backgroundColor: "white",
          border: "1px solid #E8E8E8",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          minHeight: 110,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "#737373" }}
          >
            Completed This Month
          </span>
          <div
            className="flex items-center justify-center rounded-md"
            style={{
              width: 28,
              height: 28,
              backgroundColor: "#F0FDF4",
            }}
          >
            <CheckCircle2 size={14} style={{ color: "#16A34A" }} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[32px] font-bold leading-none"
              style={{ color: "#16A34A" }}
            >
              {stats.completedCheckpoints}/{stats.totalCheckpoints}
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "#16A34A" }}
            >
              {completionPct}%
            </span>
          </div>
          {/* Progress bar */}
          <div
            className="mt-2 rounded-full overflow-hidden"
            style={{ height: 4, backgroundColor: "#E8E8E8" }}
          >
            <div
              className="rounded-full transition-all"
              style={{
                width: `${completionPct}%`,
                height: "100%",
                backgroundColor: "#16A34A",
              }}
            />
          </div>
        </div>
      </div>

      {/* Card 3: Audit Readiness */}
      <div
        className="rounded-lg p-4 flex flex-col justify-between"
        style={{
          backgroundColor: "white",
          border: "1px solid #E8E8E8",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          minHeight: 110,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "#737373" }}
          >
            Audit Readiness
          </span>
          <div
            className="flex items-center justify-center rounded-md"
            style={{
              width: 28,
              height: 28,
              backgroundColor: auditBg,
            }}
          >
            <Target size={14} style={{ color: auditColor }} />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-[32px] font-bold leading-none"
                style={{ color: auditColor }}
              >
                {stats.auditScore != null
                  ? `${Math.round(stats.auditScore)}%`
                  : "—"}
              </span>
              {auditTrend != null && (
                <span
                  className="text-[12px] font-semibold"
                  style={{
                    color: auditTrend >= 0 ? "#16A34A" : "#DC2626",
                  }}
                >
                  {auditTrend >= 0 ? "+" : ""}
                  {Math.round(auditTrend)}%{" "}
                  {auditTrend >= 0 ? "\u2191" : "\u2193"}
                </span>
              )}
            </div>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: "#737373" }}
            >
              {auditTrend != null ? "vs. last month" : "current period"}
            </p>
          </div>
          {/* Mini sparkline */}
          <div style={{ width: 72, height: 28 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkTrend}>
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={auditColor}
                  fill={auditBg}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Card 4: Open CAPAs */}
      <div
        className="rounded-lg p-4 flex flex-col justify-between"
        style={{
          backgroundColor: "white",
          border: "1px solid #E8E8E8",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          minHeight: 110,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "#737373" }}
          >
            Open CAPAs
          </span>
          <div
            className="flex items-center justify-center rounded-md"
            style={{
              width: 28,
              height: 28,
              backgroundColor: "#FDF0EB",
            }}
          >
            <AlertCircle size={14} style={{ color: "#C05A2C" }} />
          </div>
        </div>
        <div>
          <span
            className="text-[32px] font-bold leading-none"
            style={{ color: "#C05A2C" }}
          >
            {stats.openCapas}
          </span>
          <p
            className="text-[11px] font-medium mt-1"
            style={{ color: "#737373" }}
          >
            {stats.inProgressCapas > 0 && (
              <span>
                {stats.inProgressCapas} in progress
              </span>
            )}
            {stats.inProgressCapas > 0 && stats.overdueCapas > 0 && (
              <span> &middot; </span>
            )}
            {stats.overdueCapas > 0 && (
              <span style={{ color: "#DC2626" }}>
                {stats.overdueCapas} overdue
              </span>
            )}
            {stats.inProgressCapas === 0 && stats.overdueCapas === 0 && (
              <span>none overdue</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
