"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, X, Loader2 } from "lucide-react"
import CalendarEvent from "./calendar-event"
import CheckpointPopover, { type CalendarDayEvent } from "./checkpoint-popover"
import { createClient } from "@/lib/supabase/client"
import { useOrg } from "@/hooks/use-org"
import { generateCheckpoints } from "@/app/(portal)/controls/generate-checkpoints"

// ── Types ───────────────────────────────────────────────────────────────
type CheckpointStatus =
  | "info" | "passed" | "failed" | "overdue"
  | "pending" | "in_progress" | "skipped"

// ── Config ──────────────────────────────────────────────────────────────
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

// ── Helpers ─────────────────────────────────────────────────────────────
function firstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay() }
function daysInMonth(y: number, m: number)  { return new Date(y, m + 1, 0).getDate() }
function monthLabel(y: number, m: number)   { return `${MONTH_NAMES[m]} ${y}` }
function shiftMonth(y: number, m: number, d: number) {
  let nm = m + d, ny = y
  if (nm > 11) { nm = 0; ny++ }
  if (nm < 0)  { nm = 11; ny-- }
  return { year: ny, month: nm }
}
function periodString(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`
}

// ── Mock data (used when no DB checkpoints exist) ────────────────────────
function generateMockData(year: number, month: number): CalendarDayEvent[] {
  const mockDefs: { day: number; label: string; standard: string; status: CheckpointStatus; assignedTo: string }[] = [
    { day: 1,  label: "Monthly Checkpoints Generated",  standard: "Internal",   status: "info",        assignedTo: "System" },
    { day: 2,  label: "OIG Exclusion Screening",        standard: "OIG",        status: "passed",      assignedTo: "Sarah Chen" },
    { day: 3,  label: "Staff Background Check Audit",   standard: "HR",         status: "passed",      assignedTo: "David Kim" },
    { day: 4,  label: "Medication Count Verification",  standard: "Safety",     status: "passed",      assignedTo: "Maria Rodriguez" },
    { day: 5,  label: "Credential Verification Review", standard: "HR",         status: "pending",     assignedTo: "David Kim" },
    { day: 6,  label: "Client Rights Posting Check",    standard: "AHCCCS",     status: "passed",      assignedTo: "Wayne Giles" },
    { day: 7,  label: "Weekend Safety Inspection",      standard: "Safety",     status: "passed",      assignedTo: "Maria Rodriguez" },
    { day: 8,  label: "Incident Report Review",         standard: "Safety",     status: "passed",      assignedTo: "Maria Rodriguez" },
    { day: 9,  label: "Policy Update Review",           standard: "Internal",   status: "passed",      assignedTo: "Sarah Chen" },
    { day: 10, label: "HIPAA Access Log Audit",         standard: "HIPAA",      status: "passed",      assignedTo: "Sarah Chen" },
    { day: 11, label: "Group Session Documentation",    standard: "AHCCCS",     status: "passed",      assignedTo: "James Williams" },
    { day: 12, label: "Fire Drill Log",                 standard: "Safety",     status: "failed",      assignedTo: "Maria Rodriguez" },
    { day: 13, label: "Treatment Plan Review",          standard: "AHCCCS",     status: "passed",      assignedTo: "James Williams" },
    { day: 14, label: "Staff Training Verification",    standard: "HR",         status: "passed",      assignedTo: "David Kim" },
    { day: 15, label: "Medication Storage Temp Check",  standard: "Safety",     status: "pending",     assignedTo: "Maria Rodriguez" },
    { day: 16, label: "Telehealth Compliance Check",    standard: "HIPAA",      status: "passed",      assignedTo: "Sarah Chen" },
    { day: 17, label: "Grievance Log Review",           standard: "Operations", status: "passed",      assignedTo: "Wayne Giles" },
    { day: 18, label: "Chart Audit (IOP)",              standard: "AHCCCS",     status: "passed",      assignedTo: "James Williams" },
    { day: 19, label: "Emergency Equipment Check",      standard: "Safety",     status: "passed",      assignedTo: "Maria Rodriguez" },
    { day: 20, label: "CAPA Follow-Up Review",          standard: "Quality",    status: "overdue",     assignedTo: "Sarah Chen" },
    { day: 21, label: "Informed Consent Audit",         standard: "AHCCCS",     status: "pending",     assignedTo: "James Williams" },
    { day: 22, label: "Housekeeping Inspection",        standard: "Safety",     status: "passed",      assignedTo: "Maria Rodriguez" },
    { day: 23, label: "Peer Support Documentation",     standard: "AHCCCS",     status: "passed",      assignedTo: "James Williams" },
    { day: 24, label: "Insurance Verification Audit",   standard: "Operations", status: "pending",     assignedTo: "Wayne Giles" },
    { day: 25, label: "Monthly Compliance Report",      standard: "Internal",   status: "in_progress", assignedTo: "Sarah Chen" },
    { day: 26, label: "Discharge Planning Review",      standard: "AHCCCS",     status: "pending",     assignedTo: "James Williams" },
    { day: 27, label: "OIG Exclusion Re-check",         standard: "OIG",        status: "pending",     assignedTo: "Sarah Chen" },
    { day: 28, label: "Staff Training Verification",    standard: "HR",         status: "pending",     assignedTo: "David Kim" },
  ]

  const dim = daysInMonth(year, month)
  return mockDefs
    .filter(d => d.day <= dim)
    .map(d => ({
      id: `mock-${year}-${month}-${d.day}`,
      day: d.day,
      label: d.label,
      status: d.status,
      standard: d.standard,
      control: "",
      assignedTo: d.assignedTo,
      dueDate: `${MONTH_NAMES[month].slice(0, 3)} ${d.day}, ${year}`,
      isAI: d.day === 1,
      isMock: true,
    }))
}

// ── Component ────────────────────────────────────────────────────────────
export default function CheckpointCalendar() {
  const todayDate   = new Date()
  const TODAY_DAY   = todayDate.getDate()
  const TODAY_MONTH = todayDate.getMonth()
  const TODAY_YEAR  = todayDate.getFullYear()

  const [viewYear, setViewYear]   = useState(TODAY_YEAR)
  const [viewMonth, setViewMonth] = useState(TODAY_MONTH)
  const [view, setView]           = useState<"calendar" | "list">("calendar")
  const [checkpoints, setCheckpoints] = useState<CalendarDayEvent[]>([])
  const [loading, setLoading]         = useState(false)
  const [usingMocks, setUsingMocks]   = useState(false)
  const [userId, setUserId]           = useState<string | null>(null)

  // Generate checkpoints confirm
  const [showConfirm, setShowConfirm]     = useState(false)
  const [generating, setGenerating]       = useState(false)
  const [generateMsg, setGenerateMsg]     = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Popover state — which day is selected (null = closed)
  const [popoverDay, setPopoverDay] = useState<number | null>(null)

  // Sorting for list view
  const [sortCol, setSortCol] = useState<"day" | "label" | "standard" | "assignedTo" | "status">("day")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const { org, isLoading: orgLoading } = useOrg()
  const isCurrentMonth = viewYear === TODAY_YEAR && viewMonth === TODAY_MONTH
  // Show setup modal when a day is clicked but org isn't loaded yet
  const [showNoOrgModal, setShowNoOrgModal] = useState(false)

  // ── Get current user ─────────────────────────────────────────────────
  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  // ── Fetch checkpoints ────────────────────────────────────────────────
  const fetchCheckpoints = useCallback(async (orgId: string, year: number, month: number) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`
      const lastDay  = new Date(year, month + 1, 0).toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("checkpoints")
        .select(`
          id, status, due_date, period, assigned_to,
          control:controls!control_id(title, code, standard),
          assignee:profiles!assigned_to(full_name)
        `)
        .eq("org_id", orgId)
        .gte("due_date", firstDay)
        .lte("due_date", lastDay)

      if (error) { console.error("fetchCheckpoints:", error); return }

      if (!data || data.length === 0) {
        setCheckpoints(generateMockData(year, month))
        setUsingMocks(true)
        return
      }

      const mapped: CalendarDayEvent[] = data.map(row => {
        const ctrl     = row.control as unknown as { title: string; code: string; standard: string } | null
        const assignee = row.assignee as unknown as { full_name: string } | null
        const due      = new Date((row.due_date as string) + "T12:00:00")
        return {
          id:         row.id as string,
          day:        due.getDate(),
          label:      ctrl?.title ?? "Unknown",
          status:     (row.status as CheckpointStatus) ?? "pending",
          standard:   ctrl?.standard ?? "",
          control:    ctrl?.code ?? "",
          assignedTo: assignee?.full_name ?? "Unassigned",
          dueDate:    `${MONTH_NAMES[due.getMonth()].slice(0, 3)} ${due.getDate()}, ${due.getFullYear()}`,
          isAI:       !(row.assigned_to),
          isMock:     false,
        }
      })

      setCheckpoints(mapped)
      setUsingMocks(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (org?.id) {
      fetchCheckpoints(org.id, viewYear, viewMonth)
    } else {
      setCheckpoints(generateMockData(viewYear, viewMonth))
      setUsingMocks(true)
      setLoading(false)
    }
  }, [org?.id, viewYear, viewMonth, fetchCheckpoints])

  // ── Stats ────────────────────────────────────────────────────────────
  const real      = checkpoints.filter(c => c.status !== "info")
  const total     = real.length
  const completed = real.filter(c => c.status === "passed").length
  const pending   = real.filter(c => c.status === "pending" || c.status === "in_progress").length
  const overdue   = real.filter(c => c.status === "overdue" || c.status === "failed").length

  // ── Event map: day → events[] ────────────────────────────────────────
  const eventMap: Record<number, CalendarDayEvent[]> = {}
  checkpoints.forEach(cp => {
    if (!eventMap[cp.day]) eventMap[cp.day] = []
    eventMap[cp.day].push(cp)
  })

  // ── Grid cells ───────────────────────────────────────────────────────
  const fw    = firstWeekday(viewYear, viewMonth)
  const dim   = daysInMonth(viewYear, viewMonth)
  const cells: (number | null)[] = [
    ...Array(fw).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function isPastIncomplete(day: number) {
    if (!isCurrentMonth || day >= TODAY_DAY) return false
    return (eventMap[day] ?? []).some(
      c => c.status === "pending" || c.status === "in_progress" || c.status === "overdue"
    )
  }

  // ── Sorted list ──────────────────────────────────────────────────────
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

  const next      = shiftMonth(viewYear, viewMonth, 1)
  const nextLabel = monthLabel(next.year, next.month)
  const SortArrow = ({ col }: { col: typeof sortCol }) =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""

  function handleNavPrev() {
    const { year, month } = shiftMonth(viewYear, viewMonth, -1)
    setViewYear(year); setViewMonth(month)
    setGenerateMsg(null); setGenerateError(null)
    setPopoverDay(null)
  }
  function handleNavNext() {
    const { year, month } = shiftMonth(viewYear, viewMonth, 1)
    setViewYear(year); setViewMonth(month)
    setGenerateMsg(null); setGenerateError(null)
    setPopoverDay(null)
  }

  async function handleGenerate() {
    if (!org?.id) return
    setShowConfirm(false)
    setGenerating(true)
    setGenerateMsg(null)
    setGenerateError(null)
    try {
      const period = periodString(next.year, next.month)
      const result = await generateCheckpoints(org.id, period)
      if (result.error) {
        setGenerateError(result.error)
      } else if (result.count === 0 && result.skipped === 0) {
        setGenerateMsg(`No active controls match ${nextLabel}.`)
      } else {
        setGenerateMsg(
          `Generated ${result.count} checkpoint${result.count !== 1 ? "s" : ""} for ${nextLabel}` +
          (result.skipped > 0 ? ` (${result.skipped} already existed).` : ".")
        )
        setViewYear(next.year)
        setViewMonth(next.month)
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setGenerating(false)
    }
  }

  function handleDayClick(day: number) {
    if (!org?.id) { setShowNoOrgModal(true); return }
    setPopoverDay(day)
  }

  function handleEventClick(id: string, day: number) {
    // For mock data, still open popover (shows sample state)
    setPopoverDay(day)
    // If multiple events on the day, find the index of this one
    const eventsOnDay = eventMap[day] ?? []
    const idx = eventsOnDay.findIndex(e => e.id === id)
    // We need to set the active index — we'll track it via a separate state
    // For simplicity, set popover to day (popover internally handles first event)
    // The user can navigate between events using the arrows inside the popover
    if (idx > 0) {
      // Pass a hint — for now, open popover at day; user navigates inside
    }
  }

  function handleRefresh() {
    if (org?.id) fetchCheckpoints(org.id, viewYear, viewMonth)
    else {
      setCheckpoints(generateMockData(viewYear, viewMonth))
      setUsingMocks(true)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px" }}>

      {/* ── Page header ──────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-source-serif-4, serif)", fontSize: "24px", fontWeight: 700, color: "#171717", margin: 0 }}>
            Checkpoint Calendar
          </h1>
          <p style={{ fontSize: "14px", color: "#737373", marginTop: "4px", marginBottom: 0 }}>
            {monthLabel(viewYear, viewMonth)} · Click any day to view or create checkpoints
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { if (!org?.id) { setShowNoOrgModal(true); return } setPopoverDay(-1) }}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              background: "#fff", color: "#2A8BA8",
              border: "1px solid #E8E8E8", borderRadius: "6px", fontSize: "13px", fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Add Checkpoint
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={generating || !org?.id}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              background: generating || !org?.id ? "#A3A3A3" : "#2A8BA8",
              color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600,
              cursor: generating || !org?.id ? "not-allowed" : "pointer",
            }}
          >
            {generating
              ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              : <Plus size={14} />
            }
            {generating ? "Generating..." : "Generate Checkpoints"}
          </button>
        </div>
      </div>

      {/* ── Banners ──────────────────────────────────────────── */}
      {usingMocks && (
        <div style={{ padding: "10px 14px", background: "#E8F6FA", border: "1px solid #B5E3F0", borderRadius: "6px", color: "#2A8BA8", fontSize: "13px", fontWeight: 500, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Showing sample data. Generate checkpoints or click a day to add one.</span>
          <button onClick={() => { setUsingMocks(false); setCheckpoints([]) }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2A8BA8", fontSize: "18px", lineHeight: 1, padding: "0 0 0 12px" }}>×</button>
        </div>
      )}
      {generateMsg && (
        <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "6px", color: "#15803D", fontSize: "13px", fontWeight: 500, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {generateMsg}
          <button onClick={() => setGenerateMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#15803D", fontSize: "18px", lineHeight: 1, padding: "0 0 0 12px" }}>×</button>
        </div>
      )}
      {generateError && (
        <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "6px", color: "#DC2626", fontSize: "13px", fontWeight: 500, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {generateError}
          <button onClick={() => setGenerateError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: "18px", lineHeight: 1, padding: "0 0 0 12px" }}>×</button>
        </div>
      )}

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total",            value: total,     color: "#2A8BA8", bg: "#E8F6FA" },
          { label: "Completed",        value: completed, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Pending",          value: pending,   color: "#D97706", bg: "#FFFBEB" },
          { label: "Overdue / Failed", value: overdue,   color: "#DC2626", bg: "#FEF2F2" },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            style={{ background: "#fff", border: "1px solid #E8E8E8", borderRadius: "8px", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              {label}
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color, lineHeight: 1 }}>
              {loading ? <span style={{ fontSize: "16px", color: "#A3A3A3" }}>...</span> : value}
            </div>
            <div style={{ fontSize: "11px", color, background: bg, borderRadius: "4px", padding: "2px 6px", display: "inline-block", marginTop: "6px", fontWeight: 600 }}>
              {MONTH_NAMES[viewMonth].slice(0, 3)} {viewYear}
            </div>
          </div>
        ))}
      </div>

      {/* ── Month nav + view toggle ───────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
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

      {/* ── Loading ──────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#737373", gap: 10 }}>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          Loading checkpoints...
        </div>
      )}

      {/* ── CALENDAR GRID ────────────────────────────────────── */}
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

          {/* Day cells — EVERY valid cell is clickable */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, idx) => {
              const isToday     = isCurrentMonth && day === TODAY_DAY
              const pastBad     = day !== null && isPastIncomplete(day)
              const dayEvents   = day !== null ? (eventMap[day] ?? []) : []
              const visible     = dayEvents.slice(0, 2)
              const extra       = dayEvents.length - visible.length
              const isLastRow   = idx >= cells.length - 7
              const isLastInRow = (idx + 1) % 7 === 0
              const isSelected  = popoverDay === day

              return (
                <div
                  key={idx}
                  onClick={day !== null ? () => handleDayClick(day) : undefined}
                  style={{
                    minHeight: 96,
                    padding: "7px 6px 6px",
                    borderRight:  !isLastInRow ? "1px solid #F5F5F5" : "none",
                    borderBottom: !isLastRow   ? "1px solid #F5F5F5" : "none",
                    background: day === null ? "#FAFAFA"
                      : isSelected ? "#F0F9FC"
                      : pastBad    ? "#FFF8F8"
                      : "#fff",
                    outline: isToday ? "2px solid #3BA7C9" : "none",
                    outlineOffset: -2,
                    cursor: day !== null ? "pointer" : "default",
                    position: "relative",
                    transition: "background 0.1s",
                  }}
                  className={day !== null ? "calendar-day-cell" : ""}
                >
                  {day !== null && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 22, height: 22, borderRadius: "50%", fontSize: "13px",
                          fontWeight: isToday ? 700 : 400,
                          background: isToday ? "#3BA7C9" : "transparent",
                          color: isToday ? "#fff" : pastBad ? "#DC2626" : "#404040",
                        }}>
                          {day}
                        </span>
                        {/* Show a tiny + hint on hover for empty days */}
                        {dayEvents.length === 0 && (
                          <span
                            className="day-add-hint"
                            style={{
                              fontSize: "16px", color: "#D4D4D4", lineHeight: 1,
                              opacity: 0, transition: "opacity 0.15s", pointerEvents: "none",
                            }}
                          >
                            +
                          </span>
                        )}
                        {/* Event count badge for 3+ events */}
                        {dayEvents.length > 2 && (
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#3BA7C9", background: "#E8F6FA", borderRadius: "10px", padding: "1px 5px" }}>
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

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
                            isAI={ev.isAI}
                            onClick={(id) => { handleEventClick(id, day) }}
                          />
                        ))}
                        {extra > 0 && (
                          <span style={{ fontSize: "10px", fontWeight: 600, color: "#3BA7C9", paddingLeft: 4 }}>
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

      {/* ── LIST VIEW ─────────────────────────────────────────── */}
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
                  Code
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
                const sc = STATUS_CFG[cp.status as CheckpointStatus] ?? STATUS_CFG.pending
                return (
                  <tr
                    key={cp.id}
                    onClick={() => handleDayClick(cp.day)}
                    style={{ borderBottom: i < sorted.length - 1 ? "1px solid #F5F5F5" : "none", cursor: "pointer" }}
                    className="list-row"
                  >
                    <td style={{ padding: "11px 14px", color: "#525252", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {MONTH_NAMES[viewMonth].slice(0, 3)} {cp.day}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#171717", fontWeight: 500 }}>{cp.label}</span>
                        {cp.isAI && (
                          <span style={{ fontSize: "9px", fontWeight: 700, color: "#fff", background: "#3BA7C9", borderRadius: "3px", padding: "1px 4px", lineHeight: 1 }}>AI</span>
                        )}
                      </div>
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

      {/* ── Legend ───────────────────────────────────────────── */}
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
          <div style={{ fontSize: "12px", color: "#737373", marginLeft: "auto" }}>
            Click any day to view or add checkpoints
          </div>
        </div>
      )}

      {/* ── No-org setup modal ───────────────────────────── */}
      {showNoOrgModal && (
        <div
          onClick={() => setShowNoOrgModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 997 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "12px", padding: "28px 32px", maxWidth: 420, width: "100%", margin: "0 16px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-source-serif-4, serif)", fontSize: "18px", fontWeight: 700, color: "#171717", margin: 0 }}>
                Organization Setup Required
              </h3>
              <button onClick={() => setShowNoOrgModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3A3", padding: 0, display: "flex" }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: "14px", color: "#525252", lineHeight: 1.6, marginBottom: 20 }}>
              {orgLoading
                ? "Loading your organization…"
                : "Your account isn't linked to an organization yet. This usually means the signup didn't complete fully."}
            </p>
            {!orgLoading && (
              <p style={{ fontSize: "13px", color: "#737373", lineHeight: 1.6, marginBottom: 24 }}>
                To fix this: go to <strong>Settings → Organization</strong> to complete setup, or sign out and create a new account.
              </p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowNoOrgModal(false)}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "1px solid #E8E8E8", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#525252", cursor: "pointer" }}
              >
                Close
              </button>
              {!orgLoading && (
                <a
                  href="/settings"
                  style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#2A8BA8", fontSize: "13px", fontWeight: 600, color: "#fff", cursor: "pointer", textDecoration: "none" }}
                >
                  Go to Settings
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Generate confirmation modal ───────────────────── */}
      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 997 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "12px", padding: "28px 32px", maxWidth: 440, width: "100%", margin: "0 16px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-source-serif-4, serif)", fontSize: "18px", fontWeight: 700, color: "#171717", margin: 0 }}>
                Generate Checkpoints
              </h3>
              <button onClick={() => setShowConfirm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3A3", padding: 0, display: "flex" }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: "14px", color: "#525252", lineHeight: 1.6, marginBottom: 8 }}>
              Generate checkpoints from all active controls for{" "}
              <strong style={{ color: "#2A8BA8" }}>{nextLabel}</strong>?
            </p>
            <p style={{ fontSize: "13px", color: "#737373", lineHeight: 1.6, marginBottom: 24 }}>
              Existing checkpoints for this period will not be duplicated.
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

      {/* ── CHECKPOINT POPOVER ────────────────────────────── */}
      {org?.id && userId && (
        <CheckpointPopover
          isOpen={popoverDay !== null}
          onClose={() => setPopoverDay(null)}
          selectedDay={popoverDay === -1 ? null : popoverDay}
          selectedYear={viewYear}
          selectedMonth={viewMonth}
          dayEvents={popoverDay !== null && popoverDay !== -1 ? (eventMap[popoverDay] ?? []) : []}
          orgId={org.id}
          userId={userId}
          onRefresh={handleRefresh}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .calendar-day-cell:hover { background: #F0F9FC !important; }
        .calendar-day-cell:hover .day-add-hint { opacity: 1 !important; }
        .list-row:hover { background: #F8FBFD; }
      `}</style>
    </div>
  )
}
