"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, X, Loader2 } from "lucide-react"
import CalendarEvent from "./calendar-event"
import { createClient } from "@/lib/supabase/client"
import { useOrg } from "@/hooks/use-org"
import { generateCheckpoints } from "@/app/(portal)/controls/generate-checkpoints"

// ── Types ───────────────────────────────────────────────
type CheckpointStatus =
  | "info"
  | "passed"
  | "failed"
  | "overdue"
  | "pending"
  | "in_progress"
  | "skipped"

interface Checkpoint {
  id: string
  day: number
  label: string
  status: CheckpointStatus
  standard: string
  control: string
  assignedTo: string
  dueDate: string
}

// ── Config ──────────────────────────────────────────────
const STATUS_CFG: Record<CheckpointStatus, { label: string; dot: string; bg: string; text: string }> = {
  info:        { label: "Info",        dot: "#3BA7C9", bg: "#E8F6FA", text: "#2A8BA8" },
  passed:      { label: "Passed",      dot: "#16A34A", bg: "#DCFCE7", text: "#15803D" },
  failed:      { label: "Failed",      dot: "#DC2626", bg: "#FEE2E2", text: "#DC2626" },
  overdue:     { label: "Overdue",     dot: "#DC2626", bg: "#FEE2E2", text: "#B91C1C" },
  pending:     { label: "Pending",     dot: "#D97706", bg: "#FEF3C7", text: "#B45309" },
  in_progress: { label: "In Progress", dot: "#3BA7C9", bg: "#E8F6FA", text: "#2A8BA8" },
  skipped:     { label: "Skipped",     dot: "#A3A3A3", bg: "#F5F5F5", text: "#737373" },
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// ── Helpers ─────────────────────────────────────────────
function firstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay() }
function daysInMonth(y: number, m: number)  { return new Date(y, m + 1, 0).getDate() }
function monthLabel(y: number, m: number)   { return `${MONTH_NAMES[m]} ${y}` }
function shiftMonth(y: number, m: number, d: number) {
  let nm = m + d, ny = y
  if (nm > 11) { nm = 0; ny++ }
  if (nm < 0)  { nm = 11; ny-- }
  return { year: ny, month: nm }
}

