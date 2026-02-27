"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, X, Loader2, Calendar } from "lucide-react"
import CalendarEvent from "./calendar-event"
import CheckpointModal from "@/components/checkpoints/checkpoint-modal"
import { createClient } from "@/lib/supabase/client"
import { useOrg } from "@/hooks/use-org"
import { generateCheckpoints } from "@/app/(portal)/controls/generate-checkpoints"

// ── Types ───────────────────────────────────────────────────────
type CheckpointStatus =
  | "info"
  | "passed"
  | "failed"
  | "overdue"
  | "pending"
  | "in_progress"
  | "skipped"

interface CalendarCheckpoint {
  id: string
  day: number
  label: string
  status: CheckpointStatus
  standard: string
  control: string
  assignedTo: string
  dueDate: string
  isAI: boolean
  isMock?: boolean
}

// ── Config ──────────────────────────────────────────────────────
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

// ── Helpers ─────────────────────────────────────────────────────
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

// ── Mock Data Generator ─────────────────────────────────────────
function generateMockData(year: number, month: number): CalendarCheckpoint[] {
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
    .map((d) => ({
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

// ── Component ───────────────────────────────────────────────────
export default function CheckpointCalendar() {
  const todayDate   = new Date()
  const TODAY_DAY   = todayDate.getDate()
  const TODAY_MONTH = todayDate.getMonth()
  const TODAY_YEAR  = todayDate.getFullYear()

  const [viewYear, setViewYear]   = useState(TODAY_YEAR)
  const [viewMonth, setViewMonth] = useState(TODAY_MONTH)
  const [view, setView]           = useState<"calendar" | "list">("calendar")

  const [checkpoints, setCheckpoints] = useState<CalendarCheckpoint[]>([])
  const [loading, setLoading]         = useState(false)
  const [usingMocks, setUsingMocks]   = useState(false)

  // Generate checkpoints modal
  const [showConfirm, setShowConfirm]     = useState(false)
  const [generating, setGenerating]       = useState(false)
  const [generateMsg, setGenerateMsg]     = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Add checkpoint modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDay, setAddDay]             = useState<number | null>(null)

  // Checkpoint detail modal
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null)

  // Sorting
  const [sortCol, setSortCol] = useState<"day" | "label" | "standard" | "assignedTo" | "status">("day")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const { org } = useOrg()
  const isCurrentMonth = viewYear === TODAY_YEAR && viewMonth === TODAY_MONTH

  // ── Fetch checkpoints ─────────────────────────────────────
  const fetchCheckpoints = useCallback(async (orgId: string, year: number, month: number) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`
      const lastDay  = new Date(year, month + 1, 0).toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("checkpoints")
        .select(`
          id,
          status,
          due_date,
          period,
          assigned_to,
          control:controls!control_id(title, code, standard),
          assignee:profiles!assigned_to(full_name)
        `)
        .eq("org_id", orgId)
        .gte("due_date", firstDay)
        .lte("due_date", lastDay)

      if (error) { console.error("Error fetching checkpoints:", error); return }

      if (!data || data.length === 0) {
        // Seed with mock data
        setCheckpoints(generateMockData(year, month))
        setUsingMocks(true)
        return
      }

      const mapped: CalendarCheckpoint[] = data.map((row) => {
        const ctrl     = row.control as unknown as { title: string; code: string; standard: string } | null
        const assignee = row.assignee as unknown as { full_name: string } | null
        const dueDate  = new Date((row.due_date as string) + "T12:00:00")
        return {
          id:         row.id as string,
          day:        dueDate.getDate(),
          label:      ctrl?.title    ?? "Unknown",
          status:     (row.status as CheckpointStatus) ?? "pending",
          standard:   ctrl?.standard ?? "Unknown",
          control:    ctrl?.code     ?? "",
          assignedTo: assignee?.full_name ?? "Unassigned",
          dueDate:    `${MONTH_NAMES[dueDate.getMonth()].slice(0, 3)} ${dueDate.getDate()}, ${dueDate.getFullYear()}`,
          isAI:       !row.assigned_to,
        }
      })

      setCheckpoints(mapped)
      setUsingMocks(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (org?.id) fetchCheckpoints(org.id, viewYear, viewMonth)
    else {
      setCheckpoints(generateMockData(viewYear, viewMonth))
      setUsingMocks(true)
      setLoading(false)
    }
  }, [org?.id, viewYear, viewMonth, fetchCheckpoints])

  // ── Stats ─────────────────────────────────────────────────
  const real      = checkpoints.filter(c => c.status !== "info")
  const total     = real.length
  const completed = real.filter(c => c.status === "passed").length
  const pending   = real.filter(c => c.status === "pending" || c.status === "in_progress").length
  const overdue   = real.filter(c => c.status === "overdue" || c.status === "failed").length

  // ── Event map ─────────────────────────────────────────────
  const eventMap: Record<number, CalendarCheckpoint[]> = {}
  checkpoints.forEach(cp => {
    eventMap[cp.day] = [...(eventMap[cp.day] ?? []), cp]
  })

  // ── Build grid cells ──────────────────────────────────────
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

  // ── Sorted list data ──────────────────────────────────────
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
  }
  function handleNavNext() {
    const { year, month } = shiftMonth(viewYear, viewMonth, 1)
    setViewYear(year); setViewMonth(month)
    setGenerateMsg(null); setGenerateError(null)
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

  function handleEventClick(id: string) {
    // Don't open modal for mock data
    if (id.startsWith("mock-")) return
    setSelectedCheckpointId(id)
  }

  function handleDayCellClick(day: number) {
    setAddDay(day)
    setShowAddModal(true)
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px" }}>

      {/* ── Page header ──────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-source-serif-4, serif)", fontSize: "24px", fontWeight: 700, color: "#171717", marginBottom: "4px", margin: 0 }}>
            Checkpoint Calendar
          </h1>
          <p style={{ fontSize: "14px", color: "#737373", marginTop: "4px" }}>
            {monthLabel(viewYear, viewMonth)} · Compliance checkpoint schedule
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setAddDay(null); setShowAddModal(true) }}
            disabled={!org?.id}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              background: !org?.id ? "#E8E8E8" : "#fff", color: !org?.id ? "#A3A3A3" : "#2A8BA8",
              border: "1px solid #E8E8E8", borderRadius: "6px", fontSize: "13px", fontWeight: 600,
              cursor: !org?.id ? "not-allowed" : "pointer",
            }}
          >
            <Calendar size={14} />
            Add Checkpoint
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={generating || !org?.id}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              background: generating || !org?.id ? "#A3A3A3" : "#2A8BA8", color: "#fff",
              border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600,
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

      {/* ── Mock data banner ─────────────────────────── */}
      {usingMocks && (
        <div style={{ padding: "10px 14px", background: "#E8F6FA", border: "1px solid #B5E3F0", borderRadius: "6px", color: "#2A8BA8", fontSize: "13px", fontWeight: 500, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Showing sample data. Generate checkpoints or add them manually to see real data.
          <button onClick={() => { setUsingMocks(false); setCheckpoints([]) }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2A8BA8", fontSize: "16px", lineHeight: 1, padding: "0 0 0 12px" }}>×</button>
        </div>
      )}

      {/* ── Generate result messages ──────────────────── */}
      {generateMsg && (
        <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "6px", color: "#15803D", fontSize: "13px", fontWeight: 500, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {generateMsg}
          <button onClick={() => setGenerateMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#15803D", fontSize: "16px", lineHeight: 1, padding: "0 0 0 12px" }}>×</button>
        </div>
      )}
      {generateError && (
        <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "6px", color: "#DC2626", fontSize: "13px", fontWeight: 500, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {generateError}
          <button onClick={() => setGenerateError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: "16px", lineHeight: 1, padding: "0 0 0 12px" }}>×</button>
        </div>
      )}

      {/* ── Stats bar ────────────────────────────────── */}
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

      {/* ── Month nav + view toggle ─────────────────── */}
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

      {/* ── Loading state ────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#737373", gap: 10 }}>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          Loading checkpoints...
        </div>
      )}

      {/* ── Calendar grid ────────────────────────────── */}
      {!loading && view === "calendar" && (
        <div style={{ background: "#fff", border: "1px solid #E8E8E8", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "2px solid #E8E8E8" }}>
            {DAY_HEADERS.map(d => (
              <div key={d} style={{ padding: "10px 0", fontSize: "11px", fontWeight: 700, color: "#737373", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em", background: "#FAFAFA" }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, idx) => {
              const isToday     = isCurrentMonth && day === TODAY_DAY
              const pastBad     = day !== null && isPastIncomplete(day)
              const dayEvents   = day !== null ? (eventMap[day] ?? []) : []
              const visible     = dayEvents.slice(0, 2)
              const extra       = dayEvents.length - visible.length
              const isLastRow   = idx >= cells.length - 7
              const isLastInRow = (idx + 1) % 7 === 0
              const isEmpty     = day !== null && dayEvents.length === 0

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
                    position: "relative",
                  }}
                  className="calendar-day-cell"
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
                        {isEmpty && org?.id && (
                          <button
                            onClick={() => handleDayCellClick(day)}
                            className="day-add-btn"
                            style={{
                              width: 18, height: 18, borderRadius: "50%", border: "1px solid #E8E8E8",
                              background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", opacity: 0, transition: "opacity 0.15s",
                              padding: 0, lineHeight: 1, fontSize: 14, color: "#A3A3A3",
                            }}
                          >
                            +
                          </button>
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
                            onClick={handleEventClick}
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

      {/* ── List view ────────────────────────────────── */}
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
                  <tr
                    key={cp.id}
                    onClick={() => handleEventClick(cp.id)}
                    style={{ borderBottom: i < sorted.length - 1 ? "1px solid #F5F5F5" : "none", cursor: cp.isMock ? "default" : "pointer" }}
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

      {/* ── Legend ────────────────────────────────────── */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", color: "#525252" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#fff", background: "#3BA7C9", borderRadius: "3px", padding: "1px 4px", lineHeight: 1 }}>AI</span>
            Auto-generated
          </div>
        </div>
      )}

      {/* ── Generate Confirmation Modal ───────────────── */}
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

      {/* ── Add Checkpoint Modal ──────────────────────── */}
      {showAddModal && org?.id && (
        <AddCheckpointModal
          orgId={org.id}
          defaultDay={addDay}
          viewYear={viewYear}
          viewMonth={viewMonth}
          onClose={() => { setShowAddModal(false); setAddDay(null) }}
          onCreated={() => {
            setShowAddModal(false)
            setAddDay(null)
            if (org?.id) fetchCheckpoints(org.id, viewYear, viewMonth)
          }}
        />
      )}

      {/* ── Checkpoint Detail Modal ──────────────────── */}
      {selectedCheckpointId && org?.id && (
        <CheckpointDetailModalWrapper
          checkpointId={selectedCheckpointId}
          orgId={org.id}
          onClose={() => setSelectedCheckpointId(null)}
          onComplete={() => {
            setSelectedCheckpointId(null)
            if (org?.id) fetchCheckpoints(org.id, viewYear, viewMonth)
          }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .calendar-day-cell:hover .day-add-btn { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

// ── Checkpoint Detail Modal Wrapper ─────────────────────────────
function CheckpointDetailModalWrapper({ checkpointId, orgId, onClose, onComplete }: {
  checkpointId: string
  orgId: string
  onClose: () => void
  onComplete: () => void
}) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  if (!userId) return null

  return (
    <CheckpointModal
      checkpointId={checkpointId}
      orgId={orgId}
      userId={userId}
      onClose={onClose}
      onComplete={onComplete}
    />
  )
}

// ── Add Checkpoint Modal ────────────────────────────────────────
function AddCheckpointModal({ orgId, defaultDay, viewYear, viewMonth, onClose, onCreated }: {
  orgId: string
  defaultDay: number | null
  viewYear: number
  viewMonth: number
  onClose: () => void
  onCreated: () => void
}) {
  const [controls, setControls] = useState<{ id: string; code: string; title: string; standard: string }[]>([])
  const [members, setMembers]   = useState<{ id: string; full_name: string }[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [selectedControl, setSelectedControl] = useState("")
  const [assignedTo, setAssignedTo]           = useState("")
  const [dueDay, setDueDay]                   = useState(defaultDay?.toString() ?? "")
  const [notes, setNotes]                     = useState("")
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState<string | null>(null)

  const dim = daysInMonth(viewYear, viewMonth)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [controlsRes, membersRes] = await Promise.all([
        supabase.from("controls").select("id, code, title, standard").eq("org_id", orgId).eq("is_active", true).order("code"),
        supabase.from("org_members").select("user_id, profiles(full_name)").eq("org_id", orgId).eq("is_active", true),
      ])

      if (controlsRes.data) {
        setControls(controlsRes.data as { id: string; code: string; title: string; standard: string }[])
      }
      if (membersRes.data) {
        setMembers(membersRes.data.map((m) => ({
          id: m.user_id as string,
          full_name: (m.profiles as unknown as { full_name: string })?.full_name ?? "Unknown",
        })))
      }
      setLoadingData(false)
    }
    load()
  }, [orgId])

  async function handleSave() {
    if (!selectedControl || !dueDay) return
    setSaving(true)
    setError(null)

    const dayNum = parseInt(dueDay)
    if (isNaN(dayNum) || dayNum < 1 || dayNum > dim) {
      setError("Invalid day")
      setSaving(false)
      return
    }

    const dueDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
    const period = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`

    const supabase = createClient()
    const { error: insertErr } = await supabase
      .from("checkpoints")
      .insert({
        org_id: orgId,
        control_id: selectedControl,
        period,
        status: "pending",
        assigned_to: assignedTo || null,
        due_date: dueDate,
        notes: notes.trim() || null,
      })

    if (insertErr) {
      setError(insertErr.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onCreated()
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: "12px", padding: "28px 32px", maxWidth: 480, width: "100%", margin: "0 16px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--font-source-serif-4, serif)", fontSize: "18px", fontWeight: 700, color: "#171717", margin: 0 }}>
            Add Checkpoint
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3A3", padding: 0, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {loadingData ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10, color: "#737373" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading...</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Control */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#525252", display: "block", marginBottom: 6 }}>
                Control <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <select
                value={selectedControl}
                onChange={e => setSelectedControl(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", border: "1px solid #D4D4D4", borderRadius: 6,
                  fontSize: 13, color: selectedControl ? "#171717" : "#A3A3A3", background: "#fff",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              >
                <option value="">Select a control...</option>
                {controls.map(c => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title} ({c.standard})</option>
                ))}
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#525252", display: "block", marginBottom: 6 }}>
                Assigned To
              </label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", border: "1px solid #D4D4D4", borderRadius: 6,
                  fontSize: 13, color: assignedTo ? "#171717" : "#A3A3A3", background: "#fff",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            {/* Due Day */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#525252", display: "block", marginBottom: 6 }}>
                Due Date <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#737373" }}>
                  {MONTH_NAMES[viewMonth]}
                </span>
                <input
                  type="number"
                  min={1}
                  max={dim}
                  value={dueDay}
                  onChange={e => setDueDay(e.target.value)}
                  placeholder="Day"
                  style={{
                    width: 70, padding: "9px 12px", border: "1px solid #D4D4D4", borderRadius: 6,
                    fontSize: 13, color: "#171717", fontFamily: "inherit", outline: "none", textAlign: "center",
                  }}
                />
                <span style={{ fontSize: 13, color: "#737373" }}>, {viewYear}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#525252", display: "block", marginBottom: 6 }}>Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes..."
                style={{
                  width: "100%", padding: "9px 12px", border: "1px solid #D4D4D4", borderRadius: 6,
                  fontSize: 13, color: "#171717", resize: "vertical", minHeight: 60, fontFamily: "inherit",
                  boxSizing: "border-box", outline: "none",
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, fontSize: 12, color: "#DC2626" }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={onClose}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "1px solid #E8E8E8", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#525252", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedControl || !dueDay || saving}
                style={{
                  padding: "8px 18px", borderRadius: "6px", border: "none",
                  background: !selectedControl || !dueDay || saving ? "#E8E8E8" : "#2A8BA8",
                  fontSize: "13px", fontWeight: 600,
                  color: !selectedControl || !dueDay || saving ? "#A3A3A3" : "#fff",
                  cursor: !selectedControl || !dueDay || saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Add Checkpoint"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
