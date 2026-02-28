"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  X, ChevronLeft, ChevronRight, User, Calendar, FileText,
  Upload, Loader2, Bell, BellRing, Check, AlertTriangle,
  Bot, Edit2, Paperclip, Plus, ClipboardList,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { uploadEvidence } from "@/lib/supabase/storage"

// ── Types ──────────────────────────────────────────────────────────────────

interface OrgMember {
  user_id: string
  full_name: string
  role: string
}

interface ControlOption {
  id: string
  code: string
  title: string
  standard: string
  test_procedure: string
  required_evidence: string[]
  frequency: string
}

interface EvidenceItem {
  id: string
  file_name: string
  file_type?: string
  file_size_bytes?: number
  file_path: string
}

interface CheckpointDetail {
  id: string
  status: string
  due_date: string
  period: string
  attestation: string | null
  notes: string | null
  assigned_to: string | null
  assignee_name: string | null
  completed_at: string | null
  control_id: string | null
  control: ControlOption | null
  assignee: { full_name: string; id: string } | null
  evidence: EvidenceItem[]
}

// Named team members that can be assigned without a user account
const TEAM_MEMBERS = ['Emily', 'Wayne', 'Brian', 'Jericho'] as const

export interface CalendarDayEvent {
  id: string
  day: number
  label: string
  status: string
  standard: string
  control: string
  assignedTo: string
  dueDate: string
  isAI: boolean
  isMock?: boolean
}

interface Props {
  isOpen: boolean
  onClose: () => void
  selectedDay: number | null
  selectedYear: number
  selectedMonth: number
  dayEvents: CalendarDayEvent[]
  orgId: string
  userId: string
  onRefresh: () => void
}

