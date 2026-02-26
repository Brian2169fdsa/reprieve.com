"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import EvidenceUploader from "./evidence-uploader"
import type { Checkpoint, Evidence } from "@/lib/types"

const STANDARD_COLORS: Record<string, { bg: string; color: string }> = {
  OIG: { bg: "#EFF6FF", color: "#1D4ED8" },
  HIPAA: { bg: "#F5F3FF", color: "#6D28D9" },
  AHCCCS: { bg: "#F0FDF4", color: "#15803D" },
  TJC: { bg: "#FFF7ED", color: "#C2410C" },
  CARF: { bg: "#FCE7F3", color: "#9D174D" },
  Safety: { bg: "#FFFBEB", color: "#B45309" },
  Internal: { bg: "#F5F5F5", color: "#525252" },
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#FFFBEB", color: "#D97706", label: "Pending" },
  in_progress: { bg: "#E8F6FA", color: "#2A8BA8", label: "In Progress" },
  passed: { bg: "#F0FDF4", color: "#16A34A", label: "Passed" },
  failed: { bg: "#FEF2F2", color: "#DC2626", label: "Failed" },
  overdue: { bg: "#FEF2F2", color: "#DC2626", label: "Overdue" },
  skipped: { bg: "#F5F5F5", color: "#A3A3A3", label: "Skipped" },
}

interface Props {
  checkpoint: Checkpoint
  orgId: string
  userId: string
  onComplete?: (updated: Checkpoint) => void
}

