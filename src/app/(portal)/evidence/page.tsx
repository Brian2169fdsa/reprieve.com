"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { LayoutGrid, List, Layers, Calendar, Upload, Loader2, Trash2, Download, Eye, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useOrg } from "@/hooks/use-org"
import { uploadEvidence, getEvidenceUrl, deleteEvidence } from "@/lib/supabase/storage"

// ── Types ────────────────────────────────────────────────
interface EvidenceItem {
  id: string
  fileName: string
  fileType: "pdf" | "image" | "video" | "document"
  filePath: string
  fileSizeBytes: number
  checkpointId: string | null
  checkpointTitle: string
  checkpointCode: string
  standard: string
  program: string
  period: string
  uploadedBy: string
  uploadedAt: string
  fileSize: string
}

// ── Config maps ──────────────────────────────────────────
const STANDARD_STYLE: Record<string, { bg: string; color: string }> = {
  OIG:        { bg: "#EFF6FF", color: "#1D4ED8" },
  HIPAA:      { bg: "#F5F3FF", color: "#6D28D9" },
  AHCCCS:     { bg: "#F0FDF4", color: "#15803D" },
  Safety:     { bg: "#FFFBEB", color: "#B45309" },
  Operations: { bg: "#F5F5F5", color: "#525252" },
  Internal:   { bg: "#F5F5F5", color: "#525252" },
  TJC:        { bg: "#FEF3C7", color: "#92400E" },
  CARF:       { bg: "#E0E7FF", color: "#3730A3" },
  HR:         { bg: "#FDF2F8", color: "#9D174D" },
  Quality:    { bg: "#ECFDF5", color: "#065F46" },
}

const FILE_TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pdf:      { bg: "#FEF2F2", color: "#DC2626", label: "PDF" },
  image:    { bg: "#F0FDF4", color: "#16A34A", label: "IMG" },
  video:    { bg: "#EFF6FF", color: "#1D4ED8", label: "VID" },
  document: { bg: "#F5F3FF", color: "#6D28D9", label: "DOC" },
}

/** Format bytes to human readable */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/** Map file extension to our file_type categories */
function inferFileType(fileName: string): "pdf" | "image" | "video" | "document" {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "pdf") return "pdf"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image"
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) return "video"
  return "document"
}

