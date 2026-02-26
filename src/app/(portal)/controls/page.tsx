"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Control, Recurrence } from "@/lib/types"

// ── Design system constants ────────────────────────────────────────────────
const STANDARD_COLORS: Record<string, { bg: string; color: string }> = {
  OIG: { bg: "#EFF6FF", color: "#1D4ED8" },
  HIPAA: { bg: "#F5F3FF", color: "#6D28D9" },
  AHCCCS: { bg: "#F0FDF4", color: "#15803D" },
  TJC: { bg: "#FFF7ED", color: "#C2410C" },
  CARF: { bg: "#FCE7F3", color: "#9D174D" },
  Safety: { bg: "#FFFBEB", color: "#B45309" },
  Internal: { bg: "#F5F5F5", color: "#525252" },
}

const FREQ_LABELS: Record<Recurrence, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
}

const FREQ_COLORS: Record<Recurrence, { bg: string; color: string }> = {
  monthly: { bg: "#E8F6FA", color: "#2A8BA8" },
  quarterly: { bg: "#FDF4FF", color: "#9333EA" },
  semi_annual: { bg: "#FFF7ED", color: "#C2410C" },
  annual: { bg: "#F0FDF4", color: "#15803D" },
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  compliance: "Compliance",
  clinical: "Clinical",
  ops: "Operations",
  hr: "HR",
  billing: "Billing",
  supervisor: "Supervisor",
  executive: "Executive",
}

