"use client"

import { use, useEffect, useState, useCallback, KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Control, OrgRole, Policy } from "@/lib/types"

const STANDARDS = ["OIG", "HIPAA", "AHCCCS", "TJC", "CARF", "Safety", "Internal"]
const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
]
const ROLES: { value: OrgRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "compliance", label: "Compliance" },
  { value: "clinical", label: "Clinical" },
  { value: "ops", label: "Operations" },
  { value: "hr", label: "HR" },
  { value: "billing", label: "Billing" },
  { value: "supervisor", label: "Supervisor" },
  { value: "executive", label: "Executive" },
]

// ── Shared form styles ─────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, display: "block" }
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid #D4D4D4", borderRadius: 6,
  fontSize: 13, color: "#171717", backgroundColor: "#fff", outline: "none", boxSizing: "border-box",
}
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", minHeight: 100, fontFamily: "inherit" }
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" }
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 0 }

// ── Tag input for required_evidence ───────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("")

  function addTag() {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput("")
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() }
    if (e.key === "Backspace" && input === "" && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div style={{ border: "1px solid #D4D4D4", borderRadius: 6, padding: "6px 8px", backgroundColor: "#fff", minHeight: 42 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 8px", backgroundColor: "#E8F6FA", color: "#2A8BA8",
              borderRadius: 4, fontSize: 12, fontWeight: 500,
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#2A8BA8", padding: 0, fontSize: 14, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? "Type evidence item, press Enter" : "Add more…"}
          style={{ border: "none", outline: "none", fontSize: 13, color: "#171717", flex: 1, minWidth: 120, padding: "2px 0" }}
        />
      </div>
    </div>
  )
}

// ── Policy multi-select ────────────────────────────────────────────────────
function PolicyMultiSelect({
  orgId,
  selected,
  onChange,
}: { orgId: string; selected: string[]; onChange: (ids: string[]) => void }) {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!orgId) return
    const supabase = createClient()
    supabase.from("policies").select("id, title, code").eq("org_id", orgId).order("code")
      .then(({ data }) => setPolicies((data as Policy[]) ?? []))
  }, [orgId])

  const filtered = policies.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  const selectedPolicies = policies.filter((p) => selected.includes(p.id))

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          border: "1px solid #D4D4D4", borderRadius: 6, padding: "6px 8px",
          backgroundColor: "#fff", minHeight: 42, cursor: "pointer",
        }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          {selectedPolicies.length === 0 && (
            <span style={{ fontSize: 13, color: "#A3A3A3" }}>Select related policies…</span>
          )}
          {selectedPolicies.map((p) => (
            <span
              key={p.id}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", backgroundColor: "#F5F3FF", color: "#6D28D9",
                borderRadius: 4, fontSize: 12, fontWeight: 500,
              }}
            >
              {p.code}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(p.id) }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6D28D9", padding: 0, fontSize: 14 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          backgroundColor: "#fff", border: "1px solid #D4D4D4", borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: 8, maxHeight: 220, overflowY: "auto",
        }}>
          <input
            type="text"
            placeholder="Search policies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{ ...inputStyle, marginBottom: 8 }}
            autoFocus
          />
          {filtered.map((p) => (
            <label
              key={p.id}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                borderRadius: 4, cursor: "pointer", fontSize: 13, color: "#262626",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F5F5")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
            >
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggle(p.id)}
                style={{ accentColor: "#3BA7C9" }}
              />
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#737373" }}>{p.code}</span>
              <span>{p.title}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p style={{ fontSize: 13, color: "#A3A3A3", padding: "8px 0", textAlign: "center" }}>No policies found</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
type PageParams = Promise<{ id: string }>

export default function ControlDetailPage({ params }: { params: PageParams }) {
  const { id } = use(params)
  const isNew = id === "new"
  const router = useRouter()

  const [orgId, setOrgId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(isNew)

  const [form, setForm] = useState({
    code: "",
    title: "",
    description: "",
    standard: "OIG",
    category: "",
    test_procedure: "",
    required_evidence: [] as string[],
    frequency: "monthly",
    default_owner_role: "compliance" as OrgRole,
    related_policy_ids: [] as string[],
    is_active: true,
  })

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }))

  const fetchControl = useCallback(async (oid: string) => {
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("controls")
      .select("*")
      .eq("id", id)
      .eq("org_id", oid)
      .single()
    if (err || !data) { setError("Control not found"); return }
    const c = data as Control
    setForm({
      code: c.code,
      title: c.title,
      description: c.description ?? "",
      standard: c.standard,
      category: c.category ?? "",
      test_procedure: c.test_procedure,
      required_evidence: c.required_evidence ?? [],
      frequency: c.frequency,
      default_owner_role: c.default_owner_role ?? "compliance",
      related_policy_ids: c.related_policy_ids ?? [],
      is_active: c.is_active,
    })
  }, [id])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      setLoading(true)
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { setError("Not authenticated"); setLoading(false); return }
      setUserId(user.id)

      const { data: member, error: memberErr } = await supabase
        .from("org_members").select("org_id").eq("user_id", user.id).eq("is_active", true).single()
      if (memberErr || !member) { setError("No organization found"); setLoading(false); return }
      setOrgId(member.org_id as string)

      if (!isNew) await fetchControl(member.org_id as string)
      setLoading(false)
    }
    init()
  }, [isNew, fetchControl])

  async function handleSave() {
    if (!orgId) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload = {
      org_id: orgId,
      code: form.code.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      standard: form.standard,
      category: form.category.trim() || null,
      test_procedure: form.test_procedure.trim(),
      required_evidence: form.required_evidence,
      frequency: form.frequency,
      default_owner_role: form.default_owner_role,
      related_policy_ids: form.related_policy_ids,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    if (!payload.code || !payload.title || !payload.test_procedure) {
      setError("Code, Title, and Test Procedure are required.")
      setSaving(false)
      return
    }

    const supabase = createClient()
    let savedId = id
    if (isNew) {
      const { data, error: insertErr } = await supabase.from("controls").insert(payload).select("id").single()
      if (insertErr) { setError(insertErr.message); setSaving(false); return }
      savedId = (data as { id: string }).id
    } else {
      const { error: updateErr } = await supabase.from("controls").update(payload).eq("id", id).eq("org_id", orgId)
      if (updateErr) { setError(updateErr.message); setSaving(false); return }
    }

    // Audit log
    await supabase.from("audit_log").insert({
      org_id: orgId,
      user_id: userId,
      action: isNew ? "control.create" : "control.update",
      entity_type: "control",
      entity_id: savedId,
      metadata: { code: payload.code, title: payload.title },
    })

    setSaving(false)
    setSuccess(isNew ? "Control created successfully." : "Changes saved.")
    if (isNew) router.push(`/controls/${savedId}`)
    else setEditMode(false)
  }

  if (loading) return <div style={{ padding: 32, color: "#737373", fontSize: 14 }}>Loading…</div>

  const pageTitle = isNew ? "New Control" : form.title || "Control Detail"

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <button
            onClick={() => router.push("/controls")}
            style={{ fontSize: 12, color: "#3BA7C9", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8, display: "block" }}
          >
            ← Back to Control Library
          </button>
          <h1 style={{ fontFamily: "Source Serif 4, Georgia, serif", fontSize: 22, fontWeight: 600, color: "#171717" }}>
            {pageTitle}
          </h1>
          {!isNew && (
            <code style={{ fontSize: 12, color: "#737373", fontFamily: "monospace" }}>{form.code}</code>
          )}
        </div>
        {!isNew && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            style={{ padding: "8px 16px", backgroundColor: "#3BA7C9", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Edit Control
          </button>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", backgroundColor: "#FEF2F2", border: "1px solid #DC2626", borderRadius: 6, color: "#DC2626", fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginBottom: 16, padding: "10px 14px", backgroundColor: "#F0FDF4", border: "1px solid #16A34A", borderRadius: 6, color: "#16A34A", fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Form */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E8E8E8", borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Code */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Code <span style={{ color: "#DC2626" }}>*</span></label>
            {editMode ? (
              <input
                style={inputStyle}
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="e.g. OIG-SCR-001"
              />
            ) : (
              <p style={{ fontFamily: "monospace", fontSize: 14, color: "#262626", padding: "8px 0" }}>{form.code}</p>
            )}
          </div>

          {/* Standard */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Standard <span style={{ color: "#DC2626" }}>*</span></label>
            {editMode ? (
              <select style={selectStyle} value={form.standard} onChange={(e) => set("standard", e.target.value)}>
                {STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <p style={{ fontSize: 14, color: "#262626", padding: "8px 0" }}>{form.standard}</p>
            )}
          </div>

          {/* Title — full width */}
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Title <span style={{ color: "#DC2626" }}>*</span></label>
            {editMode ? (
              <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. OIG/SAM Exclusion Screening" />
            ) : (
              <p style={{ fontSize: 14, color: "#262626", padding: "8px 0" }}>{form.title}</p>
            )}
          </div>

          {/* Category */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Category</label>
            {editMode ? (
              <input style={inputStyle} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Credentialing" />
            ) : (
              <p style={{ fontSize: 14, color: "#262626", padding: "8px 0" }}>{form.category || "—"}</p>
            )}
          </div>

          {/* Frequency */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Frequency <span style={{ color: "#DC2626" }}>*</span></label>
            {editMode ? (
              <select style={selectStyle} value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            ) : (
              <p style={{ fontSize: 14, color: "#262626", padding: "8px 0" }}>
                {FREQUENCIES.find((f) => f.value === form.frequency)?.label}
              </p>
            )}
          </div>

          {/* Default Owner Role */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Default Owner Role</label>
            {editMode ? (
              <select style={selectStyle} value={form.default_owner_role} onChange={(e) => set("default_owner_role", e.target.value as OrgRole)}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            ) : (
              <p style={{ fontSize: 14, color: "#262626", padding: "8px 0" }}>
                {ROLES.find((r) => r.value === form.default_owner_role)?.label ?? form.default_owner_role}
              </p>
            )}
          </div>

          {/* Active */}
          <div style={{ ...fieldStyle, justifyContent: "flex-end" }}>
            <label style={labelStyle}>Status</label>
            {editMode ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 8 }}>
                <div
                  onClick={() => set("is_active", !form.is_active)}
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    backgroundColor: form.is_active ? "#3BA7C9" : "#D4D4D4",
                    position: "relative", cursor: "pointer",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 2, left: form.is_active ? 18 : 2,
                    width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff",
                    transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }} />
                </div>
                <span style={{ fontSize: 13, color: "#525252" }}>{form.is_active ? "Active" : "Inactive"}</span>
              </label>
            ) : (
              <span style={{
                display: "inline-block", marginTop: 8, padding: "2px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                backgroundColor: form.is_active ? "#F0FDF4" : "#F5F5F5",
                color: form.is_active ? "#16A34A" : "#A3A3A3",
              }}>
                {form.is_active ? "Active" : "Inactive"}
              </span>
            )}
          </div>

          {/* Description */}
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Description</label>
            {editMode ? (
              <textarea style={{ ...textareaStyle, minHeight: 72 }} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief description of this control requirement" />
            ) : (
              <p style={{ fontSize: 14, color: "#525252", lineHeight: 1.6, padding: "8px 0" }}>{form.description || "—"}</p>
            )}
          </div>

          {/* Test Procedure */}
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Test Procedure <span style={{ color: "#DC2626" }}>*</span></label>
            <p style={{ fontSize: 11, color: "#A3A3A3", marginBottom: 6 }}>Step-by-step instructions for completing this checkpoint</p>
            {editMode ? (
              <textarea style={{ ...textareaStyle, minHeight: 140 }} value={form.test_procedure} onChange={(e) => set("test_procedure", e.target.value)} placeholder="1. Step one&#10;2. Step two&#10;3. Step three" />
            ) : (
              <p style={{ fontSize: 14, color: "#525252", lineHeight: 1.7, padding: "8px 0", whiteSpace: "pre-wrap" }}>{form.test_procedure || "—"}</p>
            )}
          </div>

          {/* Required Evidence */}
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Required Evidence</label>
            <p style={{ fontSize: 11, color: "#A3A3A3", marginBottom: 6 }}>Press Enter or comma to add each evidence item</p>
            {editMode ? (
              <TagInput tags={form.required_evidence} onChange={(t) => set("required_evidence", t)} />
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 0" }}>
                {form.required_evidence.length === 0 ? (
                  <span style={{ fontSize: 13, color: "#A3A3A3" }}>None specified</span>
                ) : form.required_evidence.map((ev) => (
                  <span key={ev} style={{ padding: "2px 8px", backgroundColor: "#E8F6FA", color: "#2A8BA8", borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                    {ev}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Related Policies */}
          {orgId && (
            <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Related Policies</label>
              {editMode ? (
                <PolicyMultiSelect orgId={orgId} selected={form.related_policy_ids} onChange={(ids) => set("related_policy_ids", ids)} />
              ) : (
                <p style={{ fontSize: 14, color: "#525252", padding: "8px 0" }}>
                  {form.related_policy_ids.length === 0 ? "None linked" : `${form.related_policy_ids.length} policies linked`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {editMode && (
          <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid #F0F0F0" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "9px 20px", backgroundColor: saving ? "#A3A3A3" : "#3BA7C9", color: "#fff",
                border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : isNew ? "Create Control" : "Save Changes"}
            </button>
            {!isNew && (
              <button
                onClick={() => { setEditMode(false); setError(null); setSuccess(null) }}
                style={{ padding: "9px 20px", backgroundColor: "#fff", color: "#525252", border: "1px solid #D4D4D4", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
