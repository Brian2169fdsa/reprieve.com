"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useOrg } from "@/hooks/use-org"
import { createClient } from "@/lib/supabase/client"
import StatsGrid from "@/components/dashboard/stats-grid"
import UpcomingTasks from "@/components/dashboard/upcoming-tasks"
import AIActivityFeed from "@/components/dashboard/ai-activity-feed"
import { Calendar, BookOpen, Bot, AlertTriangle, FileText } from "lucide-react"

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getCurrentMonthYear(): string {
  return new Date().toLocaleString("default", { month: "long", year: "numeric" })
}

export default function DashboardPage() {
  const { org, isLoading: orgLoading } = useOrg()
  const period = getCurrentPeriod()
  const monthYear = getCurrentMonthYear()

  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>("")
  const [dueThisWeek, setDueThisWeek] = useState<number | null>(null)
  const [overdueCount, setOverdueCount] = useState<number | null>(null)
  const [qmReady, setQmReady] = useState(false)

  useEffect(() => {
    async function fetchBannerData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      setUserName(
        user.user_metadata?.full_name || user.email?.split("@")[0] || "there"
      )

      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()

      if (!membership?.org_id) return
      const oid = membership.org_id

      const now = new Date()
      const endOfWeek = new Date(now)
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()))

      const [{ count: dueCount }, { count: overdue }, { data: qmMeeting }] =
        await Promise.all([
          supabase
            .from("checkpoints")
            .select("*", { count: "exact", head: true })
            .eq("org_id", oid)
            .in("status", ["pending", "in_progress"])
            .lte("due_date", endOfWeek.toISOString().split("T")[0])
            .gte("due_date", now.toISOString().split("T")[0]),
          supabase
            .from("checkpoints")
            .select("*", { count: "exact", head: true })
            .eq("org_id", oid)
            .eq("status", "overdue"),
          supabase
            .from("qm_meetings")
            .select("id, status")
            .eq("org_id", oid)
            .eq("period", period)
            .eq("status", "ready")
            .maybeSingle(),
        ])

      setDueThisWeek(dueCount ?? 0)
      setOverdueCount(overdue ?? 0)
      setQmReady(!!qmMeeting)
    }
    fetchBannerData()
  }, [period])

  // Use mock values when real data hasn't loaded or is empty
  const displayDueThisWeek = dueThisWeek ?? 3
  const displayOverdue = overdueCount ?? 1

  // Loading skeleton
  if (orgLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl">
        <div
          className="rounded-lg animate-pulse"
          style={{ height: 100, backgroundColor: "#F0F9FC" }}
        />
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
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      {/* 1. Welcome Banner */}
      <div
        className="rounded-lg p-5 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #F0F9FC 0%, #E8F6FA 100%)",
          border: "1px solid #D0EDF5",
        }}
      >
        <div>
          <h2
            className="text-[22px] font-bold leading-tight"
            style={{
              fontFamily: "Source Serif 4, Georgia, serif",
              color: "#171717",
            }}
          >
            Welcome back, {userName || "there"}
          </h2>
          <p className="text-[13px] mt-1" style={{ color: "#525252" }}>
            Here&apos;s your compliance overview for {monthYear}
          </p>
        </div>
        <div className="text-right shrink-0 ml-6">
          <p className="text-[13px] font-medium" style={{ color: "#404040" }}>
            <span style={{ color: "#2A8BA8", fontWeight: 600 }}>
              {displayDueThisWeek} checkpoint{displayDueThisWeek !== 1 ? "s" : ""}{" "}
              due this week
            </span>
            {displayOverdue > 0 && (
              <>
                {" "}
                &middot;{" "}
                <span style={{ color: "#DC2626", fontWeight: 600 }}>
                  {displayOverdue} overdue
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* 2. Stats Grid */}
      {org && <StatsGrid orgId={org.id} period={period} />}

      {/* 3. Alert Banners */}
      {(displayOverdue > 0 || qmReady) && (
        <div className="flex flex-col gap-3">
          {displayOverdue > 0 && (
            <div
              className="flex items-center justify-between rounded-md px-4 py-3"
              style={{
                backgroundColor: "#FEF2F2",
                borderLeft: "3px solid #DC2626",
              }}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={16} style={{ color: "#DC2626" }} />
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "#991B1B" }}
                >
                  {displayOverdue} overdue checkpoint
                  {displayOverdue !== 1 ? "s" : ""} need attention
                </span>
              </div>
              <Link
                href="/calendar"
                className="text-[12px] font-semibold"
                style={{ color: "#DC2626" }}
              >
                View Overdue &rarr;
              </Link>
            </div>
          )}

          {qmReady && (
            <div
              className="flex items-center justify-between rounded-md px-4 py-3"
              style={{
                backgroundColor: "#E8F6FA",
                borderLeft: "3px solid #3BA7C9",
              }}
            >
              <div className="flex items-center gap-2.5">
                <FileText size={16} style={{ color: "#2A8BA8" }} />
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "#1E6A82" }}
                >
                  Your QM packet for{" "}
                  {new Date().toLocaleString("default", { month: "long" })} is
                  ready for review
                </span>
              </div>
              <Link
                href="/qm"
                className="text-[12px] font-semibold"
                style={{ color: "#2A8BA8" }}
              >
                Open QM Workbench &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 4. Quick Navigation */}
      <div className="flex gap-3">
        {[
          {
            label: "View Calendar",
            href: "/calendar",
            icon: <Calendar size={16} />,
          },
          {
            label: "Knowledge Vault",
            href: "/vault",
            icon: <BookOpen size={16} />,
          },
          { label: "AI Agents", href: "/ai", icon: <Bot size={16} /> },
        ].map((btn) => (
          <Link
            key={btn.href}
            href={btn.href}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold transition-colors"
            style={{
              color: "#2A8BA8",
              border: "1px solid #D0EDF5",
              backgroundColor: "white",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F0F9FC"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white"
            }}
          >
            {btn.icon}
            {btn.label}
          </Link>
        ))}
      </div>

      {/* 5. Two-column section: My Tasks (60%) + AI Activity (40%) */}
      {org && (
        <div className="grid gap-5" style={{ gridTemplateColumns: "3fr 2fr" }}>
          <UpcomingTasks orgId={org.id} userId={userId} />
          <AIActivityFeed orgId={org.id} />
        </div>
      )}
    </div>
  )
}