/** Format ISO date to readable string */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

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

  const [evidence, setEvidence]     = useState<EvidenceItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [actionMsg, setActionMsg]   = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Available filter values derived from data
  const [availablePeriods, setAvailablePeriods]     = useState<string[]>([])
  const [availableStandards, setAvailableStandards] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { org } = useOrg()

  // ── Fetch evidence ──────────────────────────────────────
  const fetchEvidence = useCallback(async () => {
    if (!org?.id) return
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from("evidence")
      .select(`
        id,
        file_path,
        file_name,
        file_type,
        file_size_bytes,
        tags,
        created_at,
        checkpoint_id,
        checkpoints (
          id,
          period,
          controls ( code, title, standard )
        ),
        profiles:uploaded_by ( full_name )
      `)
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch evidence:", error.message)
      setEvidence([])
      setLoading(false)
      return
    }

    // Build filter option sets
    const periodSet = new Set<string>()
    const standardSet = new Set<string>()

    const mapped: EvidenceItem[] = (data ?? []).map((row) => {
      const checkpoint = row.checkpoints as unknown as {
        id: string
        period: string
        controls: { code: string; title: string; standard: string } | null
      } | null
      const uploader = row.profiles as unknown as { full_name: string } | null
      const tags = (row.tags ?? {}) as Record<string, string>

      const period = checkpoint?.period ?? tags.period ?? "—"
      const standard = checkpoint?.controls?.standard ?? tags.standard ?? "—"
      const program = tags.program ?? "All"

      if (period !== "—") periodSet.add(period)
      if (standard !== "—") standardSet.add(standard)

      return {
        id: row.id as string,
        fileName: row.file_name as string,
        fileType: (row.file_type as EvidenceItem["fileType"]) ?? inferFileType(row.file_name as string),
        filePath: row.file_path as string,
        fileSizeBytes: (row.file_size_bytes as number) ?? 0,
        checkpointId: row.checkpoint_id as string | null,
        checkpointTitle: checkpoint?.controls?.title ?? "—",
        checkpointCode: checkpoint?.controls?.code ?? "—",
        standard,
        program,
        period,
        uploadedBy: uploader?.full_name ?? "Unknown",
        uploadedAt: formatDate(row.created_at as string),
        fileSize: formatBytes((row.file_size_bytes as number) ?? 0),
      }
    })

    setAvailablePeriods(Array.from(periodSet).sort().reverse())
    setAvailableStandards(Array.from(standardSet).sort())
    setEvidence(mapped)
    setLoading(false)
  }, [org?.id])

  useEffect(() => {
    fetchEvidence()
  }, [fetchEvidence])

  // Filtered evidence
  const filtered = useMemo(() =>
    evidence.filter(item => {
      if (periodFilter   !== "all" && item.period   !== periodFilter)   return false
      if (standardFilter !== "all" && item.standard !== standardFilter) return false
      if (programFilter  !== "all" && item.program  !== programFilter && item.program !== "All") return false
      if (typeFilter     !== "all" && item.fileType !== typeFilter)     return false
      return true
    }),
    [evidence, periodFilter, standardFilter, programFilter, typeFilter]
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

  // ── Upload handler ──────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!org?.id || !e.target.files?.length) return
    const file = e.target.files[0]
    setUploading(true)
    setActionMsg(null)

    // Upload to storage (uses "unattached" as checkpoint ID for standalone uploads)
    const { path, error } = await uploadEvidence(org.id, "unattached", file)

    if (error) {
      setActionMsg({ type: "error", text: `Upload failed: ${error.message}` })
      setUploading(false)
      return
    }

    // Create evidence record in the database
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: dbError } = await supabase.from("evidence").insert({
      org_id: org.id,
      file_path: path,
      file_name: file.name,
      file_type: inferFileType(file.name),
      file_size_bytes: file.size,
      uploaded_by: user?.id ?? null,
      tags: {},
    })

    if (dbError) {
      setActionMsg({ type: "error", text: `File uploaded but record failed: ${dbError.message}` })
    } else {
      setActionMsg({ type: "success", text: `"${file.name}" uploaded successfully` })
      fetchEvidence()
    }

    setUploading(false)
    // Reset the file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ── View / Download handler ─────────────────────────────
  async function handleView(item: EvidenceItem) {
    if (!org?.id) return
    const url = await getEvidenceUrl(org.id, item.filePath)
    if (url) {
      window.open(url, "_blank")
    } else {
      setActionMsg({ type: "error", text: "Could not generate download URL" })
    }
  }

  async function handleDownload(item: EvidenceItem) {
    if (!org?.id) return
    const url = await getEvidenceUrl(org.id, item.filePath)
    if (url) {
      const a = document.createElement("a")
      a.href = url
      a.download = item.fileName
      a.click()
    } else {
      setActionMsg({ type: "error", text: "Could not generate download URL" })
    }
  }

  // ── Delete handler ──────────────────────────────────────
  async function handleDelete(item: EvidenceItem) {
    if (!org?.id) return
    if (!confirm(`Delete "${item.fileName}"? This cannot be undone.`)) return

    setDeleting(item.id)
    setActionMsg(null)

    // Delete from storage
    const { error: storageErr } = await deleteEvidence(org.id, item.filePath)
    if (storageErr) {
      setActionMsg({ type: "error", text: `Storage delete failed: ${storageErr.message}` })
      setDeleting(null)
      return
    }

    // Delete DB record
    const supabase = createClient()
    const { error: dbErr } = await supabase
      .from("evidence")
      .delete()
      .eq("id", item.id)

    if (dbErr) {
      setActionMsg({ type: "error", text: `File removed but DB record failed: ${dbErr.message}` })
    } else {
      setActionMsg({ type: "success", text: `"${item.fileName}" deleted` })
      fetchEvidence()
    }
    setDeleting(null)
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
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            style={{ display: "none" }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi,.webm"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !org?.id}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: uploading ? "#A3A3A3" : "#2A8BA8", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer" }}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Uploading…" : "Upload Evidence"}
          </button>
        </div>
      </div>

      {/* ── Action message ─────────────────────── */}
      {actionMsg && (
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
            background: actionMsg.type === "success" ? "#F0FDF4" : "#FEF2F2",
            color: actionMsg.type === "success" ? "#15803D" : "#DC2626",
            border: `1px solid ${actionMsg.type === "success" ? "#BBF7D0" : "#FECACA"}`,
          }}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, display: "flex" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Filter bar ───────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", padding: "14px 16px", background: "#FAFAFA", border: "1px solid #E8E8E8", borderRadius: "8px", marginBottom: "16px" }}>
        {/* Period */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>Period</label>
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Periods</option>
            {availablePeriods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Standard */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>Standard</label>
          <select value={standardFilter} onChange={e => setStandardFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Standards</option>
            {availableStandards.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Program */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}>Program</label>
          <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Programs</option>
            <option value="IOP">IOP</option>
            <option value="Residential">Residential</option>
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
          {loading ? "Loading…" : `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`}
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

      {/* ── Loading state ──────────────────────── */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#737373", gap: "8px" }}>
          <Loader2 size={18} className="animate-spin" />
          <span style={{ fontSize: "14px" }}>Loading evidence…</span>
        </div>
      )}

      {/* ── Content ──────────────────────────────── */}
      {!loading && filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#A3A3A3", fontSize: "14px" }}>
          {evidence.length === 0
            ? "No evidence uploaded yet. Click \"Upload Evidence\" to add files."
            : "No evidence matches the selected filters."}
        </div>
      ) : !loading && (
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
                    <EvidenceCard
                      key={item.id}
                      item={item}
                      onView={() => handleView(item)}
                      onDownload={() => handleDownload(item)}
                      onDelete={() => handleDelete(item)}
                      isDeleting={deleting === item.id}
                    />
                  ))}
                </div>
              )}

              {/* List view */}
              {view === "list" && (
                <EvidenceTable
                  items={group.items}
                  onView={handleView}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  deletingId={deleting}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Evidence Card (grid view) ────────────────────────────
function EvidenceCard({
  item,
  onView,
  onDownload,
  onDelete,
  isDeleting,
}: {
  item: EvidenceItem
  onView: () => void
  onDownload: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
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
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s",
        position: "relative",
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
        {item.checkpointTitle !== "—" && <>{" — "}{item.checkpointTitle}</>}
      </p>
      <p style={{ fontSize: "12px", color: "#A3A3A3", margin: "0 0 10px" }}>
        Uploaded by {item.uploadedBy} · {item.uploadedAt}
      </p>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, borderTop: "1px solid #F5F5F5", paddingTop: 10 }}>
        <button
          onClick={onView}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "#2A8BA8", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
        >
          <Eye size={12} /> View
        </button>
        <span style={{ color: "#E8E8E8" }}>|</span>
        <button
          onClick={onDownload}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "#2A8BA8", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
        >
          <Download size={12} /> Download
        </button>
        <span style={{ color: "#E8E8E8" }}>|</span>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "#DC2626", background: "none", border: "none", cursor: isDeleting ? "not-allowed" : "pointer", fontWeight: 600, padding: 0, opacity: isDeleting ? 0.5 : 1 }}
        >
          {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Delete
        </button>
      </div>
    </div>
  )
}

