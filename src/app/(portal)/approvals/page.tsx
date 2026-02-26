'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AgentName } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PolicyApproval {
  id: string;
  code: string;
  title: string;
  category: string;
  submittedBy: string;
  submittedAt: string;
  changeSummary: string;
  contentPreview: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
}

interface SuggestionApproval {
  id: string;
  agent: AgentName;
  entityType: string;
  entityCode: string;
  title: string;
  description: string;
  suggestedText?: string;
  confidence: number;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_POLICIES: PolicyApproval[] = [
  {
    id: 'pol-1',
    code: 'POL-SAF-002',
    title: 'Medication Storage & Administration',
    category: 'Safety',
    submittedBy: 'Sarah Chen',
    submittedAt: 'Feb 22, 2026',
    changeSummary: 'Updated temperature monitoring requirements to include digital logging',
    contentPreview: 'Section 4.2 — Temperature Monitoring: All medication storage refrigerators shall be equipped with digital temperature logging devices capable of continuous 24-hour monitoring. Temperature logs must be reviewed daily by a designated staff member and retained for a minimum of 3 years. Manual spot-checks are required at shift change in addition to digital logs.',
    status: 'pending',
  },
  {
    id: 'pol-2',
    code: 'POL-CLN-002',
    title: 'Telehealth Service Delivery',
    category: 'Clinical',
    submittedBy: 'James Williams',
    submittedAt: 'Feb 23, 2026',
    changeSummary: 'New policy establishing telehealth consent and delivery standards',
    contentPreview: 'This policy establishes standards for the delivery of clinical services via telehealth platforms at Cholla Behavioral Health. All telehealth sessions require documented informed consent specific to the telehealth modality, including disclosure of recording policies, platform privacy practices, and patient rights to request in-person services.',
    status: 'pending',
  },
];

const SEED_SUGGESTIONS: SuggestionApproval[] = [
  {
    id: 'sug-1',
    agent: 'policy_guardian',
    entityType: 'Policy',
    entityCode: 'POL-CLN-002',
    title: 'Telehealth Policy references consent process not found in Consent Procedures policy',
    description: 'POL-CLN-002 (Telehealth Service Delivery) references a "digital consent process" and "telehealth-specific consent form" that are not defined or referenced in the existing Consent Procedures policy. This cross-policy gap could result in inconsistent clinical practice and a failed audit finding.',
    suggestedText: 'Add to Consent Procedures policy, Section 3: "For telehealth services, a separate Telehealth Consent Form (Form TH-001) must be obtained prior to first session. This form covers: (a) the telehealth platform and its privacy practices, (b) recording consent, (c) the client\'s right to request in-person services at any time."',
    confidence: 0.92,
    createdAt: 'Feb 24, 2026',
    status: 'pending',
  },
  {
    id: 'sug-2',
    agent: 'evidence_librarian',
    entityType: 'Checkpoint',
    entityCode: 'Multiple',
    title: '3 February checkpoints completed without required evidence uploads',
    description: 'Evidence Librarian scan identified 3 checkpoints marked as completed (or in-progress) with zero evidence uploads: SAFE-FD-001 (Fire Drill Log), HIPAA-SA-001 (missing risk assessment), and AHCCCS-CHA-001 (missing corrective memo). Per policy, checkpoints cannot be marked passed without at least one evidence upload.',
    suggestedText: undefined,
    confidence: 0.98,
    createdAt: 'Feb 24, 2026',
    status: 'pending',
  },
  {
    id: 'sug-3',
    agent: 'compliance_monitor',
    entityType: 'Control',
    entityCode: 'New Control',
    title: 'Add digital temperature logging control for medication storage',
    description: 'Based on the open CAPA for medication storage temperature gaps (CAPA-2026-003) and the updated policy POL-SAF-002, a new monthly control should be created to verify digital temperature log completeness. This would close the loop between the CAPA corrective action and ongoing compliance monitoring.',
    suggestedText: 'New Control: AHCCCS-MED-001 — Medication Storage Temperature Log Audit. Frequency: Monthly. Owner Role: Clinical. Required Evidence: (1) Digital temperature log export, (2) Designee signature confirming review.',
    confidence: 0.85,
    createdAt: 'Feb 25, 2026',
    status: 'pending',
  },
];

// ─── Styles & helpers ──────────────────────────────────────────────────────────

const AGENT_STYLES: Record<AgentName, { label: string; bg: string; color: string }> = {
  policy_guardian:    { label: 'Policy Guardian',    bg: '#E8F6FA', color: '#0E7490' },
  compliance_monitor: { label: 'Compliance Monitor', bg: '#F0FDF4', color: '#15803D' },
  evidence_librarian: { label: 'Evidence Librarian', bg: '#FDF0EB', color: '#C05A2C' },
  qm_orchestrator:    { label: 'QM Orchestrator',    bg: '#F5F3FF', color: '#6D28D9' },
};

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Safety:   { bg: '#FFFBEB', color: '#B45309' },
  Clinical: { bg: '#F5F3FF', color: '#6D28D9' },
  HIPAA:    { bg: '#EFF6FF', color: '#1D4ED8' },
  HR:       { bg: '#FDF4FF', color: '#9333EA' },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? '#16A34A' : pct >= 75 ? '#D97706' : '#C05A2C';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '5px', background: 'var(--g200, #E8E8E8)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color, minWidth: '34px' }}>{pct}%</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type PolicyExpandState = 'view_changes' | 'reject' | 'request_changes' | null;
type SuggestionExpandState = 'modify' | 'reject' | null;

export default function ApprovalsPage() {
  const [policies, setPolicies] = useState<PolicyApproval[]>(SEED_POLICIES);
  const [suggestions, setSuggestions] = useState<SuggestionApproval[]>(SEED_SUGGESTIONS);
  const [isLoading, setIsLoading] = useState(true);

  // Expansion state
  const [policyExpand, setPolicyExpand] = useState<Record<string, PolicyExpandState>>({});
  const [policyNotes, setPolicyNotes] = useState<Record<string, string>>({});
  const [suggestionExpand, setSuggestionExpand] = useState<Record<string, SuggestionExpandState>>({});
  const [suggestionNotes, setSuggestionNotes] = useState<Record<string, string>>({});
  const [modifyText, setModifyText] = useState<Record<string, string>>({});

  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch from Supabase ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: memberData } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!memberData?.org_id) { setIsLoading(false); return; }

      const [{ data: polData }, { data: sugData }] = await Promise.all([
        supabase
          .from('policies')
          .select('id, code, title, category, status, updated_at, owner:profiles!owner_id(full_name), current_version:policy_versions!current_version_id(change_summary, content_html)')
          .eq('org_id', memberData.org_id)
          .eq('status', 'in_review'),
        supabase
          .from('ai_suggestions')
          .select('*')
          .eq('org_id', memberData.org_id)
          .eq('status', 'pending'),
      ]);

      if (polData && polData.length > 0) {
        const mapped: PolicyApproval[] = polData.map((p) => ({
          id: p.id,
          code: p.code,
          title: p.title,
          category: p.category,
          submittedBy: (p.owner as { full_name: string } | null)?.full_name ?? 'Unknown',
          submittedAt: new Date(p.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          changeSummary: (p.current_version as { change_summary: string } | null)?.change_summary ?? 'No change summary',
          contentPreview: (p.current_version as { content_html: string } | null)?.content_html?.replace(/<[^>]+>/g, ' ').slice(0, 300) ?? '',
          status: 'pending',
        }));
        setPolicies(mapped);
      }

      if (sugData && sugData.length > 0) {
        const mapped: SuggestionApproval[] = sugData.map((s) => ({
          id: s.id,
          agent: s.agent as AgentName,
          entityType: s.entity_type,
          entityCode: s.entity_id ?? 'Unknown',
          title: s.title,
          description: s.description,
          suggestedText: (s.suggested_changes as Record<string, string> | null)?.text,
          confidence: s.confidence ?? 0.8,
          createdAt: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: 'pending',
        }));
        setSuggestions(mapped);
      }
    } catch { /* use seed */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Policy actions ────────────────────────────────────────────────────────────

  async function approvePolicy(pol: PolicyApproval) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('policies').update({ status: 'approved' }).eq('id', pol.id);
      await supabase.from('audit_log').insert({
        action: 'policy.approve',
        entity_type: 'policy',
        entity_id: pol.id,
        metadata: { code: pol.code, approved_by: user?.id },
      });
    } catch { /* seed mode */ }
    setPolicies((prev) => prev.filter((p) => p.id !== pol.id));
    setPolicyExpand((prev) => { const n = { ...prev }; delete n[pol.id]; return n; });
    showToast(`✓ ${pol.code} approved and set to Approved status`);
  }

  async function rejectPolicy(pol: PolicyApproval) {
    const notes = policyNotes[pol.id] ?? '';
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('policies').update({ status: 'draft' }).eq('id', pol.id);
      await supabase.from('audit_log').insert({
        action: 'policy.reject',
        entity_type: 'policy',
        entity_id: pol.id,
        metadata: { code: pol.code, rejected_by: user?.id, reason: notes },
      });
    } catch { /* seed mode */ }
    setPolicies((prev) => prev.filter((p) => p.id !== pol.id));
    setPolicyExpand((prev) => { const n = { ...prev }; delete n[pol.id]; return n; });
    showToast(`${pol.code} rejected and returned to Draft`);
  }

  function requestChanges(pol: PolicyApproval) {
    setPolicies((prev) => prev.filter((p) => p.id !== pol.id));
    setPolicyExpand((prev) => { const n = { ...prev }; delete n[pol.id]; return n; });
    showToast(`Change request sent to ${pol.submittedBy}`);
  }

  // ── Suggestion actions ────────────────────────────────────────────────────────

  async function acceptSuggestion(sug: SuggestionApproval, finalText?: string) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('ai_suggestions').update({
        status: finalText ? 'modified' : 'accepted',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_notes: finalText ? `Accepted with modification: ${finalText}` : undefined,
      }).eq('id', sug.id);
      await supabase.from('audit_log').insert({
        action: finalText ? 'suggestion.accept_modified' : 'suggestion.accept',
        entity_type: 'ai_suggestion',
        entity_id: sug.id,
        metadata: { title: sug.title, agent: sug.agent },
      });
    } catch { /* seed mode */ }
    setSuggestions((prev) => prev.filter((s) => s.id !== sug.id));
    setSuggestionExpand((prev) => { const n = { ...prev }; delete n[sug.id]; return n; });
    showToast(`✓ Suggestion accepted${finalText ? ' with modifications' : ''}`);
  }

  async function rejectSuggestion(sug: SuggestionApproval) {
    const notes = suggestionNotes[sug.id] ?? '';
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('ai_suggestions').update({
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || undefined,
      }).eq('id', sug.id);
    } catch { /* seed mode */ }
    setSuggestions((prev) => prev.filter((s) => s.id !== sug.id));
    setSuggestionExpand((prev) => { const n = { ...prev }; delete n[sug.id]; return n; });
    showToast('Suggestion rejected');
  }

  // ── Totals ─────────────────────────────────────────────────────────────────────

  const totalPending = policies.length + suggestions.length;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px', maxWidth: '860px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', background: 'var(--g900, #171717)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', margin: 0 }}>
              Pending Approvals
            </h1>
            {totalPending > 0 && (
              <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: 'var(--rust-light, #FDF0EB)', color: 'var(--rust, #C05A2C)' }}>
                {totalPending}
              </span>
            )}
          </div>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', margin: 0 }}>
            Review policy changes and AI-generated suggestions before they take effect
          </p>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--g400, #A3A3A3)', fontSize: '14px' }}>Loading…</p>
      ) : totalPending === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px' }}>
          <p style={{ fontSize: '32px', margin: '0 0 8px' }}>✓</p>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--green, #16A34A)', margin: '0 0 4px' }}>All caught up!</p>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', margin: 0 }}>No pending approvals at this time.</p>
        </div>
      ) : (
        <>
          {/* ── Policy Approvals ──────────────────────────────────────────────── */}
          {policies.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--g800, #262626)', margin: 0 }}>
                  Policy Approvals
                </h2>
                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: 'var(--g100, #F5F5F5)', color: 'var(--g600, #525252)' }}>
                  {policies.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {policies.map((pol) => {
                  const cat = CAT_COLORS[pol.category] ?? { bg: '#F5F5F5', color: '#525252' };
                  const expand = policyExpand[pol.id] ?? null;

                  return (
                    <div
                      key={pol.id}
                      style={{
                        background: '#fff',
                        border: '1px solid var(--g200, #E8E8E8)',
                        borderLeft: '4px solid var(--blue, #3BA7C9)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                      }}
                    >
                      <div style={{ padding: '18px 20px' }}>
                        {/* Top row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>{pol.code}</span>
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: cat.bg, color: cat.color }}>
                              {pol.category}
                            </span>
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: 'var(--blue-light, #E8F6FA)', color: 'var(--blue-dark, #2A8BA8)' }}>
                              Policy Review
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>Submitted {pol.submittedAt}</span>
                        </div>

                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 6px' }}>
                          {pol.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--g600, #525252)', margin: '0 0 2px' }}>
                          <strong style={{ color: 'var(--g700, #404040)' }}>Change summary:</strong> {pol.changeSummary}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>
                          Submitted by {pol.submittedBy}
                        </p>

                        {/* Expanded: View Changes */}
                        {expand === 'view_changes' && (
                          <div style={{ marginTop: '14px', padding: '14px', background: 'var(--g50, #FAFAFA)', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '6px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 8px' }}>
                              Latest Version Content Preview
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', lineHeight: '1.65', margin: 0 }}>
                              {pol.contentPreview}
                            </p>
                          </div>
                        )}

                        {/* Expanded: Reject */}
                        {expand === 'reject' && (
                          <div style={{ marginTop: '14px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                              Rejection reason (will be sent to submitter)
                            </label>
                            <textarea
                              value={policyNotes[pol.id] ?? ''}
                              onChange={(e) => setPolicyNotes((prev) => ({ ...prev, [pol.id]: e.target.value }))}
                              rows={3}
                              placeholder="Explain what needs to be changed before resubmitting…"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button onClick={() => setPolicyExpand((p) => ({ ...p, [pol.id]: null }))} style={{ padding: '6px 14px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                Cancel
                              </button>
                              <button onClick={() => rejectPolicy(pol)} style={{ padding: '6px 16px', background: 'var(--red, #DC2626)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                Confirm Rejection
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Expanded: Request Changes */}
                        {expand === 'request_changes' && (
                          <div style={{ marginTop: '14px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                              Requested changes (will be sent to submitter, policy stays In Review)
                            </label>
                            <textarea
                              value={policyNotes[pol.id] ?? ''}
                              onChange={(e) => setPolicyNotes((prev) => ({ ...prev, [pol.id]: e.target.value }))}
                              rows={3}
                              placeholder="Describe what revisions are needed before approval…"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button onClick={() => setPolicyExpand((p) => ({ ...p, [pol.id]: null }))} style={{ padding: '6px 14px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                Cancel
                              </button>
                              <button onClick={() => requestChanges(pol)} style={{ padding: '6px 16px', background: 'var(--yellow, #D97706)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                Send Change Request
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        {!expand && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setPolicyExpand((p) => ({ ...p, [pol.id]: p[pol.id] === 'view_changes' ? null : 'view_changes' }))}
                              style={{ padding: '7px 14px', background: 'var(--blue-bg, #F0F9FC)', color: 'var(--blue-dark, #2A8BA8)', border: '1px solid var(--blue-light, #E8F6FA)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                            >
                              View Changes
                            </button>
                            <button
                              onClick={() => setPolicyExpand((p) => ({ ...p, [pol.id]: 'request_changes' }))}
                              style={{ padding: '7px 14px', background: 'var(--yellow-light, #FFFBEB)', color: 'var(--yellow, #D97706)', border: '1px solid #FDE68A', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                            >
                              Request Changes
                            </button>
                            <button
                              onClick={() => setPolicyExpand((p) => ({ ...p, [pol.id]: 'reject' }))}
                              style={{ padding: '7px 14px', background: 'var(--red-light, #FEF2F2)', color: 'var(--red, #DC2626)', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => approvePolicy(pol)}
                              style={{ padding: '7px 16px', background: 'var(--green, #16A34A)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                          </div>
                        )}

                        {/* View Changes expand also shows action buttons */}
                        {expand === 'view_changes' && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                            <button onClick={() => setPolicyExpand((p) => ({ ...p, [pol.id]: null }))} style={{ padding: '7px 14px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                              Close Preview
                            </button>
                            <button
                              onClick={() => setPolicyExpand((p) => ({ ...p, [pol.id]: 'request_changes' }))}
                              style={{ padding: '7px 14px', background: 'var(--yellow-light, #FFFBEB)', color: 'var(--yellow, #D97706)', border: '1px solid #FDE68A', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                            >
                              Request Changes
                            </button>
                            <button onClick={() => setPolicyExpand((p) => ({ ...p, [pol.id]: 'reject' }))} style={{ padding: '7px 14px', background: 'var(--red-light, #FEF2F2)', color: 'var(--red, #DC2626)', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                              Reject
                            </button>
                            <button onClick={() => approvePolicy(pol)} style={{ padding: '7px 16px', background: 'var(--green, #16A34A)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                              Approve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── AI Suggestion Approvals ───────────────────────────────────────── */}
          {suggestions.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--g800, #262626)', margin: 0 }}>
                  AI Suggestion Approvals
                </h2>
                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: 'var(--g100, #F5F5F5)', color: 'var(--g600, #525252)' }}>
                  {suggestions.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {suggestions.map((sug) => {
                  const agStyle = AGENT_STYLES[sug.agent] ?? { label: sug.agent, bg: '#F5F5F5', color: '#525252' };
                  const expand = suggestionExpand[sug.id] ?? null;

                  return (
                    <div
                      key={sug.id}
                      style={{
                        background: '#fff',
                        border: '1px solid var(--g200, #E8E8E8)',
                        borderLeft: `4px solid ${agStyle.color}`,
                        borderRadius: '10px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                      }}
                    >
                      <div style={{ padding: '18px 20px' }}>
                        {/* Top row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: agStyle.bg, color: agStyle.color }}>
                              {agStyle.label}
                            </span>
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: 'var(--g100, #F5F5F5)', color: 'var(--g600, #525252)' }}>
                              {sug.entityType}: {sug.entityCode}
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>{sug.createdAt}</span>
                        </div>

                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 8px' }}>
                          {sug.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--g600, #525252)', margin: '0 0 10px', lineHeight: '1.6' }}>
                          {sug.description}
                        </p>

                        {/* Confidence bar */}
                        <div style={{ marginBottom: '10px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--g400, #A3A3A3)', margin: '0 0 4px' }}>
                            AI Confidence
                          </p>
                          <ConfidenceBar value={sug.confidence} />
                        </div>

                        {/* Suggested text preview */}
                        {sug.suggestedText && (
                          <div style={{ background: 'var(--g50, #FAFAFA)', border: '1px solid var(--g200, #E8E8E8)', borderLeft: `3px solid ${agStyle.color}`, borderRadius: '6px', padding: '12px 14px', marginBottom: '12px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: agStyle.color, margin: '0 0 6px' }}>
                              Suggested Change
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: 0, lineHeight: '1.6', fontStyle: 'italic' }}>
                              {sug.suggestedText}
                            </p>
                          </div>
                        )}

                        {/* Expand: Reject with notes */}
                        {expand === 'reject' && (
                          <div style={{ marginTop: '12px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                              Rejection reason (optional)
                            </label>
                            <textarea
                              value={suggestionNotes[sug.id] ?? ''}
                              onChange={(e) => setSuggestionNotes((prev) => ({ ...prev, [sug.id]: e.target.value }))}
                              rows={2}
                              placeholder="Reason for rejecting this suggestion…"
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button onClick={() => setSuggestionExpand((p) => ({ ...p, [sug.id]: null }))} style={{ padding: '6px 14px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                Cancel
                              </button>
                              <button onClick={() => rejectSuggestion(sug)} style={{ padding: '6px 16px', background: 'var(--red, #DC2626)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                Confirm Rejection
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Expand: Modify & Accept */}
                        {expand === 'modify' && (
                          <div style={{ marginTop: '12px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                              Edit suggestion before accepting
                            </label>
                            <textarea
                              value={modifyText[sug.id] ?? sug.suggestedText ?? sug.description}
                              onChange={(e) => setModifyText((prev) => ({ ...prev, [sug.id]: e.target.value }))}
                              rows={4}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button onClick={() => setSuggestionExpand((p) => ({ ...p, [sug.id]: null }))} style={{ padding: '6px 14px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                Cancel
                              </button>
                              <button onClick={() => acceptSuggestion(sug, modifyText[sug.id])} style={{ padding: '6px 16px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                Accept with Modifications
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        {!expand && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                            <button onClick={() => setSuggestionExpand((p) => ({ ...p, [sug.id]: 'reject' }))} style={{ padding: '7px 14px', background: 'var(--red-light, #FEF2F2)', color: 'var(--red, #DC2626)', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                              Reject
                            </button>
                            {sug.suggestedText && (
                              <button onClick={() => setSuggestionExpand((p) => ({ ...p, [sug.id]: 'modify' }))} style={{ padding: '7px 14px', background: 'var(--blue-bg, #F0F9FC)', color: 'var(--blue-dark, #2A8BA8)', border: '1px solid var(--blue-light, #E8F6FA)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                Modify &amp; Accept
                              </button>
                            )}
                            <button onClick={() => acceptSuggestion(sug)} style={{ padding: '7px 16px', background: 'var(--green, #16A34A)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                              Accept
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
