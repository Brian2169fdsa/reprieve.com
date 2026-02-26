'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { CAPAStatus } from '@/lib/types';

const ORG_MEMBERS = ['James Williams', 'Sarah Chen', 'Maria Rodriguez', 'David Kim', 'Wayne Giles'];

interface TimelineEntry {
  date: string;
  action: string;
  by: string;
  color: string;
}

interface CAPADetail {
  id: string;
  code: string;
  title: string;
  description: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  owner: string;
  status: CAPAStatus;
  dueDate: string;
  severity: string;
  standard: string;
  finding: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  timeline: TimelineEntry[];
}

const SEED_CAPAS: Record<string, CAPADetail> = {
  '1': {
    id: '1',
    code: 'CAPA-2026-003',
    title: 'Medication storage temperature logging gaps',
    description: 'Daily temperature logs for medication storage refrigerators were not consistently maintained during January–February 2026, creating a gap in required AHCCCS documentation.',
    rootCause: 'No designated staff member assigned as primary + backup for daily temperature logging. When primary staff is out, logging falls through the cracks.',
    correctiveAction: 'Assign James Williams as primary and Maria Rodriguez as backup for daily temperature logging. Procure digital temperature logging device to automate readings. Implement shared reminder in team calendar.',
    preventiveAction: 'Add temperature logging to onboarding checklist for all clinical staff. Schedule quarterly audits of temperature log completeness. Consider IoT-based automatic logging for Residential facility.',
    owner: 'James Williams',
    status: 'overdue',
    dueDate: '2026-02-20',
    severity: 'critical',
    standard: 'AHCCCS',
    finding: 'Medication Storage Temperature Log — Missing 11 entries Jan–Feb 2026',
    timeline: [
      { date: 'Feb 10, 2026', action: 'CAPA created by Sarah Chen', by: 'Sarah Chen', color: '#3BA7C9' },
      { date: 'Feb 10, 2026', action: 'Assigned to James Williams with Feb 20 due date', by: 'Wayne Giles', color: '#3BA7C9' },
      { date: 'Feb 20, 2026', action: 'Due date passed — no update from owner', by: 'System', color: '#DC2626' },
      { date: 'Feb 21, 2026', action: 'Status changed to Overdue by system', by: 'System', color: '#DC2626' },
    ],
  },
  '2': {
    id: '2',
    code: 'CAPA-2026-004',
    title: 'Telehealth consent form update needed',
    description: 'The current consent form does not include digital/telehealth-specific consent language required by updated HIPAA guidance and the new Telehealth Service Delivery policy (POL-CLN-002).',
    rootCause: 'Policy POL-CLN-002 was drafted without a corresponding update to the consent form template. Policy update and form update should be synchronized but were not tracked as dependent tasks.',
    correctiveAction: 'Revise the standard consent form to include telehealth-specific consent language (recording policy, platform used, right to decline). Route revised form through standard approval workflow.',
    preventiveAction: 'Add "affected forms" checklist item to policy update workflow. During policy review, compliance officer must identify all forms that reference the policy and flag them for simultaneous update.',
    owner: 'Sarah Chen',
    status: 'in_progress',
    dueDate: '2026-03-10',
    severity: 'medium',
    standard: 'HIPAA',
    finding: 'Telehealth ↔ Consent Policy Cross-Reference Gap (Policy Guardian)',
    timeline: [
      { date: 'Feb 24, 2026', action: 'CAPA created from Policy Guardian AI suggestion', by: 'Sarah Chen', color: '#3BA7C9' },
      { date: 'Feb 24, 2026', action: 'Assigned to Sarah Chen with Mar 10 due date', by: 'Wayne Giles', color: '#3BA7C9' },
      { date: 'Feb 25, 2026', action: 'Status updated to In Progress', by: 'Sarah Chen', color: '#D97706' },
    ],
  },
  '3': {
    id: '3',
    code: 'CAPA-2026-005',
    title: 'Fire drill documentation gap',
    description: 'February 10 fire drill at Residential facility was conducted but the documentation is incomplete — attendance signatures missing for 4 staff members, and the drill completion form was not submitted to compliance.',
    rootCause: 'Fire drill was conducted across two shifts but only the day-shift supervisor had the documentation packet. Night-shift staff participation was not captured.',
    correctiveAction: 'Conduct a new documented fire drill with all-shift participation by March 15. Ensure both shifts sign the attendance roster. Submit completed forms to Sarah Chen within 24 hours.',
    preventiveAction: 'Create a drill coordination checklist that requires supervisor sign-off confirming all shifts have been accounted for. Store drill forms digitally in Supabase Storage immediately after completion.',
    owner: 'Maria Rodriguez',
    status: 'open',
    dueDate: '2026-03-15',
    severity: 'high',
    standard: 'Safety',
    finding: 'Fire Drill Not Conducted — SAFE-FD-001 Feb 2026',
    timeline: [
      { date: 'Feb 25, 2026', action: 'CAPA created from QM Finding', by: 'Wayne Giles', color: '#3BA7C9' },
      { date: 'Feb 25, 2026', action: 'Assigned to Maria Rodriguez with Mar 15 due date', by: 'Wayne Giles', color: '#3BA7C9' },
    ],
  },
};