export default function CheckpointModal({ checkpoint, orgId, userId, onComplete }: Props) {
  const ctrl = checkpoint.control

  const [attestation, setAttestation] = useState<"pass" | "fail" | null>(
    checkpoint.attestation === "pass" ? "pass"
    : checkpoint.attestation === "fail" ? "fail"
    : null
  )
  const [notes, setNotes] = useState(checkpoint.notes ?? "")
  const [evidenceFiles, setEvidenceFiles] = useState<Evidence[]>(checkpoint.evidence ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(
    checkpoint.status === "passed" || checkpoint.status === "failed"
  )

  const isAlreadyComplete = checkpoint.status === "passed" || checkpoint.status === "failed"
  const passBlockedByEvidence = attestation === "pass" && evidenceFiles.length === 0
  const canSubmit = attestation !== null && !passBlockedByEvidence && !submitting && !isAlreadyComplete

  const standard = ctrl?.standard ?? ""
  const sc = STANDARD_COLORS[standard] ?? { bg: "#F5F5F5", color: "#525252" }
  const status = STATUS_STYLES[checkpoint.status] ?? STATUS_STYLES.pending

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const newStatus = attestation === "pass" ? "passed" : "failed"
    const now = new Date().toISOString()

    const { error: updateErr } = await supabase
      .from("checkpoints")
      .update({
        status: newStatus,
        attestation,
        notes: notes.trim() || null,
        completed_at: now,
        completed_by: userId,
        updated_at: now,
      })
      .eq("id", checkpoint.id)
      .eq("org_id", orgId)

    if (updateErr) {
      setError(updateErr.message)
      setSubmitting(false)
      return
    }

    // Write audit log
    await supabase.from("audit_log").insert({
      org_id: orgId,
      user_id: userId,
      action: "checkpoint.complete",
      entity_type: "checkpoint",
      entity_id: checkpoint.id,
      metadata: {
        attestation,
        status: newStatus,
        evidence_count: evidenceFiles.length,
        period: checkpoint.period,
        control_code: ctrl?.code,
      },
    })

    setSubmitting(false)
    setSubmitted(true)
    onComplete?.({ ...checkpoint, status: newStatus as "passed" | "failed", attestation, notes, completed_at: now, completed_by: userId })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <code style={{ fontSize: 12, fontFamily: "monospace", padding: "2px 8px", backgroundColor: "#F5F5F5", color: "#525252", borderRadius: 4 }}>
              {ctrl?.code ?? "—"}
            </code>
            {standard && (
              <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                {standard}
              </span>
            )}
            <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: status.bg, color: status.color }}>
              {status.label}
            </span>
          </div>
          <h2 style={{ fontFamily: "Source Serif 4, Georgia, serif", fontSize: 20, fontWeight: 600, color: "#171717", margin: 0 }}>
            {ctrl?.title ?? "Checkpoint"}
          </h2>
        </div>
      </div>

      {/* ── Info grid ──────────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
        padding: "14px 16px", backgroundColor: "#FAFAFA", border: "1px solid #E8E8E8", borderRadius: 8,
      }}>
        {[
          { label: "Period", value: checkpoint.period },
          { label: "Due Date", value: new Date(checkpoint.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
          { label: "Assigned To", value: checkpoint.assignee?.full_name ?? "Unassigned" },
          { label: "Category", value: ctrl?.category ?? "—" },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>
              {label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#262626" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Test Procedure ─────────────────────────────────────── */}
      <section>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#2A8BA8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, marginTop: 0 }}>
          Test Procedure
        </h3>
        <div style={{ backgroundColor: "#F0F9FC", border: "1px solid #E8F6FA", borderRadius: 6, padding: "14px 16px" }}>
          {ctrl?.test_procedure ? (
            <pre style={{ fontSize: 13, color: "#404040", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
              {ctrl.test_procedure}
            </pre>
          ) : (
            <p style={{ fontSize: 13, color: "#A3A3A3", margin: 0 }}>No test procedure defined for this control.</p>
          )}
        </div>

        {/* Required evidence checklist */}
        {ctrl?.required_evidence && ctrl.required_evidence.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#737373", marginBottom: 6 }}>Required Evidence</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ctrl.required_evidence.map((ev) => (
                <span key={ev} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 12, backgroundColor: "#E8F6FA", color: "#2A8BA8", fontWeight: 500 }}>
                  {ev}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Evidence Upload ────────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#2A8BA8", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            Evidence
          </h3>
          <span style={{ fontSize: 12, color: "#737373" }}>
            {evidenceFiles.length} file{evidenceFiles.length !== 1 ? "s" : ""} uploaded
          </span>
        </div>

        {passBlockedByEvidence && (
          <div style={{
            marginBottom: 12, padding: "10px 14px",
            backgroundColor: "#FEF2F2", border: "1px solid #DC2626", borderRadius: 6,
            fontSize: 13, color: "#DC2626", display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <span>⚠️</span>
            <span>At least one evidence document is required to mark as passed.</span>
          </div>
        )}

        {!isAlreadyComplete ? (
          <EvidenceUploader
            orgId={orgId}
            checkpointId={checkpoint.id}
            userId={userId}
            initialFiles={evidenceFiles}
            onChange={setEvidenceFiles}
          />
        ) : (
          evidenceFiles.length === 0 ? (
            <p style={{ fontSize: 13, color: "#A3A3A3" }}>No evidence files attached.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {evidenceFiles.map((ev) => (
                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", backgroundColor: "#FAFAFA", border: "1px solid #E8E8E8", borderRadius: 6 }}>
                  <span style={{ fontSize: 18 }}>{ev.file_type?.includes("pdf") ? "📄" : ev.file_type?.includes("image") ? "🖼" : "📎"}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#262626" }}>{ev.file_name}</span>
                  <span style={{ fontSize: 11, color: "#A3A3A3", marginLeft: "auto" }}>
                    {new Date(ev.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* ── Attestation ───────────────────────────────────────── */}
      {!isAlreadyComplete && (
        <section>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#2A8BA8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, marginTop: 0 }}>
            Attestation
          </h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => setAttestation("pass")}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
                border: `2px solid ${attestation === "pass" ? "#16A34A" : "#E8E8E8"}`,
                backgroundColor: attestation === "pass" ? "#F0FDF4" : "#fff",
                color: attestation === "pass" ? "#16A34A" : "#737373",
                transition: "all 0.15s",
              }}
            >
              ✓ Pass
            </button>
            <button
              onClick={() => setAttestation("fail")}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
                border: `2px solid ${attestation === "fail" ? "#DC2626" : "#E8E8E8"}`,
                backgroundColor: attestation === "fail" ? "#FEF2F2" : "#fff",
                color: attestation === "fail" ? "#DC2626" : "#737373",
                transition: "all 0.15s",
              }}
            >
              ✗ Fail
            </button>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#525252", display: "block", marginBottom: 6 }}>
              Notes {attestation === "fail" && <span style={{ color: "#DC2626" }}>*</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={attestation === "fail" ? "Describe the finding and corrective action needed…" : "Optional notes…"}
              style={{
                width: "100%", padding: "10px 12px", border: "1px solid #D4D4D4", borderRadius: 6,
                fontSize: 13, color: "#171717", resize: "vertical", minHeight: 80, fontFamily: "inherit",
                boxSizing: "border-box", outline: "none",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", backgroundColor: "#FEF2F2", border: "1px solid #DC2626", borderRadius: 6, color: "#DC2626", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              marginTop: 16, width: "100%", padding: "11px 0",
              backgroundColor: !canSubmit ? "#E8E8E8" : attestation === "pass" ? "#16A34A" : "#DC2626",
              color: !canSubmit ? "#A3A3A3" : "#fff",
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed", transition: "background 0.15s",
            }}
          >
            {submitting ? "Submitting…" : !canSubmit && passBlockedByEvidence
              ? "Upload evidence before marking passed"
              : !attestation
              ? "Select Pass or Fail to submit"
              : `Submit — ${attestation === "pass" ? "Mark Passed" : "Mark Failed"}`
            }
          </button>
        </section>
      )}

      {/* ── Completed banner ──────────────────────────────────── */}
      {(isAlreadyComplete || submitted) && (
        <div style={{
          padding: "16px 20px", borderRadius: 8,
          backgroundColor: checkpoint.status === "passed" || submitted && attestation === "pass" ? "#F0FDF4" : "#FEF2F2",
          border: `1px solid ${checkpoint.status === "passed" || submitted && attestation === "pass" ? "#16A34A" : "#DC2626"}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: checkpoint.status === "passed" || submitted && attestation === "pass" ? "#16A34A" : "#DC2626", marginBottom: 4 }}>
            {checkpoint.status === "passed" || submitted && attestation === "pass" ? "✓ Checkpoint Passed" : "✗ Checkpoint Failed"}
          </div>
          {checkpoint.completed_at && (
            <div style={{ fontSize: 12, color: "#737373" }}>
              Completed {new Date(checkpoint.completed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          )}
          {checkpoint.notes && (
            <div style={{ fontSize: 13, color: "#525252", marginTop: 8, fontStyle: "italic" }}>
              "{checkpoint.notes}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
