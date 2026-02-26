"use client"

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { uploadEvidence } from "@/lib/supabase/storage"
import type { Evidence } from "@/lib/types"

const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,.mp4"
const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "video/mp4"]

function fileIcon(type: string): string {
  if (type.includes("pdf")) return "📄"
  if (type.includes("image")) return "🖼"
  if (type.includes("video")) return "🎬"
  return "📎"
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface UploadingFile {
  name: string
  progress: number // 0-100
  error: string | null
}

interface Props {
  orgId: string
  checkpointId: string
  userId: string
  initialFiles?: Evidence[]
  onChange?: (files: Evidence[]) => void
}

export default function EvidenceUploader({ orgId, checkpointId, userId, initialFiles = [], onChange }: Props) {
  const [files, setFiles] = useState<Evidence[]>(initialFiles)
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFile = useCallback(async (file: File) => {
    // Validate mime type
    if (!ACCEPTED_MIME.includes(file.type)) {
      setUploading((prev) => [...prev, { name: file.name, progress: 0, error: "Unsupported file type" }])
      return
    }

    // Add to uploading list
    const uploadEntry: UploadingFile = { name: file.name, progress: 10, error: null }
    setUploading((prev) => [...prev, uploadEntry])

    // Simulate progress ticks
    const tickId = setInterval(() => {
      setUploading((prev) =>
        prev.map((u) =>
          u.name === file.name && u.progress < 80 ? { ...u, progress: u.progress + 15 } : u
        )
      )
    }, 300)

    // Upload to Supabase Storage
    const { path, error: uploadErr } = await uploadEvidence(orgId, checkpointId, file)
    clearInterval(tickId)

    if (uploadErr) {
      setUploading((prev) =>
        prev.map((u) =>
          u.name === file.name ? { ...u, progress: 0, error: uploadErr.message } : u
        )
      )
      return
    }

    // Create evidence record in DB
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
      setUploading((prev) =>
        prev.map((u) =>
          u.name === file.name ? { ...u, progress: 0, error: dbErr.message } : u
        )
      )
      return
    }

    // Complete progress, then move to files list
    setUploading((prev) =>
      prev.map((u) => (u.name === file.name ? { ...u, progress: 100 } : u))
    )
    setTimeout(() => {
      setUploading((prev) => prev.filter((u) => u.name !== file.name))
      const newFiles = [...files, ev as Evidence]
      setFiles(newFiles)
      onChange?.(newFiles)
    }, 500)
  }, [checkpointId, files, onChange, orgId, userId])

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    dropped.forEach(addFile)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    picked.forEach(addFile)
    e.target.value = "" // reset
  }

  async function handleDelete(ev: Evidence) {
    setDeletingId(ev.id)
    // Remove from storage and delete DB record
    const supabase = createClient()
    await supabase.storage.from(`org-${orgId}-evidence`).remove([ev.file_path])
    await supabase.from("evidence").delete().eq("id", ev.id)
    const newFiles = files.filter((f) => f.id !== ev.id)
    setFiles(newFiles)
    onChange?.(newFiles)
    setDeletingId(null)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Existing files */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {files.map((ev) => (
            <div
              key={ev.id}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                backgroundColor: "#FAFAFA", border: "1px solid #E8E8E8", borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 18 }}>{fileIcon(ev.file_type ?? "")}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#262626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ev.file_name}
                </div>
                <div style={{ fontSize: 11, color: "#A3A3A3", marginTop: 1 }}>
                  {ev.file_size_bytes ? formatBytes(ev.file_size_bytes) : ""} · {new Date(ev.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleDelete(ev)}
                disabled={deletingId === ev.id}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: deletingId === ev.id ? "#A3A3A3" : "#DC2626",
                  fontSize: 18, lineHeight: 1, padding: "2px 4px",
                }}
                title="Remove file"
              >
                {deletingId === ev.id ? "…" : "×"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress items */}
      {uploading.map((u) => (
        <div
          key={u.name}
          style={{
            padding: "8px 12px", backgroundColor: "#FAFAFA", border: `1px solid ${u.error ? "#DC2626" : "#E8E8E8"}`,
            borderRadius: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: u.error ? "#DC2626" : "#262626", fontWeight: 500 }}>
              {u.error ? `❌ ${u.name}` : `📤 ${u.name}`}
            </span>
            <span style={{ fontSize: 12, color: u.error ? "#DC2626" : "#737373" }}>
              {u.error ?? `${u.progress}%`}
            </span>
          </div>
          {!u.error && (
            <div style={{ height: 4, backgroundColor: "#E8E8E8", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%", width: `${u.progress}%`,
                  backgroundColor: u.progress === 100 ? "#16A34A" : "#3BA7C9",
                  transition: "width 0.3s ease, background-color 0.3s",
                }}
              />
            </div>
          )}
        </div>
      ))}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#3BA7C9" : "#D4D4D4"}`,
          borderRadius: 8,
          padding: "24px 16px",
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: dragOver ? "#E8F6FA" : "#FAFAFA",
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#525252", margin: 0 }}>
          Click or drag files to upload
        </p>
        <p style={{ fontSize: 12, color: "#A3A3A3", margin: "4px 0 0" }}>
          PDF, JPG, PNG, MP4
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleInputChange}
          style={{ display: "none" }}
        />
      </div>
    </div>
  )
}
