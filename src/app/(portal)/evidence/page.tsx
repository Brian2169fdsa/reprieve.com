"use client"

import { useState, useMemo } from "react"
import { LayoutGrid, List, Layers, Calendar, Upload } from "lucide-react"

// ── Types ────────────────────────────────────────────────
interface EvidenceItem {
  id: string
  fileName: string
  fileType: "pdf" | "image" | "video" | "document"
  checkpointTitle: string
  checkpointCode: string
  standard: string
  program: string
  period: string
  uploadedBy: string
  uploadedAt: string
  fileSize: string
}

// ── Seed data ────────────────────────────────────────────
const SEED: EvidenceItem[] = [
  {
    id: "ev-001",
    fileName: "OIG-SCR-001_Feb2026_Results.pdf",
    fileType: "pdf",
    checkpointTitle: "OIG Exclusion Screening",
    checkpointCode: "OIG-SCR-001",
    standard: "OIG",
    program: "IOP",
    period: "2026-02",
    uploadedBy: "Wayne Giles",
    uploadedAt: "Feb 3, 2026",
    fileSize: "142 KB",
  },
  {
    id: "ev-002",
    fileName: "HIPAA-SAF-001_AccessLog_Feb2026.pdf",
    fileType: "pdf",
    checkpointTitle: "HIPAA Access Log Review",
    checkpointCode: "HIPAA-SAF-001",
    standard: "HIPAA",
    program: "All",
    period: "2026-02",
    uploadedBy: "Sarah Chen",
    uploadedAt: "Feb 12, 2026",
    fileSize: "318 KB",
  },
  {
    id: "ev-003",
    fileName: "AHCCCS-CA-001_ChartAudit_Feb2026.pdf",
    fileType: "pdf",
    checkpointTitle: "Chart Audit",
    checkpointCode: "AHCCCS-CA-001",
    standard: "AHCCCS",
    program: "IOP",
    period: "2026-02",
    uploadedBy: "James Williams",
    uploadedAt: "Feb 18, 2026",
    fileSize: "87 KB",
  },
  {
    id: "ev-004",
    fileName: "SAFE-MED-001_TempLog_Photo.jpg",
    fileType: "image",
    checkpointTitle: "Medication Storage Temp Log",
    checkpointCode: "SAFE-MED-001",
    standard: "Safety",
    program: "Residential",
    period: "2026-02",
    uploadedBy: "Maria Rodriguez",
    uploadedAt: "Feb 20, 2026",
    fileSize: "2.1 MB",
  },
  {
    id: "ev-005",
    fileName: "OPS-GRV-001_GrievanceLog_Feb2026.pdf",
    fileType: "pdf",
    checkpointTitle: "Grievance Log Review",
    checkpointCode: "OPS-GRV-001",
    standard: "Operations",
    program: "IOP",
    period: "2026-02",
    uploadedBy: "Wayne Giles",
    uploadedAt: "Feb 22, 2026",
    fileSize: "54 KB",
  },
]

// ── Config maps ──────────────────────────────────────────
const STANDARD_STYLE: Record<string, { bg: string; color: string }> = {
  OIG:        { bg: "#EFF6FF", color: "#1D4ED8" },
  HIPAA:      { bg: "#F5F3FF", color: "#6D28D9" },
  AHCCCS:     { bg: "#F0FDF4", color: "#15803D" },
  Safety:     { bg: "#FFFBEB", color: "#B45309" },
  Operations: { bg: "#F5F5F5", color: "#525252" },
  Internal:   { bg: "#F5F5F5", color: "#525252" },
}

const FILE_TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pdf:      { bg: "#FEF2F2", color: "#DC2626", label: "PDF" },
  image:    { bg: "#F0FDF4", color: "#16A34A", label: "IMG" },
  video:    { bg: "#EFF6FF", color: "#1D4ED8", label: "VID" },
  document: { bg: "#F5F3FF", color: "#6D28D9", label: "DOC" },
}

const PERIODS   = ["2026-02", "2026-01", "2025-Q4", "2025-Q3"]
const STANDARDS = ["OIG", "HIPAA", "AHCCCS", "Safety", "Operations", "Internal"]
const PROGRAMS  = ["IOP", "Residential", "All"]

// ── Sub-components ───────────────────────────────────────
function FileTypeBadge({ fileType }: { fileType: string }) {
  const s = FILE_TYPE_STYLE[fileType] ?? { bg: "#F5F5F5", color: "#525252", label: fileType.toUpperCase().slice(0, 3) }
  return (
    <div style={{ width: 44, height: 44, borderRadius: 8, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, letterSpacing: "0.05em", flexShrink: 0 }}>
      {s.label}
    </div>
  )
}

