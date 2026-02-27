"use client"

import { useState, useEffect, useCallback, useRef, DragEvent, ChangeEvent } from "react"
import { X, Upload, FileText, Image, Paperclip, Eye, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { uploadEvidence, getEvidenceUrl } from "@/lib/supabase/storage"
import type { Evidence } from "@/lib/types"

// ── Types ───────────────────────────────────────────────────────
interface CheckpointData {
  id: string
  status: string
  due_date: string
  period: string
  attestation: string | null
  notes: string | null
  assigned_to: string | null
  completed_at: string | null
  completed_by: string | null
  control: {
    code: string
    title: string
    standard: string
    test_procedure: string
    required_evidence: string[]
  } | null
  assignee: { full_name: string } | null
  evidence: Evidence[]
}

interface Props {
  checkpointId: string
  orgId: string
  userId: string
  onClose: () => void
  onComplete?: () => void
}

// ── Style configs ───────────────────────────────────────────────
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

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: "#FEF3C7", color: "#B45309", label: "Pending" },
  in_progress: { bg: "#E8F6FA", color: "#2A8BA8", label: "In Progress" },
  passed:      { bg: "#DCFCE7", color: "#15803D", label: "Passed" },
  failed:      { bg: "#FEE2E2", color: "#DC2626", label: "Failed" },
  overdue:     { bg: "#FEE2E2", color: "#B91C1C", label: "Overdue" },
  skipped:     { bg: "#F5F5F5", color: "#737373", label: "Skipped" },
}

const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,.doc,.docx"
const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type: string | undefined) {
  if (!type) return <Paperclip size={16} color="#737373" />
  if (type.includes("pdf")) return <FileText size={16} color="#DC2626" />
  if (type.includes("image")) return <Image size={16} color="#3BA7C9" />
  return <Paperclip size={16} color="#737373" />
}

