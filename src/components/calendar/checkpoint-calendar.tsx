"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, X } from "lucide-react"
import CalendarEvent from "./calendar-event"

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

// ── Seed data — February 2026 ───────────────────────────
const FEB_2026: Checkpoint[] = [
  { id: "cp-001", day: 1,  label: "Checkpoints Generated",     status: "info",        standard: "System",     control: "Monthly Generation", assignedTo: "System",          dueDate: "Feb 1, 2026"  },
  { id: "cp-002", day: 3,  label: "OIG Exclusion Screening",   status: "passed",      standard: "OIG",        control: "OIG-SCR-001",        assignedTo: "Sarah Chen",      dueDate: "Feb 3, 2026"  },
  { id: "cp-003", day: 5,  label: "Credential Verification",   status: "pending",     standard: "HR",         control: "HR-CRED-001",        assignedTo: "David Kim",       dueDate: "Feb 5, 2026"  },
  { id: "cp-004", day: 8,  label: "Incident Review",           status: "passed",      standard: "Safety",     control: "SAFE-INC-001",       assignedTo: "Maria Rodriguez", dueDate: "Feb 8, 2026"  },
  { id: "cp-005", day: 10, label: "Credential Verification",   status: "passed",      standard: "HR",         control: "HR-CRED-002",        assignedTo: "David Kim",       dueDate: "Feb 10, 2026" },
  { id: "cp-006", day: 12, label: "HIPAA Audit",               status: "passed",      standard: "HIPAA",      control: "HIPAA-SA-001",       assignedTo: "Sarah Chen",      dueDate: "Feb 12, 2026" },
  { id: "cp-007", day: 15, label: "Fire Drill Log",            status: "failed",      standard: "Safety",     control: "SAFE-FD-001",        assignedTo: "Maria Rodriguez", dueDate: "Feb 15, 2026" },
  { id: "cp-008", day: 18, label: "Chart Audit",               status: "passed",      standard: "AHCCCS",     control: "AHCCCS-CHA-001",     assignedTo: "James Williams",  dueDate: "Feb 18, 2026" },
  { id: "cp-009", day: 20, label: "CAPA Follow-Up",            status: "overdue",     standard: "Quality",    control: "QM-CAPA-001",        assignedTo: "Sarah Chen",      dueDate: "Feb 20, 2026" },
  { id: "cp-010", day: 22, label: "Grievance Log Review",      status: "passed",      standard: "Operations", control: "OPS-GRV-001",        assignedTo: "Wayne Giles",     dueDate: "Feb 22, 2026" },
  { id: "cp-011", day: 28, label: "OIG Exclusion Check",       status: "pending",     standard: "OIG",        control: "OIG-EXC-001",        assignedTo: "Sarah Chen",      dueDate: "Feb 28, 2026" },
  { id: "cp-012", day: 28, label: "Staff Training Verification", status: "pending",   standard: "HR",         control: "HR-TRNG-001",        assignedTo: "David Kim",       dueDate: "Feb 28, 2026" },
]

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

// ── Component ───────────────────────────────────────────
export default function CheckpointCalendar() {
  const [viewYear, setViewYear]   = useState(2026)
  const [viewMonth, setViewMonth] = useState(1)           // 0-indexed; 1 = February
  const [view, setView]           = useState<"calendar" | "list">("calendar")
  const [showConfirm, setShowConfirm] = useState(false)
  const [sortCol, setSortCol]     = useState<"day" | "label" | "standard" | "assignedTo" | "status">("day")
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("asc")

  // Today = Feb 25 2026
  const TODAY_DAY = 25, TODAY_MONTH = 1, TODAY_YEAR = 2026
  const isCurrentMonth = viewYear === TODAY_YEAR && viewMonth === TODAY_MONTH

  // Data: seed for Feb 2026, empty otherwise
  const checkpoints: Checkpoint[] =
    viewYear === 2026 && viewMonth === 1 ? FEB_2026 : []

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
    if (!isCurrentMonth || day >= TODAY_DAY) return false
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
  function handleGenerate() {
    setShowConfirm(false)
    alert(`Generating checkpoints for ${nextLabel}… (Supabase integration pending)`)
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
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#2A8BA8", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={14} />
          Generate Checkpoints
        </button>
      </div>

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
            <div style={{ fontSize: "28px", fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
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

      {/* ── Calendar grid ─────────────────────────── */}
      {view === "calendar" && (
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
              const isToday      = isCurrentMonth && day === TODAY_DAY
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
      {view === "list" && (
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
      {view === "calendar" && (
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
              Generate <strong style={{ color: "#2A8BA8" }}>24 checkpoints</strong> for{" "}
              <strong>{nextLabel}</strong>?
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
                Generate 24 Checkpoints
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