// ── Seed data ──────────────────────────────────────────────────────────────
function buildSeedControls(orgId: string) {
  return [
    {
      org_id: orgId, code: "OIG-SCR-001", title: "OIG/SAM Exclusion Screening",
      description: "Monthly screening of all employees, contractors, and vendors against OIG LEIE and SAM.gov exclusion databases.",
      standard: "OIG", category: "Credentialing",
      test_procedure: "1. Export current staff/contractor roster.\n2. Run each name through https://exclusions.oig.hhs.gov/\n3. Run each name through https://sam.gov/\n4. Document results in the screening log.\n5. If any match found, escalate immediately to compliance director.",
      required_evidence: ["OIG LEIE screenshot", "SAM.gov results export", "Staff roster", "Screening log signed by compliance officer"],
      frequency: "monthly", default_owner_role: "compliance", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "HIPAA-SAF-001", title: "HIPAA Security Safeguards Audit",
      description: "Monthly review of technical, physical, and administrative safeguards protecting ePHI.",
      standard: "HIPAA", category: "Privacy & Security",
      test_procedure: "1. Review access control logs for unauthorized access attempts.\n2. Verify workstation screen-lock policies are enforced.\n3. Confirm encryption is enabled on all mobile devices.\n4. Test emergency access procedures.\n5. Review audit logs for ePHI access.",
      required_evidence: ["Access control log review", "Workstation audit checklist", "Device encryption status report"],
      frequency: "monthly", default_owner_role: "compliance", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "HIPAA-TRN-001", title: "HIPAA Training Verification",
      description: "Quarterly verification that all workforce members have completed required HIPAA privacy and security training.",
      standard: "HIPAA", category: "Training",
      test_procedure: "1. Pull training completion report from LMS.\n2. Cross-reference against current staff roster.\n3. Identify any staff not yet trained.\n4. Issue corrective notices for overdue staff.\n5. Document completion rates.",
      required_evidence: ["LMS completion report", "Staff roster comparison", "Training certificates sample"],
      frequency: "quarterly", default_owner_role: "hr", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "AHCCCS-CA-001", title: "Clinical Chart Audit (IOP Program)",
      description: "Monthly clinical chart audit for IOP program clients, verifying documentation completeness and treatment plan compliance.",
      standard: "AHCCCS", category: "Clinical Quality",
      test_procedure: "1. Randomly select 10% of active IOP charts (min 5).\n2. Use AHCCCS chart audit tool to score each chart.\n3. Verify: intake assessments, treatment plans, progress notes, discharge planning.\n4. Calculate overall compliance score.\n5. Document deficiencies and create corrective action plan if <90%.",
      required_evidence: ["Completed chart audit tool", "Corrective action memo (if applicable)", "Auditor signature page"],
      frequency: "monthly", default_owner_role: "clinical", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "AHCCCS-CA-002", title: "Clinical Chart Audit (Residential)",
      description: "Monthly clinical chart audit for Residential program clients.",
      standard: "AHCCCS", category: "Clinical Quality",
      test_procedure: "1. Randomly select 10% of active Residential charts (min 5).\n2. Apply AHCCCS residential audit tool.\n3. Verify level of care criteria, physician orders, nursing notes.\n4. Document results and submit to QM committee.",
      required_evidence: ["Residential chart audit tool", "QM submission confirmation"],
      frequency: "monthly", default_owner_role: "clinical", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "SAFE-FD-001", title: "Fire Drill & Evacuation",
      description: "Monthly fire drill conducted at each facility location per fire code requirements.",
      standard: "Safety", category: "Safety",
      test_procedure: "1. Announce drill to staff (not clients for realistic conditions).\n2. Activate alarm and time evacuation.\n3. Verify all persons reach assembly point.\n4. Record evacuation time.\n5. Debrief with staff on any issues.\n6. Complete fire drill log.",
      required_evidence: ["Fire drill log signed by safety officer", "Evacuation time record", "Staff attendance sheet"],
      frequency: "monthly", default_owner_role: "ops", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "SAFE-MED-001", title: "Medication Storage Compliance",
      description: "Monthly inspection of medication storage areas for compliance with state and federal storage requirements.",
      standard: "Safety", category: "Medication Management",
      test_procedure: "1. Inspect all medication storage areas.\n2. Verify: controlled substances locked, temperature within range, expired meds segregated.\n3. Count controlled substance inventory vs. log.\n4. Document any discrepancies.\n5. Escalate discrepancies to medical director immediately.",
      required_evidence: ["Medication storage inspection checklist", "Controlled substance count log", "Temperature logs"],
      frequency: "monthly", default_owner_role: "clinical", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "HR-CRED-001", title: "Staff Credential Verification",
      description: "Quarterly verification that all licensed clinical staff hold current, valid credentials.",
      standard: "Internal", category: "HR",
      test_procedure: "1. Pull list of all licensed clinical staff.\n2. Verify each license via state licensing board website.\n3. Note expiration dates.\n4. Send renewal reminders 90 and 30 days before expiration.\n5. Update credential tracking spreadsheet.",
      required_evidence: ["Credential verification log", "License status screenshots", "HR attestation signature"],
      frequency: "quarterly", default_owner_role: "hr", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "OPS-GRV-001", title: "Grievance Log Review",
      description: "Monthly review of client grievance log to ensure timely resolution and pattern identification.",
      standard: "AHCCCS", category: "Operations",
      test_procedure: "1. Review all grievances filed during the month.\n2. Verify each was acknowledged within 5 business days.\n3. Verify resolution within 30 days.\n4. Identify any recurring themes.\n5. Escalate unresolved grievances.\n6. Submit summary to QM committee.",
      required_evidence: ["Grievance log with resolution dates", "QM summary submission"],
      frequency: "monthly", default_owner_role: "ops", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "OPS-INC-001", title: "Incident Report Review",
      description: "Monthly review of all incident reports for trends, root causes, and required regulatory reporting.",
      standard: "AHCCCS", category: "Operations",
      test_procedure: "1. Compile all incident reports from the month.\n2. Categorize by type (fall, elopement, aggression, medication error, etc.).\n3. Verify all required reports were submitted to AHCCCS within 24/72 hours.\n4. Identify trends requiring corrective action.\n5. Present to QM committee.",
      required_evidence: ["Incident report log", "AHCCCS submission confirmations", "QM presentation slide"],
      frequency: "monthly", default_owner_role: "ops", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "CLN-TP-001", title: "Treatment Plan Compliance Audit",
      description: "Quarterly audit verifying treatment plans meet clinical, billing, and regulatory standards.",
      standard: "AHCCCS", category: "Clinical Quality",
      test_procedure: "1. Select random sample of treatment plans (15% of active caseload).\n2. Verify: client goals are measurable, interventions are evidence-based, physician/prescriber signatures present, review dates current.\n3. Calculate compliance score.\n4. Document deficiencies with clinician.",
      required_evidence: ["Treatment plan audit checklist", "Sample treatment plans reviewed", "Compliance score summary"],
      frequency: "quarterly", default_owner_role: "clinical", is_active: true, related_policy_ids: [],
    },
    {
      org_id: orgId, code: "BIL-CLM-001", title: "Claims Accuracy Audit",
      description: "Quarterly audit of billing claims for accuracy, medical necessity documentation, and coding compliance.",
      standard: "AHCCCS", category: "Billing",
      test_procedure: "1. Pull random sample of 30 claims from the quarter.\n2. Verify diagnosis codes match clinical documentation.\n3. Confirm service codes match notes.\n4. Check prior authorization was obtained where required.\n5. Calculate error rate.\n6. Submit findings to compliance director.",
      required_evidence: ["Claims sample with documentation", "Error rate calculation", "Compliance director sign-off"],
      frequency: "quarterly", default_owner_role: "billing", is_active: true, related_policy_ids: [],
    },
  ]
}