// ── Component ───────────────────────────────────────────────────
export default function CheckpointModal({ checkpointId, orgId, userId, onClose, onComplete }: Props) {
  const [data, setData] = useState<CheckpointData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [attestation, setAttestation] = useState<"pass" | "fail" | null>(null)
  const [evidenceFiles, setEvidenceFiles] = useState<Evidence[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Evidence upload state
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState<{ name: string; progress: number; error: string | null }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Fetch checkpoint data ──────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: cp, error: cpErr } = await supabase
      .from("checkpoints")
      .select(`
        id, status, due_date, period, attestation, notes, assigned_to, completed_at, completed_by,
        control:controls!control_id(code, title, standard, test_procedure, required_evidence),
        assignee:profiles!assigned_to(full_name),
        evidence(*)
      `)
      .eq("id", checkpointId)
      .eq("org_id", orgId)
      .single()

    if (cpErr || !cp) {
      setError("Failed to load checkpoint")
      setLoading(false)
      return
    }

    const checkpoint = cp as unknown as CheckpointData
    setData(checkpoint)
    setEvidenceFiles(checkpoint.evidence ?? [])
    if (checkpoint.attestation === "pass") setAttestation("pass")
    else if (checkpoint.attestation === "fail") setAttestation("fail")
    setLoading(false)
  }, [checkpointId, orgId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Evidence upload ────────────────────────────────────────
  const addFile = useCallback(async (file: File) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      setUploading(prev => [...prev, { name: file.name, progress: 0, error: "Unsupported file type" }])
      return
    }

    setUploading(prev => [...prev, { name: file.name, progress: 10, error: null }])

    const tickId = setInterval(() => {
      setUploading(prev => prev.map(u =>
        u.name === file.name && u.progress < 80 ? { ...u, progress: u.progress + 15 } : u
      ))
    }, 300)

    const { path, error: uploadErr } = await uploadEvidence(orgId, checkpointId, file)
    clearInterval(tickId)

    if (uploadErr) {
      setUploading(prev => prev.map(u =>
        u.name === file.name ? { ...u, progress: 0, error: uploadErr.message } : u
      ))
      return
    }

    const supabase = createClient()
    const { data: ev, error: dbErr } = await supabase
      .from("evidence")
      .insert({
        org_id: orgId,
        checkpoint_id: checkpointId,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        tags: {},
        uploaded_by: userId,
      })
      .select("*")
      .single()

    if (dbErr) {
      setUploading(prev => prev.map(u =>
        u.name === file.name ? { ...u, progress: 0, error: dbErr.message } : u
      ))
      return
    }

    setUploading(prev => prev.map(u => u.name === file.name ? { ...u, progress: 100 } : u))
    setTimeout(() => {
      setUploading(prev => prev.filter(u => u.name !== file.name))
      setEvidenceFiles(prev => [...prev, ev as Evidence])
    }, 400)
  }, [orgId, checkpointId, userId])

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(addFile)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(addFile)
    e.target.value = ""
  }

  async function handleViewFile(ev: Evidence) {
    const url = await getEvidenceUrl(orgId, ev.file_path)
    if (url) window.open(url, "_blank")
  }

  // ── Submit attestation ─────────────────────────────────────
  const isAlreadyComplete = data?.status === "passed" || data?.status === "failed"
  const passBlockedByEvidence = attestation === "pass" && evidenceFiles.length === 0
  const canSubmit = attestation !== null && !passBlockedByEvidence && !submitting && !isAlreadyComplete

  async function handleSubmit() {
    if (!canSubmit || !data) return
    setSubmitting(true)
    setSubmitError(null)

    const supabase = createClient()
    const newStatus = attestation === "pass" ? "passed" : "failed"
    const now = new Date().toISOString()

    const { error: updateErr } = await supabase
      .from("checkpoints")
      .update({
        status: newStatus,
        attestation,
        completed_at: now,
        completed_by: userId,
        updated_at: now,
      })
      .eq("id", checkpointId)
      .eq("org_id", orgId)

    if (updateErr) {
      setSubmitError(updateErr.message)
      setSubmitting(false)
      return
    }

    // Audit log
    await supabase.from("audit_log").insert({
      org_id: orgId,
      user_id: userId,
      action: "checkpoint.complete",
      entity_type: "checkpoint",
      entity_id: checkpointId,
      metadata: { attestation, status: newStatus, evidence_count: evidenceFiles.length, period: data.period, control_code: data.control?.code },
    })

    setSubmitting(false)
    onComplete?.()
    onClose()
  }

  // ── Render ─────────────────────────────────────────────────
  const ctrl = data?.control
  const standardKey = ctrl?.standard ?? ""
  const sc = STANDARD_COLORS[standardKey] ?? { bg: "#F5F5F5", color: "#525252" }
  const statusStyle = STATUS_STYLES[data?.status ?? "pending"] ?? STATUS_STYLES.pending

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 12, maxWidth: 520, width: "100%",
          margin: "0 16px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          maxHeight: "90vh", overflowY: "auto",
          padding: "28px 32px",
        }}
      >
        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: "#737373" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 14 }}>Loading checkpoint...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p style={{ color: "#DC2626", fontSize: 14, marginBottom: 16 }}>{error}</p>
            <button onClick={onClose} style={{ fontSize: 13, color: "#3BA7C9", background: "none", border: "none", cursor: "pointer" }}>Close</button>
          </div>
        )}

        {/* Content */}
        {data && !loading && !error && (
          <>
            {/* ── Header ──────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-source-serif-4, Georgia, serif)", fontSize: 18, fontWeight: 700, color: "#171717", margin: 0, marginBottom: 4, lineHeight: 1.3 }}>
                  {ctrl?.title ?? "Checkpoint"}
                </h2>
                <code style={{ fontSize: 12, fontFamily: "monospace", color: "#737373" }}>
                  {ctrl?.code ?? "---"}
                </code>
              </div>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3A3", padding: 4, display: "flex", flexShrink: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Details 2x2 grid ────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px", marginBottom: 24 }}>
              {/* Standard */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>Standard</div>
                <span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color }}>
                  {standardKey || "---"}
                </span>
              </div>

              {/* Assigned To */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>Assigned To</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: "#E8F6FA", color: "#2A8BA8",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {(data.assignee?.full_name ?? "U")[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#262626" }}>
                    {data.assignee?.full_name ?? "Unassigned"}
                  </span>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>Due Date</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#262626" }}>
                  {new Date(data.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Status */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>Status</div>
                <span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                  {statusStyle.label}
                </span>
              </div>
            </div>

            {/* ── Test Procedure ───────────────────────── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                Test Procedure
              </div>
              <div style={{ background: "#F5F5F5", borderRadius: 6, padding: "12px 14px" }}>
                <p style={{ fontSize: 13, color: "#404040", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                  {ctrl?.test_procedure || "No test procedure defined for this control."}
                </p>
              </div>
            </div>

            {/* ── Evidence ────────────────────────────── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Evidence
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#2A8BA8", background: "#E8F6FA",
                  borderRadius: 10, padding: "1px 7px", minWidth: 18, textAlign: "center",
                }}>
                  {evidenceFiles.length}
                </span>
              </div>

              {/* File list */}
              {evidenceFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {evidenceFiles.map(ev => (
                    <div key={ev.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                      background: "#FAFAFA", border: "1px solid #E8E8E8", borderRadius: 6,
                    }}>
                      {fileIcon(ev.file_type)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#262626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.file_name}
                        </div>
                        <div style={{ fontSize: 11, color: "#A3A3A3", marginTop: 1 }}>
                          {ev.file_size_bytes ? formatBytes(ev.file_size_bytes) : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewFile(ev)}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          background: "none", border: "1px solid #E8E8E8", borderRadius: 4,
                          padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "#3BA7C9",
                          cursor: "pointer",
                        }}
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload progress */}
              {uploading.map(u => (
                <div key={u.name} style={{ padding: "8px 12px", background: "#FAFAFA", border: `1px solid ${u.error ? "#DC2626" : "#E8E8E8"}`, borderRadius: 6, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: u.error ? "#DC2626" : "#262626", fontWeight: 500 }}>{u.name}</span>
                    <span style={{ fontSize: 11, color: u.error ? "#DC2626" : "#737373" }}>{u.error ?? `${u.progress}%`}</span>
                  </div>
                  {!u.error && (
                    <div style={{ height: 3, background: "#E8E8E8", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${u.progress}%`, background: u.progress === 100 ? "#16A34A" : "#3BA7C9", transition: "width 0.3s" }} />
                    </div>
                  )}
                </div>
              ))}

              {/* Drop zone */}
              {!isAlreadyComplete && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "#3BA7C9" : "#D4D4D4"}`,
                    borderRadius: 8, padding: "20px 16px", textAlign: "center", cursor: "pointer",
                    background: dragOver ? "#E8F6FA" : "#FAFAFA", transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <Upload size={20} color="#A3A3A3" style={{ marginBottom: 6 }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#525252", margin: "4px 0 0" }}>
                    Drop files here or click to upload
                  </p>
                  <p style={{ fontSize: 11, color: "#A3A3A3", margin: "2px 0 0" }}>PDF, JPG, PNG, DOC</p>
                  <input ref={inputRef} type="file" multiple accept={ACCEPTED_TYPES} onChange={handleInputChange} style={{ display: "none" }} />
                </div>
              )}

              {passBlockedByEvidence && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, fontSize: 12, color: "#DC2626" }}>
                  At least one evidence document is required to mark as passed.
                </div>
              )}
            </div>

            {/* ── Attestation ─────────────────────────── */}
            {!isAlreadyComplete && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                  Attestation
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setAttestation("pass")}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      border: `2px solid ${attestation === "pass" ? "#16A34A" : "#E8E8E8"}`,
                      background: attestation === "pass" ? "#F0FDF4" : "#fff",
                      color: attestation === "pass" ? "#16A34A" : "#737373",
                      transition: "all 0.15s",
                    }}
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => setAttestation("fail")}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      border: `2px solid ${attestation === "fail" ? "#DC2626" : "#E8E8E8"}`,
                      background: attestation === "fail" ? "#FEF2F2" : "#fff",
                      color: attestation === "fail" ? "#DC2626" : "#737373",
                      transition: "all 0.15s",
                    }}
                  >
                    Fail
                  </button>
                </div>
              </div>
            )}

            {/* ── Completed banner ────────────────────── */}
            {isAlreadyComplete && (
              <div style={{
                padding: "14px 16px", borderRadius: 8, marginBottom: 24,
                background: data.status === "passed" ? "#F0FDF4" : "#FEF2F2",
                border: `1px solid ${data.status === "passed" ? "#BBF7D0" : "#FECACA"}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: data.status === "passed" ? "#16A34A" : "#DC2626", marginBottom: 2 }}>
                  {data.status === "passed" ? "Checkpoint Passed" : "Checkpoint Failed"}
                </div>
                {data.completed_at && (
                  <div style={{ fontSize: 12, color: "#737373" }}>
                    Completed {new Date(data.completed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </div>
            )}

            {/* ── Submit error ────────────────────────── */}
            {submitError && (
              <div style={{ marginBottom: 16, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, fontSize: 12, color: "#DC2626" }}>
                {submitError}
              </div>
            )}

            {/* ── Footer ─────────────────────────────── */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "9px 20px", borderRadius: 6, border: "1px solid #E8E8E8",
                  background: "#fff", fontSize: 13, fontWeight: 600, color: "#525252", cursor: "pointer",
                }}
              >
                {isAlreadyComplete ? "Close" : "Cancel"}
              </button>
              {!isAlreadyComplete && (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    padding: "9px 20px", borderRadius: 6, border: "none",
                    background: canSubmit ? "#2A8BA8" : "#E8E8E8",
                    fontSize: 13, fontWeight: 600,
                    color: canSubmit ? "#fff" : "#A3A3A3",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    transition: "background 0.15s",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit & Complete"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