// ── Evidence Table (list view) ───────────────────────────
function EvidenceTable({
  items,
  onView,
  onDownload,
  onDelete,
  deletingId,
}: {
  items: EvidenceItem[]
  onView: (item: EvidenceItem) => void
  onDownload: (item: EvidenceItem) => void
  onDelete: (item: EvidenceItem) => void
  deletingId: string | null
}) {
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
          {items.length === 0 && (
            <tr>
              <td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#A3A3A3", fontSize: "14px" }}>
                No evidence items
              </td>
            </tr>
          )}
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
                  <button
                    onClick={() => onView(item)}
                    style={{ fontSize: "12px", color: "#2A8BA8", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
                  >
                    View
                  </button>
                  <span style={{ color: "#E8E8E8" }}>|</span>
                  <button
                    onClick={() => onDownload(item)}
                    style={{ fontSize: "12px", color: "#2A8BA8", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
                  >
                    Download
                  </button>
                  <span style={{ color: "#E8E8E8" }}>|</span>
                  <button
                    onClick={() => onDelete(item)}
                    disabled={deletingId === item.id}
                    style={{ fontSize: "12px", color: "#DC2626", background: "none", border: "none", cursor: deletingId === item.id ? "not-allowed" : "pointer", fontWeight: 600, padding: 0, opacity: deletingId === item.id ? 0.5 : 1 }}
                  >
                    Delete
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