// ── Component ──────────────────────────────────────────────────────────────
type StandardFilter = "all" | "OIG" | "HIPAA" | "AHCCCS" | "TJC" | "CARF" | "Safety" | "Internal"
type FreqFilter = "all" | Recurrence

export default function ControlsPage() {
  const router = useRouter()
  const [controls, setControls] = useState<Control[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [standardFilter, setStandardFilter] = useState<StandardFilter>("all")
  const [freqFilter, setFreqFilter] = useState<FreqFilter>("all")
  const [activeOnly, setActiveOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchControls = useCallback(async (oid: string) => {
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("controls")
      .select("*")
      .eq("org_id", oid)
      .order("code")
    if (err) { setError(err.message); return [] }
    return (data as Control[]) ?? []
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      setLoading(true)
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { setError("Not authenticated"); setLoading(false); return }

      const { data: member, error: memberErr } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()
      if (memberErr || !member) { setError("No organization found"); setLoading(false); return }

      const oid = member.org_id as string
      setOrgId(oid)

      const items = await fetchControls(oid)

      if (items.length === 0) {
        // Seed with realistic controls
        setSeeding(true)
        const seed = buildSeedControls(oid)
        const { error: seedErr } = await supabase.from("controls").insert(seed)
        if (seedErr) { setError("Seed error: " + seedErr.message) }
        else {
          const seeded = await fetchControls(oid)
          setControls(seeded)
        }
        setSeeding(false)
      } else {
        setControls(items)
      }
      setLoading(false)
    }
    init()
  }, [fetchControls])

  const filtered = controls.filter((c) => {
    if (standardFilter !== "all" && c.standard !== standardFilter) return false
    if (freqFilter !== "all" && c.frequency !== freqFilter) return false
    if (activeOnly && !c.is_active) return false
    return true
  })

  async function toggleActive(ctrl: Control) {
    const supabase = createClient()
    const { error: err } = await supabase
      .from("controls")
      .update({ is_active: !ctrl.is_active, updated_at: new Date().toISOString() })
      .eq("id", ctrl.id)
    if (!err) setControls((prev) => prev.map((c) => c.id === ctrl.id ? { ...c, is_active: !c.is_active } : c))
  }

  if (loading || seeding) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "#737373", fontSize: 14 }}>
          {seeding ? "Seeding control library with sample data…" : "Loading…"}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "#DC2626", fontSize: 14 }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "Source Serif 4, Georgia, serif", fontSize: 22, fontWeight: 600, color: "#171717", marginBottom: 4 }}>
            Control Library
          </h1>
          <p style={{ fontSize: 13, color: "#737373" }}>
            {controls.length} controls · {controls.filter(c => c.is_active).length} active
          </p>
        </div>
        <button
          onClick={() => router.push("/controls/new")}
          style={{
            padding: "8px 16px", backgroundColor: "#3BA7C9", color: "#fff",
            border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          + New Control
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: 12, alignItems: "center", padding: "12px 16px",
        backgroundColor: "#FAFAFA", border: "1px solid #E8E8E8", borderRadius: 6, marginBottom: 16,
      }}>
        <label style={{ fontSize: 12, color: "#737373", fontWeight: 600 }}>Filter:</label>

        <select
          value={standardFilter}
          onChange={(e) => setStandardFilter(e.target.value as StandardFilter)}
          style={{ padding: "5px 10px", border: "1px solid #D4D4D4", borderRadius: 4, fontSize: 13, color: "#262626", backgroundColor: "#fff" }}
        >
          <option value="all">All Standards</option>
          {["OIG", "HIPAA", "AHCCCS", "TJC", "CARF", "Safety", "Internal"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={freqFilter}
          onChange={(e) => setFreqFilter(e.target.value as FreqFilter)}
          style={{ padding: "5px 10px", border: "1px solid #D4D4D4", borderRadius: 4, fontSize: 13, color: "#262626", backgroundColor: "#fff" }}
        >
          <option value="all">All Frequencies</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="semi_annual">Semi-Annual</option>
          <option value="annual">Annual</option>
        </select>

        {/* Active toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#525252" }}>
          <div
            onClick={() => setActiveOnly(!activeOnly)}
            style={{
              width: 36, height: 20, borderRadius: 10,
              backgroundColor: activeOnly ? "#3BA7C9" : "#D4D4D4",
              position: "relative", transition: "background 0.2s", cursor: "pointer",
            }}
          >
            <div style={{
              position: "absolute", top: 2, left: activeOnly ? 18 : 2,
              width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }} />
          </div>
          Active only
        </label>

        <span style={{ marginLeft: "auto", fontSize: 12, color: "#737373" }}>
          {filtered.length} of {controls.length} shown
        </span>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #E8E8E8", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#FAFAFA", borderBottom: "1px solid #E8E8E8" }}>
              {["Code", "Control Title", "Standard", "Frequency", "Owner Role", "Active", "Actions"].map((h) => (
                <th key={h} style={{
                  padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#737373",
                  textAlign: "left", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#A3A3A3", fontSize: 14 }}>
                  No controls match the current filters.
                </td>
              </tr>
            ) : filtered.map((ctrl, i) => {
              const sc = STANDARD_COLORS[ctrl.standard] ?? { bg: "#F5F5F5", color: "#525252" }
              const fc = FREQ_COLORS[ctrl.frequency] ?? { bg: "#F5F5F5", color: "#525252" }
              return (
                <tr
                  key={ctrl.id}
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F5F5F5" : "none", cursor: "pointer" }}
                  onClick={() => router.push(`/controls/${ctrl.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FAFAFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                >
                  <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: "#525252", whiteSpace: "nowrap" }}>
                    {ctrl.code}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 500, color: "#171717", maxWidth: 280 }}>
                    <div>{ctrl.title}</div>
                    {ctrl.category && (
                      <div style={{ fontSize: 11, color: "#A3A3A3", marginTop: 2 }}>{ctrl.category}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                      {ctrl.standard}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: fc.bg, color: fc.color }}>
                      {FREQ_LABELS[ctrl.frequency]}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "#525252" }}>
                    {ctrl.default_owner_role ? ROLE_LABELS[ctrl.default_owner_role] ?? ctrl.default_owner_role : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                    <div
                      onClick={() => toggleActive(ctrl)}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        backgroundColor: ctrl.is_active ? "#3BA7C9" : "#D4D4D4",
                        position: "relative", cursor: "pointer",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 2, left: ctrl.is_active ? 18 : 2,
                        width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff",
                        transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      }} />
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => router.push(`/controls/${ctrl.id}`)}
                        style={{
                          padding: "4px 10px", fontSize: 12, fontWeight: 500,
                          border: "1px solid #D4D4D4", borderRadius: 4, cursor: "pointer",
                          backgroundColor: "#fff", color: "#525252",
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