/** Format "YYYY-MM" period string from 0-indexed month */
function periodString(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`
}

/** Format a date string to a readable label */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Component ───────────────────────────────────────────
export default function CheckpointCalendar() {
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [view, setView]           = useState<"calendar" | "list">("calendar")
  const [showConfirm, setShowConfirm] = useState(false)
  const [sortCol, setSortCol]     = useState<"day" | "label" | "standard" | "assignedTo" | "status">("day")
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("asc")

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading]         = useState(true)
  const [generating, setGenerating]   = useState(false)
  const [generateMsg, setGenerateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const { org } = useOrg()

  const todayDay   = now.getDate()
  const todayMonth = now.getMonth()
  const todayYear  = now.getFullYear()
  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth

  // ── Fetch checkpoints for displayed month ──────────────
  const fetchCheckpoints = useCallback(async () => {
    if (!org?.id) return
    setLoading(true)

    const supabase = createClient()
    const period = periodString(viewYear, viewMonth)

    // Also fetch quarterly/semi-annual/annual periods that overlap this month
    const month1 = viewMonth + 1 // 1-indexed
    const quarterLabel = `${viewYear}-Q${Math.ceil(month1 / 3)}`
    const halfLabel = `${viewYear}-${month1 <= 6 ? "H1" : "H2"}`
    const yearLabel = `${viewYear}`

    const periods = [period, quarterLabel, halfLabel, yearLabel]

    const { data, error } = await supabase
      .from("checkpoints")
      .select(`
        id,
        status,
        due_date,
        period,
        assigned_to,
        controls ( id, code, title, standard ),
        profiles:assigned_to ( full_name )
      `)
      .eq("org_id", org.id)
      .in("period", periods)
      .order("due_date", { ascending: true })

    if (error) {
      console.error("Failed to fetch checkpoints:", error.message)
      setCheckpoints([])
      setLoading(false)
      return
    }

    // Transform DB rows into our component's Checkpoint shape
    const mapped: Checkpoint[] = (data ?? []).map((row) => {
      const ctrl = row.controls as unknown as { id: string; code: string; title: string; standard: string } | null
      const prof = row.profiles as unknown as { full_name: string } | null
      const dueDate = row.due_date as string
      const day = new Date(dueDate + "T00:00:00").getDate()

      return {
        id: row.id as string,
        day,
        label: ctrl?.title ?? "Checkpoint",
        status: row.status as CheckpointStatus,
        standard: ctrl?.standard ?? "—",
        control: ctrl?.code ?? "—",
        assignedTo: prof?.full_name ?? "Unassigned",
        dueDate: formatDate(dueDate),
      }
    })

    setCheckpoints(mapped)
    setLoading(false)
  }, [org?.id, viewYear, viewMonth])

  useEffect(() => {
    fetchCheckpoints()
  }, [fetchCheckpoints])

  // Stats (exclude "info" entries)
  const real      = checkpoints.filter(c => c.status !== "info")
  const total     = real.length
  const completed = real.filter(c => c.status === "passed").length
  const pending   = real.filter(c => c.status === "pending" || c.status === "in_progress").length
  const overdue   = real.filter(c => c.status === "overdue" || c.status === "failed").length

  // Event map: day → checkpoints
  const eventMap: Record<number, Checkpoint[]> = {}
  checkpoints.forEach(cp => {
    eventMap[cp.day] = [...(eventMap[cp.day] ?? []), cp]
  })

  // Build grid cells
  const fw    = firstWeekday(viewYear, viewMonth)
  const dim   = daysInMonth(viewYear, viewMonth)
  const cells: (number | null)[] = [
    ...Array(fw).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // Past day with incomplete checkpoints?
  function isPastIncomplete(day: number) {
    if (!isCurrentMonth || day >= todayDay) return false
    return (eventMap[day] ?? []).some(
      c => c.status === "pending" || c.status === "in_progress" || c.status === "overdue"
    )
  }

  // Sorted list data
  type SortKey = "day" | "label" | "standard" | "assignedTo" | "status"
  const sorted = [...real].sort((a, b) => {
    const av = a[sortCol as SortKey]
    const bv = b[sortCol as SortKey]
    if (av < bv) return sortDir === "asc" ? -1 : 1
    if (av > bv) return sortDir === "asc" ? 1 : -1
    return 0
  })

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => (d === "asc" ? "desc" : "asc"))
    else { setSortCol(col); setSortDir("asc") }
  }

  const next        = shiftMonth(viewYear, viewMonth, 1)
  const nextLabel   = monthLabel(next.year, next.month)
  const nextPeriod  = periodString(next.year, next.month)
  const SortArrow   = ({ col }: { col: typeof sortCol }) =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""

  function handleNavPrev() {
    const { year, month } = shiftMonth(viewYear, viewMonth, -1)
    setViewYear(year); setViewMonth(month)
  }
  function handleNavNext() {
    const { year, month } = shiftMonth(viewYear, viewMonth, 1)
    setViewYear(year); setViewMonth(month)
  }

  async function handleGenerate() {
    if (!org?.id) return
    setShowConfirm(false)
    setGenerating(true)
    setGenerateMsg(null)

    try {
      const result = await generateCheckpoints(org.id, nextPeriod)
      if (result.error) {
        setGenerateMsg({ type: "error", text: result.error })
      } else {
        const parts: string[] = []
        if (result.count > 0) parts.push(`${result.count} checkpoint${result.count !== 1 ? "s" : ""} generated`)
        if (result.skipped > 0) parts.push(`${result.skipped} skipped (already exist)`)
        if (result.count === 0 && result.skipped === 0) parts.push("No applicable controls for this period")
        setGenerateMsg({ type: "success", text: parts.join(". ") })

        // If we generated for the next month and we're viewing it, refetch
        if (next.year === viewYear && next.month === viewMonth) {
          fetchCheckpoints()
        }
      }
    } catch (err) {
      setGenerateMsg({ type: "error", text: err instanceof Error ? err.message : "Generation failed" })
    } finally {
      setGenerating(false)
    }
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{ padding: "32px" }}>

      {/* ── Page header ──────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-source-serif-4, serif)", fontSize: "24px", fontWeight: 700, color: "#171717", marginBottom: "4px", margin: 0 }}>
            Checkpoint Calendar
          </h1>
          <p style={{ fontSize: "14px", color: "#737373", marginTop: "4px" }}>
            {monthLabel(viewYear, viewMonth)} · Compliance checkpoint schedule
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={generating || !org?.id}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: generating ? "#A3A3A3" : "#2A8BA8", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: generating ? "not-allowed" : "pointer" }}
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {generating ? "Generating…" : "Generate Checkpoints"}
        </button>
      </div>

      {/* ── Generate result message ─────────────── */}
      {generateMsg && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: "16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: generateMsg.type === "success" ? "#F0FDF4" : "#FEF2F2",
            color: generateMsg.type === "success" ? "#15803D" : "#DC2626",
            border: `1px solid ${generateMsg.type === "success" ? "#BBF7D0" : "#FECACA"}`,
          }}
        >
          <span>{generateMsg.text}</span>
          <button onClick={() => setGenerateMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, display: "flex" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Stats bar ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total",           value: total,     color: "#2A8BA8", bg: "#E8F6FA" },
          { label: "Completed",       value: completed, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Pending",         value: pending,   color: "#D97706", bg: "#FFFBEB" },
          { label: "Overdue / Failed", value: overdue,  color: "#DC2626", bg: "#FEF2F2" },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            style={{ background: "#fff", border: "1px solid #E8E8E8", borderRadius: "8px", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              {label}
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color, lineHeight: 1 }}>
              {loading ? "–" : value}
            </div>
            <div style={{ fontSize: "11px", color, background: bg, borderRadius: "4px", padding: "2px 6px", display: "inline-block", marginTop: "6px", fontWeight: 600 }}>
              {MONTH_NAMES[viewMonth].slice(0, 3)} {viewYear}
            </div>
          </div>
        ))}
      </div>

      {/* ── Month nav + view toggle ───────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={handleNavPrev}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "1px solid #E8E8E8", borderRadius: "6px", background: "#fff", cursor: "pointer" }}
          >
            <ChevronLeft size={16} color="#525252" />
          </button>
          <span style={{ fontFamily: "var(--font-source-serif-4, serif)", fontSize: "17px", fontWeight: 600, color: "#262626", minWidth: 168, textAlign: "center" }}>
            {monthLabel(viewYear, viewMonth)}
          </span>
          <button
            onClick={handleNavNext}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "1px solid #E8E8E8", borderRadius: "6px", background: "#fff", cursor: "pointer" }}
          >
            <ChevronRight size={16} color="#525252" />
          </button>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", border: "1px solid #E8E8E8", borderRadius: "6px", overflow: "hidden" }}>
          {(["calendar", "list"] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                border: "none", cursor: "pointer",
                background: view === v ? "#2A8BA8" : "#fff",
                color: view === v ? "#fff" : "#525252",
                borderRight: i === 0 ? "1px solid #E8E8E8" : "none",
              }}
            >
              {v === "calendar" ? <LayoutGrid size={13} /> : <List size={13} />}
              {v === "calendar" ? "Calendar" : "List"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading state ────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#737373", gap: "8px" }}>
          <Loader2 size={18} className="animate-spin" />
          <span style={{ fontSize: "14px" }}>Loading checkpoints…</span>
        </div>
      )}

      {/* ── Calendar grid ─────────────────────────── */}
      {!loading && view === "calendar" && (
        <div style={{ background: "#fff", border: "1px solid #E8E8E8", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "2px solid #E8E8E8" }}>
            {DAY_HEADERS.map(d => (
              <div key={d} style={{ padding: "10px 0", fontSize: "11px", fontWeight: 700, color: "#737373", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em", background: "#FAFAFA" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, idx) => {
              const isToday      = isCurrentMonth && day === todayDay
              const pastBad      = day !== null && isPastIncomplete(day)
              const dayEvents    = day !== null ? (eventMap[day] ?? []) : []
              const visible      = dayEvents.slice(0, 2)
              const extra        = dayEvents.length - visible.length
              const isLastRow    = idx >= cells.length - 7
              const isLastInRow  = (idx + 1) % 7 === 0

              return (
                <div
                  key={idx}
                  style={{
                    minHeight: 96,
                    padding: "7px 6px 6px",
                    borderRight: !isLastInRow ? "1px solid #F5F5F5" : "none",
                    borderBottom: !isLastRow  ? "1px solid #F5F5F5" : "none",
                    background: day === null ? "#FAFAFA" : pastBad ? "#FFF8F8" : "#fff",
                    outline: isToday ? "2px solid #3BA7C9" : "none",
                    outlineOffset: -2,
                  }}
                >
                  {day !== null && (
                    <>
                      {/* Day number */}
                      <div style={{ marginBottom: 4 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 22, height: 22, borderRadius: "50%", fontSize: "13px",
                          fontWeight: isToday ? 700 : 400,
                          background: isToday ? "#3BA7C9" : "transparent",
                          color: isToday ? "#fff" : pastBad ? "#DC2626" : "#404040",
                        }}>
                          {day}
                        </span>
                      </div>

                      {/* Events */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {visible.map(ev => (
                          <CalendarEvent
                            key={ev.id}
                            id={ev.id}
                            label={ev.label}
                            status={ev.status}
                            standard={ev.standard}
                            dueDate={ev.dueDate}
                            assignedTo={ev.assignedTo}
                          />
                        ))}
                        {extra > 0 && (
                          <span style={{ fontSize: "10px", fontWeight: 600, color: "#3BA7C9", cursor: "pointer", paddingLeft: 4 }}>
                            +{extra} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── List view ─────────────────────────────── */}
      {!loading && view === "list" && (
        <div style={{ background: "#fff", border: "1px solid #E8E8E8", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#FAFAFA", borderBottom: "2px solid #E8E8E8" }}>
                {(
                  [
                    { col: "day",        label: "Date" },
                    { col: "label",      label: "Checkpoint" },
                    { col: "standard",   label: "Standard" },
                    { col: "assignedTo", label: "Assigned To" },
                    { col: "status",     label: "Status" },
                  ] as { col: typeof sortCol; label: string }[]
                ).map(({ col, label }) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: "11px", color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}
                  >
                    {label}<SortArrow col={col} />
                  </th>
                ))}
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: "11px", color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Control Code
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#A3A3A3", fontSize: "14px" }}>
                    No checkpoints for {monthLabel(viewYear, viewMonth)}
                  </td>
                </tr>
              )}
              {sorted.map((cp, i) => {
                const sc = STATUS_CFG[cp.status]
                return (
                  <tr key={cp.id} style={{ borderBottom: i < sorted.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                    <td style={{ padding: "11px 14px", color: "#525252", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {MONTH_NAMES[viewMonth].slice(0, 3)} {cp.day}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <Link
                        href={`/checkpoints/${cp.id}`}
                        style={{ color: "#171717", fontWeight: 500, textDecoration: "none" }}
                      >
                        {cp.label}
                      </Link>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: "11px", fontWeight: 600, background: "#E8F6FA", color: "#2A8BA8" }}>
                        {cp.standard}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", color: "#525252" }}>{cp.assignedTo}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: "11px", fontWeight: 600, background: sc.bg, color: sc.text }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", color: "#737373", fontFamily: "monospace", fontSize: "12px" }}>
                      {cp.control}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Legend ────────────────────────────────── */}
      {!loading && view === "calendar" && (
        <div style={{ display: "flex", gap: "16px", marginTop: "14px", flexWrap: "wrap", alignItems: "center" }}>
          {(Object.entries(STATUS_CFG) as [CheckpointStatus, typeof STATUS_CFG[CheckpointStatus]][])
            .filter(([k]) => k !== "info")
            .map(([key, cfg]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", color: "#525252" }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: cfg.dot, display: "inline-block", flexShrink: 0 }} />
                {cfg.label}
              </div>
            ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", color: "#525252" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#3BA7C9", display: "inline-block", flexShrink: 0 }} />
            Today
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", color: "#737373" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: "#FCA5A5", display: "inline-block", flexShrink: 0 }} />
            Past day with incomplete items
          </div>
        </div>
      )}

      {/* ── Generate Confirmation Modal ────────────── */}
      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "12px", padding: "28px 32px", maxWidth: 440, width: "100%", margin: "0 16px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-source-serif-4, serif)", fontSize: "18px", fontWeight: 700, color: "#171717", margin: 0 }}>
                Generate Checkpoints
              </h3>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3A3", padding: 0, display: "flex" }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: "14px", color: "#525252", lineHeight: 1.6, marginBottom: 8 }}>
              Generate checkpoints for{" "}
              <strong style={{ color: "#2A8BA8" }}>{nextLabel}</strong> from all active controls?
            </p>
            <p style={{ fontSize: "13px", color: "#737373", lineHeight: 1.6, marginBottom: 24 }}>
              This will create checkpoint tasks from all active controls for {nextLabel}. Existing checkpoints for this period will not be duplicated.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "1px solid #E8E8E8", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#525252", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#2A8BA8", fontSize: "13px", fontWeight: 600, color: "#fff", cursor: "pointer" }}
              >
                Generate for {nextLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