const STATUS_FLOW: CAPAStatus[] = ['open', 'in_progress', 'pending_verification', 'closed'];
const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending_verification: 'Pending Verification',
  closed: 'Closed',
  overdue: 'Overdue',
};
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  open:                 { bg: '#EFF6FF',  color: '#1D4ED8' },
  in_progress:          { bg: '#FFFBEB',  color: '#B45309' },
  pending_verification: { bg: '#F5F3FF',  color: '#6D28D9' },
  closed:               { bg: '#F0FDF4',  color: '#15803D' },
  overdue:              { bg: '#FEF2F2',  color: '#DC2626' },
};
const SEV_STYLES: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#FEF2F2', color: '#DC2626' },
  high:     { bg: '#FDF0EB', color: '#C05A2C' },
  medium:   { bg: '#FFFBEB', color: '#B45309' },
  low:      { bg: '#F0FDF4', color: '#16A34A' },
};

export default function CAPADetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const seed = SEED_CAPAS[id] ?? SEED_CAPAS['1'];

  const [capa, setCapa] = useState<CAPADetail>(seed);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState(capa.title);
  const [editDesc, setEditDesc] = useState(capa.description);
  const [editRootCause, setEditRootCause] = useState(capa.rootCause);
  const [editCorrective, setEditCorrective] = useState(capa.correctiveAction);
  const [editPreventive, setEditPreventive] = useState(capa.preventiveAction);
  const [editOwner, setEditOwner] = useState(capa.owner);
  const [editDue, setEditDue] = useState(capa.dueDate);

  // Verification state
  const [verifyNotes, setVerifyNotes] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('capas').update({
        title: editTitle,
        description: editDesc,
        root_cause: editRootCause,
        corrective_action: editCorrective,
        preventive_action: editPreventive,
        due_date: editDue,
      }).eq('id', capa.id);
    } catch { /* seed mode */ }

    setCapa((prev) => ({
      ...prev,
      title: editTitle,
      description: editDesc,
      rootCause: editRootCause,
      correctiveAction: editCorrective,
      preventiveAction: editPreventive,
      owner: editOwner,
      dueDate: editDue,
    }));
    setSaved(true);
    setIsEditing(false);
    setIsSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  function advanceStatus() {
    const current = STATUS_FLOW.indexOf(capa.status as typeof STATUS_FLOW[number]);
    if (current === -1 || current === STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[current + 1];
    setCapa((prev) => ({
      ...prev,
      status: next,
      timeline: [...prev.timeline, {
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        action: `Status advanced to ${STATUS_LABELS[next]}`,
        by: editOwner,
        color: STATUS_STYLES[next]?.color ?? '#3BA7C9',
      }],
    }));
    showToast(`Status updated to ${STATUS_LABELS[next]}`);
  }

  function handleVerifyAndClose() {
    if (!verifyNotes.trim()) { showToast('Please enter verification notes before closing.'); return; }
    setCapa((prev) => ({
      ...prev,
      status: 'closed',
      verifiedBy: 'Wayne Giles',
      verifiedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      verificationNotes: verifyNotes,
      timeline: [...prev.timeline, {
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        action: `CAPA verified and closed. Notes: ${verifyNotes}`,
        by: 'Wayne Giles',
        color: '#16A34A',
      }],
    }));
    showToast('CAPA verified and closed.');
    setVerifyNotes('');
  }

  const ss = STATUS_STYLES[capa.status];
  const sv = SEV_STYLES[capa.severity] ?? { bg: '#F5F5F5', color: '#525252' };
  const currentStatusIdx = STATUS_FLOW.indexOf(capa.status as typeof STATUS_FLOW[number]);
  const nextStatus = currentStatusIdx >= 0 && currentStatusIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStatusIdx + 1] : null;

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', background: 'var(--g900, #171717)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--g500, #737373)', marginBottom: '20px' }}>
        <Link href="/capa" style={{ color: 'var(--blue, #3BA7C9)', textDecoration: 'none', fontWeight: 500 }}>CAPAs</Link>
        <span>/</span>
        <span style={{ color: 'var(--g700, #404040)' }}>{capa.code}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{ width: '100%', fontSize: '22px', fontFamily: 'var(--font-source-serif-4, serif)', fontWeight: 600, border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', padding: '4px 8px', color: 'var(--g900, #171717)', boxSizing: 'border-box' }}
            />
          ) : (
            <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '22px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 6px' }}>
              {capa.title}
            </h1>
          )}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>{capa.code}</span>
            <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color }}>{STATUS_LABELS[capa.status]}</span>
            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: sv.bg, color: sv.color, textTransform: 'capitalize' }}>{capa.severity}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} style={{ padding: '7px 14px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--g600, #525252)' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} style={{ padding: '7px 16px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: isSaving ? 'wait' : 'pointer' }}>
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ padding: '7px 16px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: 'var(--g700, #404040)' }}>
              Edit
            </button>
          )}
          {saved && <span style={{ padding: '7px 14px', color: 'var(--green, #16A34A)', fontSize: '13px', fontWeight: 600 }}>✓ Saved</span>}
        </div>
      </div>

      {/* Status workflow */}
      {nextStatus && (
        <div style={{ background: 'var(--blue-bg, #F0F9FC)', border: '1px solid var(--blue-light, #E8F6FA)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--blue-dark, #2A8BA8)', margin: 0 }}>
            Ready to advance status from <strong>{STATUS_LABELS[capa.status]}</strong> to <strong>{STATUS_LABELS[nextStatus]}</strong>?
          </p>
          <button
            onClick={advanceStatus}
            style={{ padding: '7px 16px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Advance to {STATUS_LABELS[nextStatus]}
          </button>
        </div>
      )}

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Detail card */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>Description</h2>
            {isEditing ? (
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.65', margin: 0 }}>{capa.description}</p>
            )}

            <div style={{ borderTop: '1px solid var(--g100, #F5F5F5)', paddingTop: '16px', marginTop: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 4px' }}>Linked Finding</p>
              <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: 0 }}>{capa.finding}</p>
            </div>
          </div>

          {/* Root cause */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Root Cause Analysis</h2>
            {isEditing ? (
              <textarea value={editRootCause} onChange={(e) => setEditRootCause(e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.65', margin: 0 }}>{capa.rootCause}</p>
            )}
          </div>

          {/* Corrective action */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Corrective Action</h2>
            {isEditing ? (
              <textarea value={editCorrective} onChange={(e) => setEditCorrective(e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.65', margin: 0 }}>{capa.correctiveAction}</p>
            )}
          </div>

          {/* Preventive action */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Preventive Action</h2>
            {isEditing ? (
              <textarea value={editPreventive} onChange={(e) => setEditPreventive(e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.65', margin: 0 }}>{capa.preventiveAction}</p>
            )}
          </div>

          {/* Verification section */}
          {capa.status === 'pending_verification' && (
            <div style={{ background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '10px', padding: '20px 24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                Verification
              </h2>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>Verification Notes</label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe how you verified the corrective and preventive actions were completed…"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={handleVerifyAndClose}
                style={{ padding: '8px 20px', background: 'var(--green, #16A34A)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Verify &amp; Close CAPA
              </button>
            </div>
          )}

          {capa.status === 'closed' && capa.verificationNotes && (
            <div style={{ background: 'var(--green-light, #F0FDF4)', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '20px 24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--green, #16A34A)', margin: '0 0 10px' }}>✓ CAPA Closed &amp; Verified</h2>
              <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: '0 0 6px' }}><strong>Verified by:</strong> {capa.verifiedBy} on {capa.verifiedAt}</p>
              <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: 0 }}><strong>Notes:</strong> {capa.verificationNotes}</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Details panel */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '18px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g500, #737373)', margin: '0 0 14px' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--g400, #A3A3A3)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 3px' }}>Owner</p>
                {isEditing ? (
                  <select value={editOwner} onChange={(e) => setEditOwner(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '5px', fontSize: '13px', background: '#fff' }}>
                    {ORG_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g800, #262626)', margin: 0 }}>{capa.owner}</p>
                )}
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--g400, #A3A3A3)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 3px' }}>Due Date</p>
                {isEditing ? (
                  <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '5px', fontSize: '13px', boxSizing: 'border-box' }} />
                ) : (
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g800, #262626)', margin: 0 }}>{capa.dueDate}</p>
                )}
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--g400, #A3A3A3)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 3px' }}>Standard</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g800, #262626)', margin: 0 }}>{capa.standard}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--g400, #A3A3A3)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>Status</p>
                <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color }}>
                  {STATUS_LABELS[capa.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '18px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g500, #737373)', margin: '0 0 14px' }}>Activity Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {capa.timeline.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', paddingBottom: i < capa.timeline.length - 1 ? '12px' : '0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, marginTop: '4px', flexShrink: 0 }} />
                    {i < capa.timeline.length - 1 && (
                      <div style={{ width: '1px', flex: 1, background: 'var(--g200, #E8E8E8)', marginTop: '4px' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: '4px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--g700, #404040)', margin: '0 0 2px', lineHeight: '1.4' }}>{entry.action}</p>
                    <p style={{ fontSize: '11px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>{entry.date} · {entry.by}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
