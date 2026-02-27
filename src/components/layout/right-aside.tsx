"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRealtime } from "@/hooks/use-realtime"

interface AsideData {
  overallScore: number | null
  policiesEffective: number
  policiesTotal: number
  controlsActive: number
  evidenceCoverage: number | null
  overdueCapa: { title: string; days: number } | null
  overdueCheckpoint: { title: string } | null
  latestInsight: { title: string; description: string } | null
  hasMockData: boolean
}

// Mock data for empty orgs
const MOCK_DATA: AsideData = {
  overallScore: 87,
  policiesEffective: 44,
  policiesTotal: 47,
  controlsActive: 36,
  evidenceCoverage: 82,
  overdueCapa: { title: "Staff Training Documentation", days: 3 },
  overdueCheckpoint: null,
  latestInsight: {
    title: "Policy conflict detected",
    description:
      "HIPAA Access Control policy may conflict with updated Safety protocol. Review recommended.",
  },
  hasMockData: true,
}

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function RightAside() {
  const router = useRouter()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [data, setData] = useState<AsideData | null>(null)

  const fetchData = useCallback(async (oid: string) => {
    const supabase = createClient()
    const period = getCurrentPeriod()

    const [
      { data: scoreRow },
      { data: checkpoints },
      { count: totalPolicies },
      { count: effectivePolicies },
      { count: activeControls },
      { data: overdueCapa },
      { data: overdueCheckpoint },
      { data: latestSuggestion },
    ] = await Promise.all([
      supabase
        .from("audit_readiness_scores")
        .select("overall_score, evidence_score")
        .eq("org_id", oid)
        .eq("period", period)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("checkpoints")
        .select("id, status")
        .eq("org_id", oid)
        .eq("period", period),
      supabase
        .from("policies")
        .select("*", { count: "exact", head: true })
        .eq("org_id", oid),
      supabase
        .from("policies")
        .select("*", { count: "exact", head: true })
        .eq("org_id", oid)
        .eq("status", "effective"),
      supabase
        .from("controls")
        .select("*", { count: "exact", head: true })
        .eq("org_id", oid)
        .eq("is_active", true),
      supabase
        .from("capas")
        .select("title, due_date")
        .eq("org_id", oid)
        .eq("status", "overdue")
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("checkpoints")
        .select("id, control:controls(title)")
        .eq("org_id", oid)
        .eq("status", "overdue")
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ai_suggestions")
        .select("title, description")
        .eq("org_id", oid)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    // Check if org has real data
    const cps = checkpoints ?? []
    const hasData =
      cps.length > 0 ||
      (totalPolicies ?? 0) > 0 ||
      (activeControls ?? 0) > 0

    if (!hasData) {
      setData(MOCK_DATA)
      return
    }

    // Compute evidence coverage: % of passed checkpoints that have evidence
    // This is approximated from audit_readiness_scores if available
    const evidenceCoverage = scoreRow?.evidence_score ?? null

    let overdueCapaInfo: { title: string; days: number } | null = null
    if (overdueCapa?.due_date) {
      const days = Math.floor(
        (Date.now() - new Date(overdueCapa.due_date + "T00:00:00").getTime()) /
          86400000
      )
      overdueCapaInfo = {
        title: overdueCapa.title,
        days: Math.max(days, 1),
      }
    }

    let overdueCheckpointInfo: { title: string } | null = null
    if (overdueCheckpoint && !overdueCapaInfo) {
      overdueCheckpointInfo = {
        title:
          (overdueCheckpoint.control as any)?.title ??
          "Overdue checkpoint",
      }
    }

    setData({
      overallScore: scoreRow?.overall_score ?? null,
      policiesEffective: effectivePolicies ?? 0,
      policiesTotal: totalPolicies ?? 0,
      controlsActive: activeControls ?? 0,
      evidenceCoverage,
      overdueCapa: overdueCapaInfo,
      overdueCheckpoint: overdueCheckpointInfo,
      latestInsight: latestSuggestion
        ? {
            title: latestSuggestion.title,
            description: latestSuggestion.description ?? "",
          }
        : null,
      hasMockData: false,
    })
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()
      if (membership?.org_id) {
        setOrgId(membership.org_id)
        fetchData(membership.org_id)
      }
    }
    init()
  }, [fetchData])

  useRealtime({
    table: "checkpoints",
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    callback: () => {
      if (orgId) fetchData(orgId)
    },
  })

  useRealtime({
    table: "ai_suggestions",
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    callback: () => {
      if (orgId) fetchData(orgId)
    },
  })

  // Use mock data while loading
  const d = data ?? MOCK_DATA

  const stats = [
    {
      label: "Audit Readiness",
      value:
        d.overallScore != null ? `${Math.round(d.overallScore)}%` : "—",
      color:
        d.overallScore != null
          ? d.overallScore >= 80
            ? "#16A34A"
            : d.overallScore >= 60
              ? "#D97706"
              : "#DC2626"
          : "#A3A3A3",
    },
    {
      label: "Policies Effective",
      value: `${d.policiesEffective}/${d.policiesTotal}`,
      color: "#3BA7C9",
    },
    {
      label: "Controls Active",
      value: String(d.controlsActive),
      color: "#2A8BA8",
    },
    {
      label: "Evidence Coverage",
      value:
        d.evidenceCoverage != null
          ? `${Math.round(d.evidenceCoverage)}%`
          : "—",
      color: "#16A34A",
    },
  ]

  // Determine most urgent attention item
  const attentionItem = d.overdueCapa
    ? {
        label: "Overdue CAPA",
        text: `${d.overdueCapa.title} is overdue by ${d.overdueCapa.days} ${d.overdueCapa.days === 1 ? "day" : "days"}`,
        href: "/capa",
      }
    : d.overdueCheckpoint
      ? {
          label: "Overdue Checkpoint",
          text: `${d.overdueCheckpoint.title} needs immediate attention`,
          href: "/calendar",
        }
      : null

  // Use mock insight if none available and we're showing mock data
  const insight = d.latestInsight ?? (d.hasMockData ? MOCK_DATA.latestInsight : null)

  return (
    <aside
      className="flex flex-col py-4 shrink-0 overflow-y-auto"
      style={{
        width: 240,
        backgroundColor: "#FAFAFA",
        borderLeft: "1px solid #E8E8E8",
      }}
    >
      {/* Compliance Summary header */}
      <div className="px-4 mb-3">
        <div
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "#2A8BA8" }}
        >
          Compliance Summary
        </div>
      </div>

      {/* Metric rows */}
      <div className="px-4 flex flex-col gap-0">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className="flex items-center justify-between py-2.5"
            style={{ borderBottom: "1px solid #F0F0F0" }}
          >
            <span className="text-[12px]" style={{ color: "#525252" }}>
              {label}
            </span>
            <span
              className="text-[12px] font-bold"
              style={{ color }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Attention Required card */}
      {attentionItem && (
        <div
          className="mx-4 mt-4 rounded-md p-3"
          style={{
            backgroundColor: "#FDF0EB",
            borderLeft: "3px solid #C05A2C",
          }}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-wide mb-1"
            style={{ color: "#9E4520" }}
          >
            Attention Required
          </div>
          <p
            className="text-[11px] leading-snug mb-2"
            style={{ color: "#C05A2C" }}
          >
            {attentionItem.text}
          </p>
          <span
            className="text-[11px] font-semibold cursor-pointer"
            style={{ color: "#9E4520" }}
            onClick={() => router.push(attentionItem.href)}
          >
            View &rarr;
          </span>
        </div>
      )}

      {/* AI Insight card */}
      {insight && (
        <div
          className="mx-4 mt-3 rounded-md p-3"
          style={{
            backgroundColor: "#E8F6FA",
            borderLeft: "3px solid #3BA7C9",
          }}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-wide mb-1"
            style={{ color: "#2A8BA8" }}
          >
            AI Insight
          </div>
          <p
            className="text-[11px] font-medium leading-snug mb-1"
            style={{ color: "#1E6A82" }}
          >
            {insight.title}
          </p>
          <p
            className="text-[11px] leading-snug mb-2"
            style={{ color: "#2A8BA8" }}
          >
            {insight.description}
          </p>
          <span
            className="text-[11px] font-semibold cursor-pointer"
            style={{ color: "#2A8BA8" }}
            onClick={() => router.push("/suggestions")}
          >
            Review &rarr;
          </span>
        </div>
      )}
    </aside>
  )
}