// ── Design tokens ──────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const STANDARD_COLORS: Record<string, { bg: string; color: string }> = {
  OIG:        { bg: "#EFF6FF", color: "#1D4ED8" },
  HIPAA:      { bg: "#F5F3FF", color: "#6D28D9" },
  AHCCCS:     { bg: "#F0FDF4", color: "#15803D" },
  TJC:        { bg: "#FFF7ED", color: "#C2410C" },
  CARF:       { bg: "#FCE7F3", color: "#9D174D" },
  Safety:     { bg: "#FFFBEB", color: "#B45309" },
  Internal:   { bg: "#F5F5F5", color: "#525252" },
  HR:         { bg: "#FDF2F8", color: "#9D174D" },
  Operations: { bg: "#FFF7ED", color: "#C2410C" },
  Quality:    { bg: "#F0F9FF", color: "#0369A1" },
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:     { label: "Pending",     bg: "#FFFBEB", color: "#B45309", border: "#FCD34D" },
  in_progress: { label: "In Progress", bg: "#E8F6FA", color: "#2A8BA8", border: "#7DD3EB" },
  passed:      { label: "Passed",      bg: "#F0FDF4", color: "#15803D", border: "#86EFAC" },
  failed:      { label: "Failed",      bg: "#FEF2F2", color: "#DC2626", border: "#FCA5A5" },
  overdue:     { label: "Overdue",     bg: "#FEF2F2", color: "#B91C1C", border: "#FCA5A5" },
  skipped:     { label: "Skipped",     bg: "#F5F5F5", color: "#737373", border: "#D4D4D4" },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getPeriodString(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CheckpointPopover({
  isOpen, onClose,
  selectedDay, selectedYear, selectedMonth,
  dayEvents, orgId, userId, onRefresh,
}: Props) {
  type Mode = "view" | "edit" | "create"
  const [mode, setMode] = useState<Mode>("view")
  const [activeIdx, setActiveIdx] = useState(0)

  // Data state
  const [detail, setDetail] = useState<CheckpointDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [controls, setControls] = useState<ControlOption[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])

  // Form state
  const [formControl, setFormControl] = useState("")
  const [formAssignee, setFormAssignee] = useState("")
  const [formDueDate, setFormDueDate] = useState("")
  const [formStatus, setFormStatus] = useState("pending")
  const [formNotes, setFormNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Evidence state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI insight
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Reminder
  const [reminderSet, setReminderSet] = useState(false)
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderError, setReminderError] = useState<string | null>(null)

  // Attestation
  const [attesting, setAttesting] = useState(false)
  const [attestError, setAttestError] = useState<string | null>(null)

  const activeEvent = dayEvents[activeIdx] ?? null

  // ── Reset on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    setActiveIdx(0)
    setDetail(null)
    setAiInsight(null)
    setSaveError(null)
    setUploadError(null)
    setReminderError(null)
    setAttestError(null)
    setMode(dayEvents.length === 0 ? "create" : "view")
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch detail when switching event ──────────────────────────────────
  useEffect(() => {
    if (!isOpen || !activeEvent || activeEvent.isMock) {
      setDetail(null)
      return
    }
    fetchDetail(activeEvent.id)
  }, [isOpen, activeEvent?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch controls + members for forms ─────────────────────────────────
  useEffect(() => {
    if (!isOpen || !orgId) return
    fetchControls()
    fetchMembers()
  }, [isOpen, orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pre-fill due date for create mode ──────────────────────────────────
  useEffect(() => {
    if (mode === "create" && selectedDay) {
      const m = String(selectedMonth + 1).padStart(2, "0")
      const d = String(selectedDay).padStart(2, "0")
      setFormDueDate(`${selectedYear}-${m}-${d}`)
    }
  }, [mode, selectedDay, selectedYear, selectedMonth])

  // ── Pre-fill edit form from detail ─────────────────────────────────────
  useEffect(() => {
    if (mode === "edit" && detail) {
      setFormControl(detail.control_id ?? "")
      setFormAssignee(detail.assignee_name ?? detail.assigned_to ?? "")
      setFormDueDate(detail.due_date ?? "")
      setFormStatus(detail.status ?? "pending")
      setFormNotes(detail.notes ?? "")
      setSaveError(null)
    }
  }, [mode, detail])

  // ── Data fetchers ───────────────────────────────────────────────────────

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("checkpoints")
        .select(`
          id, status, due_date, period, attestation, notes,
          assigned_to, assignee_name, completed_at, control_id,
          control:controls!control_id(
            id, code, title, standard, test_procedure, required_evidence, frequency
          ),
          assignee:profiles!assigned_to(full_name, id),
          evidence(id, file_name, file_type, file_size_bytes, file_path)
        `)
        .eq("id", id)
        .single()

      if (error) { setSaveError(error.message); return }

      const ctrl = data.control as unknown as ControlOption | null
      const assigneeRaw = data.assignee as unknown as { full_name: string; id: string } | null
      const evRaw = data.evidence as unknown as EvidenceItem[] | null

      const built: CheckpointDetail = {
        id: data.id as string,
        status: data.status as string,
        due_date: data.due_date as string,
        period: data.period as string,
        attestation: data.attestation as string | null,
        notes: data.notes as string | null,
        assigned_to: data.assigned_to as string | null,
        assignee_name: data.assignee_name as string | null,
        completed_at: data.completed_at as string | null,
        control_id: data.control_id as string | null,
        control: ctrl,
        assignee: assigneeRaw ?? null,
        evidence: evRaw ?? [],
      }

      setDetail(built)
      checkReminderStatus(id)
      if (ctrl?.title) {
        fetchAiInsight(ctrl.title, ctrl.standard ?? "", data.status as string)
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchControls = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("controls")
      .select("id, code, title, standard, test_procedure, required_evidence, frequency")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("standard")
    setControls((data as unknown as ControlOption[]) ?? [])
  }, [orgId])

  const fetchMembers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("org_members")
      .select("user_id, role, profile:profiles!user_id(full_name)")
      .eq("org_id", orgId)
      .eq("is_active", true)
    const mapped = ((data ?? []) as unknown as Array<{
      user_id: string; role: string; profile: { full_name: string } | null
    }>)
      .map(m => ({ user_id: m.user_id, full_name: m.profile?.full_name ?? "", role: m.role }))
      .filter(m => m.full_name)
    setMembers(mapped)
  }, [orgId])

  const checkReminderStatus = useCallback(async (checkpointId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("notifications")
      .select("id")
      .eq("entity_id", checkpointId)
      .eq("type", "checkpoint_due_reminder")
      .limit(1)
    setReminderSet((data?.length ?? 0) > 0)
  }, [])

  const fetchAiInsight = useCallback(async (title: string, standard: string, status: string) => {
    setAiLoading(true)
    setAiInsight(null)
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Brief insight for ${standard} checkpoint: "${title}" (status: ${status}). What should staff focus on?`,
          agent: "compliance_monitor",
          orgId,
        }),
      })
      const json = await res.json()
      // Take just the first paragraph for a concise insight
      const insight = (json.message as string ?? "")
        .split("\n\n")[0]
        .replace(/\*\*/g, "")
        .slice(0, 220)
      setAiInsight(insight)
    } catch {
      // silent — AI insight is non-critical
    } finally {
      setAiLoading(false)
    }
  }, [orgId])

  // ── Handlers ───────────────────────────────────────────────────────────

  async function handleSave() {
    if (!orgId) return
    setSaving(true)
    setSaveError(null)

    try {
      const supabase = createClient()

      if (mode === "create") {
        if (!formControl || !formDueDate) {
          setSaveError("Please select a control and due date.")
          return
        }
        const period = getPeriodString(selectedYear, selectedMonth)
        const isNameOnly = TEAM_MEMBERS.includes(formAssignee as typeof TEAM_MEMBERS[number])
        const { error } = await supabase.from("checkpoints").insert({
          org_id: orgId,
          control_id: formControl,
          period,
          status: "pending",
          assigned_to: isNameOnly ? null : (formAssignee || null),
          assignee_name: isNameOnly ? formAssignee : null,
          due_date: formDueDate,
          notes: formNotes.trim() || null,
        })
        if (error) { setSaveError(error.message); return }

        // Write to audit log
        await supabase.from("audit_log").insert({
          org_id: orgId,
          user_id: userId,
          action: "checkpoint.created",
          entity_type: "checkpoint",
          metadata: { control_id: formControl, period, due_date: formDueDate },
        })

      } else if (mode === "edit" && detail) {
        const isNameOnly = TEAM_MEMBERS.includes(formAssignee as typeof TEAM_MEMBERS[number])
        const { error } = await supabase
          .from("checkpoints")
          .update({
            assigned_to: isNameOnly ? null : (formAssignee || null),
            assignee_name: isNameOnly ? formAssignee : null,
            due_date: formDueDate,
            status: formStatus,
            notes: formNotes.trim() || null,
          })
          .eq("id", detail.id)
        if (error) { setSaveError(error.message); return }

        await supabase.from("audit_log").insert({
          org_id: orgId,
          user_id: userId,
          action: "checkpoint.updated",
          entity_type: "checkpoint",
          entity_id: detail.id,
          metadata: { status: formStatus },
        })
      }

      onRefresh()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleAttest(attest: "pass" | "fail") {
    if (!detail) return
    setAttesting(true)
    setAttestError(null)
    try {
      if (attest === "pass" && (detail.evidence?.length ?? 0) === 0) {
        setAttestError("Upload at least one evidence file before attesting Pass.")
        return
      }
      const supabase = createClient()
      const { error } = await supabase
        .from("checkpoints")
        .update({
          status: attest === "pass" ? "passed" : "failed",
          attestation: attest,
          completed_at: new Date().toISOString(),
          completed_by: userId,
        })
        .eq("id", detail.id)

      if (error) { setAttestError(error.message); return }

      await supabase.from("audit_log").insert({
        org_id: orgId,
        user_id: userId,
        action: `checkpoint.${attest === "pass" ? "passed" : "failed"}`,
        entity_type: "checkpoint",
        entity_id: detail.id,
        metadata: { attestation: attest },
      })

      onRefresh()
      onClose()
    } finally {
      setAttesting(false)
    }
  }

  async function handleUploadFiles(files: FileList | null) {
    if (!files || !detail) return
    setUploading(true)
    setUploadError(null)
    try {
      const supabase = createClient()
      for (const file of Array.from(files)) {
        const { path, error: uploadErr } = await uploadEvidence(orgId, detail.id, file)
        if (!uploadErr && path) {
          await supabase.from("evidence").insert({
            org_id: orgId,
            checkpoint_id: detail.id,
            file_path: path,
            file_name: file.name,
            file_type: file.type.includes("pdf") ? "pdf"
              : file.type.includes("image") ? "image" : "document",
            file_size_bytes: file.size,
            uploaded_by: userId,
          })
        }
      }
      // Refresh evidence list
      await fetchDetail(detail.id)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleToggleReminder() {
    if (!detail) return
    setReminderSaving(true)
    setReminderError(null)
    try {
      const supabase = createClient()
      const targetUserId = detail.assigned_to ?? userId

      if (reminderSet) {
        await supabase
          .from("notifications")
          .delete()
          .eq("entity_id", detail.id)
          .eq("type", "checkpoint_due_reminder")
        setReminderSet(false)
      } else {
        await supabase.from("notifications").insert({
          org_id: orgId,
          user_id: targetUserId,
          type: "checkpoint_due_reminder",
          title: `Due Today: ${detail.control?.title ?? "Checkpoint"}`,
          message: `Your checkpoint "${detail.control?.title ?? "checkpoint"}" is due today (${formatDate(detail.due_date)}). Please complete it and upload evidence.`,
          entity_type: "checkpoint",
          entity_id: detail.id,
          is_read: false,
        })
        setReminderSet(true)
      }
    } catch (e) {
      setReminderError(e instanceof Error ? e.message : "Failed to update reminder")
    } finally {
      setReminderSaving(false)
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────

  const standard = detail?.control?.standard ?? controls.find(c => c.id === formControl)?.standard ?? ""
  const stdColor = STANDARD_COLORS[standard] ?? { bg: "#F5F5F5", color: "#525252" }
  const statusCfg = STATUS_CFG[detail?.status ?? "pending"] ?? STATUS_CFG.pending
  const selectedControl = controls.find(c => c.id === formControl)

  const panelTitle = mode === "create"
    ? "New Checkpoint"
    : loading ? "Loading..."
    : (detail?.control?.title ?? activeEvent?.label ?? "Checkpoint")

  const panelCode = mode === "create"
    ? selectedControl?.code ?? ""
    : detail?.control?.code ?? activeEvent?.control ?? ""

  if (!isOpen) return null

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.28)",
          zIndex: 998,
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* Slide-in Panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0,
          height: "100dvh",
          width: "clamp(360px, 480px, 100vw)",
          background: "#fff",
          zIndex: 999,
          boxShadow: "-6px 0 40px rgba(0,0,0,0.14)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-source-sans-3, 'Source Sans 3', system-ui, sans-serif)",
        }}
      >
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "1px solid #E8E8E8",
          background: "#FAFAFA",
          flexShrink: 0,
        }}>
          {/* Top row: badges + nav + close */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
              {/* Day label */}
              {selectedDay && (
                <span style={{
                  fontSize: "11px", fontWeight: 700, color: "#3BA7C9",
                  background: "#E8F6FA", borderRadius: "4px", padding: "2px 7px",
                  letterSpacing: "0.02em",
                }}>
                  {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedDay}
                </span>
              )}
              {/* Standard badge */}
              {standard && mode !== "create" && (
                <span style={{
                  fontSize: "11px", fontWeight: 700,
                  color: stdColor.color, background: stdColor.bg,
                  borderRadius: "4px", padding: "2px 7px",
                }}>
                  {standard}
                </span>
              )}
              {/* Status badge */}
              {mode === "view" && detail && (
                <span style={{
                  fontSize: "11px", fontWeight: 700,
                  color: statusCfg.color, background: statusCfg.bg,
                  border: `1px solid ${statusCfg.border}`,
                  borderRadius: "4px", padding: "2px 7px",
                }}>
                  {statusCfg.label}
                </span>
              )}
              {mode === "create" && (
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#16A34A", background: "#F0FDF4", borderRadius: "4px", padding: "2px 7px" }}>
                  + NEW
                </span>
              )}

              {/* Multi-event nav */}
              {dayEvents.length > 1 && mode === "view" && (
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: 4 }}>
                  <button
                    onClick={() => { setActiveIdx(i => Math.max(0, i - 1)); setDetail(null) }}
                    disabled={activeIdx === 0}
                    style={{
                      background: "none", border: "1px solid #E8E8E8", borderRadius: "4px",
                      width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: activeIdx === 0 ? "not-allowed" : "pointer",
                      color: activeIdx === 0 ? "#D4D4D4" : "#525252",
                    }}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span style={{ fontSize: "11px", color: "#737373", fontWeight: 600, minWidth: 32, textAlign: "center" }}>
                    {activeIdx + 1}/{dayEvents.length}
                  </span>
                  <button
                    onClick={() => { setActiveIdx(i => Math.min(dayEvents.length - 1, i + 1)); setDetail(null) }}
                    disabled={activeIdx === dayEvents.length - 1}
                    style={{
                      background: "none", border: "1px solid #E8E8E8", borderRadius: "4px",
                      width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: activeIdx === dayEvents.length - 1 ? "not-allowed" : "pointer",
                      color: activeIdx === dayEvents.length - 1 ? "#D4D4D4" : "#525252",
                    }}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {mode === "view" && detail && !detail.completed_at && (
                <button
                  onClick={() => setMode("edit")}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "5px 10px", fontSize: "12px", fontWeight: 600,
                    background: "#fff", color: "#525252", border: "1px solid #E8E8E8",
                    borderRadius: "6px", cursor: "pointer",
                  }}
                >
                  <Edit2 size={11} /> Edit
                </button>
              )}
              {mode !== "view" && (
                <button
                  onClick={() => dayEvents.length > 0 ? setMode("view") : onClose()}
                  style={{
                    padding: "5px 10px", fontSize: "12px", fontWeight: 600,
                    background: "#fff", color: "#525252", border: "1px solid #E8E8E8",
                    borderRadius: "6px", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#fff", border: "1px solid #E8E8E8", borderRadius: "6px", cursor: "pointer",
                }}
              >
                <X size={14} color="#525252" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: "var(--font-source-serif-4, 'Source Serif 4', Georgia, serif)",
            fontSize: "17px", fontWeight: 700, color: "#171717",
            margin: 0, lineHeight: 1.35,
          }}>
            {panelTitle}
          </h2>
          {panelCode && (
            <div style={{ fontSize: "11px", color: "#737373", fontFamily: "monospace", marginTop: 3 }}>
              {panelCode}
            </div>
          )}
        </div>

        {/* ── SCROLLABLE BODY ─────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 20px", gap: 10, color: "#737373" }}>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              Loading checkpoint details...
            </div>
          )}

          {!loading && (
            <>
              {/* ── VIEW: META SECTION ───────────────────────────────── */}
              {mode === "view" && detail && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                        Assigned To
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "13px", color: "#262626", fontWeight: 500 }}>
                        <User size={12} color="#A3A3A3" />
                        {detail.assignee_name ?? detail.assignee?.full_name ?? "Unassigned"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                        Due Date
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "13px", color: "#262626", fontWeight: 500 }}>
                        <Calendar size={12} color="#A3A3A3" />
                        {formatDate(detail.due_date)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                        Period
                      </div>
                      <div style={{ fontSize: "13px", color: "#262626", fontFamily: "monospace" }}>
                        {detail.period}
                      </div>
                    </div>
                    {detail.completed_at && (
                      <div>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                          Completed
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "13px", color: "#16A34A", fontWeight: 600 }}>
                          <Check size={12} strokeWidth={2.5} />
                          {formatDate(detail.completed_at.split("T")[0])}
                        </div>
                      </div>
                    )}
                    {detail.assigned_to === null && (
                      <div style={{ gridColumn: "span 2" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#3BA7C9", background: "#E8F6FA", borderRadius: "4px", padding: "2px 8px" }}>
                          AI Generated
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── EDIT / CREATE FORM ───────────────────────────────── */}
              {(mode === "edit" || mode === "create") && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
                    {mode === "create" ? "Checkpoint Details" : "Edit Details"}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Control selector — create only */}
                    {mode === "create" && (
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#525252", marginBottom: 5 }}>
                          Control <span style={{ color: "#DC2626" }}>*</span>
                        </label>
                        <select
                          value={formControl}
                          onChange={e => setFormControl(e.target.value)}
                          style={{
                            width: "100%", padding: "8px 10px", fontSize: "13px",
                            border: "1px solid #D4D4D4", borderRadius: "6px",
                            background: "#fff", color: formControl ? "#171717" : "#A3A3A3",
                            outline: "none", fontFamily: "inherit",
                          }}
                        >
                          <option value="">Select a control...</option>
                          {controls.map(c => (
                            <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Assignee */}
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#525252", marginBottom: 5 }}>
                        Assigned To
                      </label>
                      <select
                        value={formAssignee}
                        onChange={e => setFormAssignee(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", fontSize: "13px",
                          border: "1px solid #D4D4D4", borderRadius: "6px",
                          background: "#fff", color: "#171717",
                          outline: "none", fontFamily: "inherit",
                        }}
                      >
                        <option value="">Unassigned</option>
                        <optgroup label="Team">
                          {TEAM_MEMBERS.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </optgroup>
                        {members.length > 0 && (
                          <optgroup label="Portal Users">
                            {members.map(m => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.full_name} · {m.role}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {/* Due date */}
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#525252", marginBottom: 5 }}>
                        Due Date <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={e => setFormDueDate(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", fontSize: "13px",
                          border: "1px solid #D4D4D4", borderRadius: "6px",
                          background: "#fff", color: "#171717",
                          outline: "none", boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* Status — edit only */}
                    {mode === "edit" && (
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#525252", marginBottom: 5 }}>
                          Status
                        </label>
                        <select
                          value={formStatus}
                          onChange={e => setFormStatus(e.target.value)}
                          style={{
                            width: "100%", padding: "8px 10px", fontSize: "13px",
                            border: "1px solid #D4D4D4", borderRadius: "6px",
                            background: "#fff", color: "#171717",
                            outline: "none", fontFamily: "inherit",
                          }}
                        >
                          {Object.entries(STATUS_CFG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#525252", marginBottom: 5 }}>
                        Notes
                      </label>
                      <textarea
                        value={formNotes}
                        onChange={e => setFormNotes(e.target.value)}
                        rows={3}
                        placeholder="Optional notes about this checkpoint..."
                        style={{
                          width: "100%", padding: "8px 10px", fontSize: "13px",
                          border: "1px solid #D4D4D4", borderRadius: "6px",
                          background: "#fff", color: "#171717",
                          outline: "none", resize: "vertical",
                          boxSizing: "border-box", fontFamily: "inherit",
                        }}
                      />
                    </div>

                    {saveError && (
                      <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "6px", color: "#DC2626", fontSize: "13px" }}>
                        {saveError}
                      </div>
                    )}

                    <button
                      onClick={handleSave}
                      disabled={saving || (mode === "create" && (!formControl || !formDueDate))}
                      style={{
                        padding: "10px", fontSize: "13px", fontWeight: 700,
                        background: (saving || (mode === "create" && (!formControl || !formDueDate))) ? "#A3A3A3" : "#2A8BA8",
                        color: "#fff", border: "none", borderRadius: "6px",
                        cursor: (saving || (mode === "create" && (!formControl || !formDueDate))) ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      }}
                    >
                      {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                      {mode === "create" ? "Create Checkpoint" : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── TEST PROCEDURE ──────────────────────────────────── */}
              {(detail?.control?.test_procedure || selectedControl?.test_procedure) && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 700, color: "#737373",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    marginBottom: 8, display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <FileText size={11} /> Test Procedure
                  </div>
                  <p style={{ fontSize: "13px", color: "#404040", lineHeight: 1.65, margin: 0 }}>
                    {detail?.control?.test_procedure ?? selectedControl?.test_procedure}
                  </p>
                </div>
              )}

              {/* ── REQUIRED EVIDENCE CHECKLIST ─────────────────────── */}
              {((detail?.control?.required_evidence?.length ?? 0) > 0 ||
                (selectedControl?.required_evidence?.length ?? 0) > 0) && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 700, color: "#737373",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    marginBottom: 8, display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <ClipboardList size={11} /> Required Evidence
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(detail?.control?.required_evidence ?? selectedControl?.required_evidence ?? []).map((item, i) => {
                      const uploaded = detail?.evidence ?? []
                      const keyword = item.toLowerCase().split(" ").slice(0, 2).join(" ")
                      const covered = uploaded.some(e => e.file_name.toLowerCase().includes(keyword))
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13px" }}>
                          <div style={{
                            width: 17, height: 17, borderRadius: "50%", flexShrink: 0,
                            background: covered ? "#F0FDF4" : "#FEF2F2",
                            border: `1.5px solid ${covered ? "#86EFAC" : "#FCA5A5"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {covered
                              ? <Check size={9} color="#16A34A" strokeWidth={3} />
                              : <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FCA5A5" }} />
                            }
                          </div>
                          <span style={{ color: "#404040" }}>{item}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── EVIDENCE UPLOADS ────────────────────────────────── */}
              {mode === "view" && detail && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 700, color: "#737373",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    marginBottom: 8, display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <Paperclip size={11} /> Evidence ({detail.evidence?.length ?? 0})
                  </div>

                  {/* File list */}
                  {(detail.evidence?.length ?? 0) > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                      {detail.evidence.map(ev => (
                        <div key={ev.id} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "7px 10px", background: "#FAFAFA",
                          border: "1px solid #E8E8E8", borderRadius: "6px",
                        }}>
                          <Paperclip size={12} color="#737373" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: "12px", color: "#262626", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.file_name}
                          </span>
                          {ev.file_size_bytes && (
                            <span style={{ fontSize: "11px", color: "#A3A3A3", flexShrink: 0 }}>
                              {formatBytes(ev.file_size_bytes)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload zone */}
                  {!detail.completed_at && (
                    <>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => {
                          e.preventDefault()
                          setDragOver(false)
                          handleUploadFiles(e.dataTransfer.files)
                        }}
                        style={{
                          border: `1.5px dashed ${dragOver ? "#3BA7C9" : "#D4D4D4"}`,
                          borderRadius: "6px", padding: "16px 12px",
                          textAlign: "center", cursor: "pointer",
                          background: dragOver ? "#E8F6FA" : "#FAFAFA",
                          transition: "all 0.15s",
                        }}
                      >
                        {uploading
                          ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#3BA7C9", fontSize: "13px" }}>
                              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                              Uploading...
                            </div>
                          : <>
                              <Upload size={18} color="#A3A3A3" style={{ margin: "0 auto 6px", display: "block" }} />
                              <div style={{ fontSize: "13px", color: "#737373", fontWeight: 500 }}>Click or drag to upload</div>
                              <div style={{ fontSize: "11px", color: "#A3A3A3", marginTop: 2 }}>PDF, JPG, PNG, DOC</div>
                            </>
                        }
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        style={{ display: "none" }}
                        onChange={e => handleUploadFiles(e.target.files)}
                      />
                      {uploadError && (
                        <p style={{ fontSize: "12px", color: "#DC2626", margin: "6px 0 0" }}>{uploadError}</p>
                      )}
                    </>
                  )}

                  {(detail.evidence?.length ?? 0) === 0 && detail.completed_at && (
                    <p style={{ fontSize: "13px", color: "#A3A3A3", margin: 0 }}>No evidence on file.</p>
                  )}
                </div>
              )}

              {/* ── ATTESTATION ─────────────────────────────────────── */}
              {mode === "view" && detail && !detail.completed_at && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 700, color: "#737373",
                    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10,
                  }}>
                    Attestation
                  </div>
                  {attestError && (
                    <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "6px", color: "#DC2626", fontSize: "12px", marginBottom: 10 }}>
                      {attestError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => handleAttest("pass")}
                      disabled={attesting}
                      style={{
                        flex: 1, padding: "10px 0", fontSize: "13px", fontWeight: 700,
                        background: "#F0FDF4", color: "#15803D",
                        border: "1.5px solid #86EFAC", borderRadius: "7px",
                        cursor: attesting ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      {attesting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} strokeWidth={2.5} />}
                      Pass
                    </button>
                    <button
                      onClick={() => handleAttest("fail")}
                      disabled={attesting}
                      style={{
                        flex: 1, padding: "10px 0", fontSize: "13px", fontWeight: 700,
                        background: "#FEF2F2", color: "#DC2626",
                        border: "1.5px solid #FCA5A5", borderRadius: "7px",
                        cursor: attesting ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <AlertTriangle size={14} /> Fail
                    </button>
                  </div>
                </div>
              )}

              {/* ── COMPLETED BANNER ────────────────────────────────── */}
              {mode === "view" && detail?.completed_at && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: "8px",
                    background: detail.attestation === "pass" ? "#F0FDF4" : "#FEF2F2",
                    border: `1px solid ${detail.attestation === "pass" ? "#86EFAC" : "#FCA5A5"}`,
                  }}>
                    {detail.attestation === "pass"
                      ? <Check size={16} color="#15803D" strokeWidth={2.5} />
                      : <AlertTriangle size={16} color="#DC2626" />
                    }
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: detail.attestation === "pass" ? "#15803D" : "#DC2626" }}>
                        {detail.attestation === "pass" ? "Passed & Completed" : "Marked as Failed"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#A3A3A3", marginTop: 1 }}>
                        {formatDate(detail.completed_at.split("T")[0])}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── NOTES (view) ─────────────────────────────────────── */}
              {mode === "view" && detail?.notes && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                    Notes
                  </div>
                  <p style={{ fontSize: "13px", color: "#404040", lineHeight: 1.65, margin: 0 }}>
                    {detail.notes}
                  </p>
                </div>
              )}

              {/* ── AI INSIGHT ───────────────────────────────────────── */}
              {mode === "view" && detail && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F5F5F5" }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 700, color: "#3BA7C9",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    marginBottom: 8, display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <Bot size={11} /> AI Insight
                  </div>
                  <div style={{
                    padding: "10px 13px",
                    background: "#F0F9FC", border: "1px solid #B5E3F0",
                    borderRadius: "7px", borderLeft: "3px solid #3BA7C9",
                  }}>
                    {aiLoading
                      ? <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3BA7C9", fontSize: "13px" }}>
                          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                          Analyzing...
                        </div>
                      : <p style={{ fontSize: "13px", color: "#2A8BA8", lineHeight: 1.6, margin: 0 }}>
                          {aiInsight ?? "Compliance Monitor is analyzing this checkpoint."}
                        </p>
                    }
                  </div>
                </div>
              )}

              {/* ── EMAIL REMINDER ──────────────────────────────────── */}
              {mode === "view" && detail && !detail.completed_at && (
                <div style={{ padding: "14px 18px" }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 700, color: "#737373",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    marginBottom: 8, display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <Bell size={11} /> Email Reminder
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 13px", background: "#FAFAFA",
                    border: "1px solid #E8E8E8", borderRadius: "7px",
                  }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#262626" }}>
                        {reminderSet ? "Reminder scheduled" : "No reminder set"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#737373", marginTop: 2 }}>
                        {reminderSet
                          ? `Due ${formatDate(detail.due_date)}`
                          : "Notify assigned user when due"
                        }
                      </div>
                    </div>
                    <button
                      onClick={handleToggleReminder}
                      disabled={reminderSaving}
                      style={{
                        padding: "6px 13px", fontSize: "12px", fontWeight: 600,
                        background: reminderSet ? "#FEF2F2" : "#E8F6FA",
                        color: reminderSet ? "#DC2626" : "#2A8BA8",
                        border: `1px solid ${reminderSet ? "#FECACA" : "#B5E3F0"}`,
                        borderRadius: "6px", cursor: reminderSaving ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 5,
                        flexShrink: 0,
                      }}
                    >
                      {reminderSaving
                        ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                        : reminderSet ? <BellRing size={12} /> : <Bell size={12} />
                      }
                      {reminderSet ? "Remove" : "Set Reminder"}
                    </button>
                  </div>
                  {reminderError && (
                    <p style={{ fontSize: "12px", color: "#DC2626", margin: "6px 0 0" }}>{reminderError}</p>
                  )}
                </div>
              )}

              {/* ── MOCK DATA PLACEHOLDER ───────────────────────────── */}
              {mode === "view" && activeEvent?.isMock && !loading && (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "36px", marginBottom: 14 }}>📋</div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#525252", marginBottom: 6 }}>Sample Checkpoint</p>
                  <p style={{ fontSize: "13px", color: "#A3A3A3", lineHeight: 1.6, marginBottom: 18 }}>
                    This is preview data. Generate real checkpoints from the calendar to manage them here.
                  </p>
                  <button
                    onClick={() => { setMode("create") }}
                    style={{
                      padding: "8px 18px", fontSize: "13px", fontWeight: 600,
                      background: "#2A8BA8", color: "#fff", border: "none",
                      borderRadius: "6px", cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <Plus size={14} /> Create Real Checkpoint
                  </button>
                </div>
              )}

              {/* ── EMPTY DAY — footer CTA ──────────────────────────── */}
              {mode === "view" && dayEvents.length === 0 && !loading && (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "36px", marginBottom: 12 }}>📅</div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#525252", marginBottom: 6 }}>No checkpoints this day</p>
                  <p style={{ fontSize: "13px", color: "#A3A3A3", lineHeight: 1.6, marginBottom: 18 }}>
                    Click below to schedule a compliance checkpoint for{" "}
                    {selectedDay ? `${MONTH_NAMES[selectedMonth]} ${selectedDay}` : "this day"}.
                  </p>
                  <button
                    onClick={() => setMode("create")}
                    style={{
                      padding: "9px 20px", fontSize: "13px", fontWeight: 700,
                      background: "#2A8BA8", color: "#fff", border: "none",
                      borderRadius: "6px", cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 7,
                    }}
                  >
                    <Plus size={15} /> Create Checkpoint
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}