function StandardBadge({ standard }: { standard: string }) {
  const s = STANDARD_STYLE[standard] ?? { bg: "#F5F5F5", color: "#525252" }
  return (
    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: "11px", fontWeight: 600, background: s.bg, color: s.color }}>
      {standard}
    </span>
  )
}

// ── Main component ───────────────────────────────────────
export default function EvidencePage() {
  const [periodFilter,   setPeriodFilter]   = useState("all")
  const [standardFilter, setStandardFilter] = useState("all")
  const [programFilter,  setProgramFilter]  = useState("all")
  const [typeFilter,     setTypeFilter]     = useState("all")
  const [view,           setView]           = useState<"grid" | "list">("grid")
  const [groupBy,        setGroupBy]        = useState<null | "standard" | "month">(null)

  // Filtered evidence
  const filtered = useMemo(() =>
    SEED.filter(item => {
      if (periodFilter   !== "all" && item.period   !== periodFilter)   return false
      if (standardFilter !== "all" && item.standard !== standardFilter) return false
      if (programFilter  !== "all" && item.program  !== programFilter && item.program !== "All") return false
      if (typeFilter     !== "all" && item.fileType !== typeFilter)     return false
      return true
    }),
    [periodFilter, standardFilter, programFilter, typeFilter]
  )

  // Grouped data
  type Group = { key: string; label: string; items: EvidenceItem[] }
  const groups: Group[] = useMemo(() => {
    if (!groupBy) return [{ key: "all", label: "", items: filtered }]
    const map = new Map<string, EvidenceItem[]>()
    filtered.forEach(item => {
      const key = groupBy === "standard" ? item.standard : item.period
      map.set(key, [...(map.get(key) ?? []), item])
    })
    return Array.from(map.entries()).map(([key, items]) => ({ key, label: key, items }))
  }, [filtered, groupBy])

  const selectStyle: React.CSSProperties = {
    padding: "6px 10px", borderRadius: "6px", border: "1px solid #E8E8E8",
    fontSize: "13px", color: "#404040", background: "#fff", cursor: "pointer",
    outline: "none", minWidth: 120,
  }

  function handleUpload() {
    alert("Upload Evidence — Supabase Storage integration pending")
  }

  function toggleGroupBy(mode: "standard" | "month") {
    setGroupBy(g => (g === mode ? null : mode))
  }

  // ── Render ───────────────────────────────────────────
  return (
    <div style={{ padding: "32px" }}>

      {/* ── Page header ──────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-source-serif-4, serif)", fontSize: "24px", fontWeight: 700, color: "#171717", margin: 0, marginBottom: "4px" }}>
            Evidence Library
          </h1>
          <p style={{ fontSize: "14px", color: "#737373", margin: 0 }}>
            Audit-ready evidence organized by standard and period
          </p>
        </div>
        <button
          onClick={handleUpload}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#2A8BA8", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
        >
          <Upload size={14} />
          Upload Evidence
        </button>
      </div>

      {/* ── Filter bar ───────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", padding: "14px 16px", background: "#FAFAFA", border: "1px solid #E8E8E8", borderRadius: "8px", marginBottom: "16px" }}>
        {/* Period */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>Period</label>
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Periods</option>
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Standard */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>Standard</label>
          <select value={standardFilter} onChange={e => setStandardFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Standards</option>
            {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Program */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>Program</label>
          <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Programs</option>
            {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* File Type */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>File Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Types</option>
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
          </select>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Grouping toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>Audit Binder</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => toggleGroupBy("standard")}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: "1px solid", borderColor: groupBy === "standard" ? "#2A8BA8" : "#E8E8E8", background: groupBy === "standard" ? "#E8F6FA" : "#fff", color: groupBy === "standard" ? "#2A8BA8" : "#525252", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              <Layers size={13} />
              By Standard
            </button>
            <button
              onClick={() => toggleGroupBy("month")}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: "1px solid", borderColor: groupBy === "month" ? "#2A8BA8" : "#E8E8E8", background: groupBy === "month" ? "#E8F6FA" : "#fff", color: groupBy === "month" ? "#2A8BA8" : "#525252", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              <Calendar size={13} />
              By Month
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>View</label>
          <div style={{ display: "flex", border: "1px solid #E8E8E8", borderRadius: 6, overflow: "hidden" }}>
            {(["grid", "list"] as const).map((v, i) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", background: view === v ? "#2A8BA8" : "#fff", color: view === v ? "#fff" : "#525252", borderRight: i === 0 ? "1px solid #E8E8E8" : "none" }}
              >
                {v === "grid" ? <LayoutGrid size={13} /> : <List size={13} />}
                {v === "grid" ? "Grid" : "List"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Result count ─────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: "13px", color: "#737373" }}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          {groupBy && ` grouped by ${groupBy}`}
        </span>
        {(periodFilter !== "all" || standardFilter !== "all" || programFilter !== "all" || typeFilter !== "all") && (
          <button
            onClick={() => { setPeriodFilter("all"); setStandardFilter("all"); setProgramFilter("all"); setTypeFilter("all") }}
            style={{ fontSize: "12px", color: "#2A8BA8", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Clear filters ×
          </button>
        )}
      </div>

      {/* ── Content ──────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#A3A3A3", fontSize: "14px" }}>
          No evidence matches the selected filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {groups.map(group => (
            <div key={group.key}>
              {/* Group header */}
              {groupBy && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {groupBy === "standard"
                      ? <StandardBadge standard={group.label} />
                      : <span style={{ padding: "2px 10px", borderRadius: 10, fontSize: "12px", fontWeight: 700, background: "#E8F6FA", color: "#2A8BA8" }}>{group.label}</span>
                    }
                    <span style={{ fontSize: "12px", color: "#737373" }}>
                      {group.items.length} file{group.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ flex: 1, height: 1, background: "#E8E8E8" }} />
                </div>
              )}

              {/* Grid view */}
              {view === "grid" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {group.items.map(item => (
                    <EvidenceCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {/* List view */}
              {view === "list" && (
                <EvidenceTable items={group.items} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Evidence Card (grid view) ────────────────────────────
function EvidenceCard({ item }: { item: EvidenceItem }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: "1px solid #E8E8E8",
        borderRadius: 10,
        padding: "18px 20px",
        cursor: "pointer",
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s",
      }}
    >
      {/* File icon + name */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <FileTypeBadge fileType={item.fileType} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#171717", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.fileName}
          </p>
          <p style={{ fontSize: "12px", color: "#A3A3A3", margin: "3px 0 0" }}>{item.fileSize}</p>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <StandardBadge standard={item.standard} />
        <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: "11px", fontWeight: 600, background: "#F5F5F5", color: "#525252" }}>
          {item.program}
        </span>
        <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: "11px", fontWeight: 600, background: "#E8F6FA", color: "#2A8BA8" }}>
          {item.period}
        </span>
      </div>

      {/* Checkpoint ref */}
      <p style={{ fontSize: "12px", color: "#525252", margin: "0 0 3px" }}>
        <span style={{ fontWeight: 600 }}>Checkpoint:</span>{" "}
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#737373" }}>{item.checkpointCode}</span>
        {" — "}{item.checkpointTitle}
      </p>
      <p style={{ fontSize: "12px", color: "#A3A3A3", margin: 0 }}>
        Uploaded by {item.uploadedBy} · {item.uploadedAt}
      </p>
    </div>
  )
}

// ── Evidence Table (list view) ───────────────────────────
function EvidenceTable({ items }: { items: EvidenceItem[] }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E8E8E8", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#FAFAFA", borderBottom: "2px solid #E8E8E8" }}>
            {["File Name", "Type", "Checkpoint", "Standard", "Program", "Period", "Uploaded By", "Date"].map(col => (
              <th key={col} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: "11px", color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                {col}
              </th>
            ))}
            <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: "11px", color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? "1px solid #F5F5F5" : "none" }}>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileTypeBadge fileType={item.fileType} />
                  <div>
                    <div style={{ fontWeight: 600, color: "#171717", fontSize: "13px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.fileName}
                    </div>
                    <div style={{ fontSize: "11px", color: "#A3A3A3" }}>{item.fileSize}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: "11px 14px", color: "#525252", textTransform: "capitalize" }}>
                {item.fileType}
              </td>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#737373" }}>{item.checkpointCode}</div>
                <div style={{ fontSize: "12px", color: "#525252" }}>{item.checkpointTitle}</div>
              </td>
              <td style={{ padding: "11px 14px" }}>
                <StandardBadge standard={item.standard} />
              </td>
              <td style={{ padding: "11px 14px", color: "#525252" }}>{item.program}</td>
              <td style={{ padding: "11px 14px" }}>
                <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: "11px", fontWeight: 600, background: "#E8F6FA", color: "#2A8BA8" }}>
                  {item.period}
                </span>
              </td>
              <td style={{ padding: "11px 14px", color: "#525252" }}>{item.uploadedBy}</td>
              <td style={{ padding: "11px 14px", color: "#737373", whiteSpace: "nowrap" }}>{item.uploadedAt}</td>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ fontSize: "12px", color: "#2A8BA8", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                    View
                  </button>
                  <span style={{ color: "#E8E8E8" }}>|</span>
                  <button style={{ fontSize: "12px", color: "#2A8BA8", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                    Download
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
