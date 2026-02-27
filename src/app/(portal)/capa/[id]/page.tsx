'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { CAPAStatus, OrgRole } from '@/lib/types';

interface OrgMemberOption {
  user_id: string;
  full_name: string;
}

interface TimelineEntry {
  id: string;
  action: string;
  created_at: string;
  user_name: string;
  color: string;
}

interface CAPADetail {
  id: string;
  title: string;
  description: string;
  root_cause: string;
  corrective_action: string;
  preventive_action: string;
  owner_id: string | null;
  owner_name: string;
  status: CAPAStatus;
  due_date: string;
  severity: string;
  standard: string;
  finding_title: string;
  verified_by_name?: string;
  verified_at?: string;
  verification_notes?: string;
  org_id: string;
  created_at: string;
}

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

  const [capa, setCapa] = useState<CAPADetail | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [userRole, setUserRole] = useState<OrgRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editRootCause, setEditRootCause] = useState('');
  const [editCorrective, setEditCorrective] = useState('');
  const [editPreventive, setEditPreventive] = useState('');
  const [editOwnerId, setEditOwnerId] = useState('');
  const [editDue, setEditDue] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }
    setCurrentUserId(user.id);

    const { data: memberData } = await supabase
      .from('org_members')
      .select('org_id, role, profile:profiles!user_id(full_name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!memberData) { setIsLoading(false); return; }
    setUserRole(memberData.role as OrgRole);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCurrentUserName((memberData as any).profile?.full_name ?? 'Unknown');

    const { data: capaData, error: capaError } = await supabase
      .from('capas')
      .select(`
        *,
        owner:profiles!owner_id(id, full_name),
        finding:findings(title, severity, standard),
        verifier:profiles!verified_by(full_name)
      `)
      .eq('id', id)
      .eq('org_id', memberData.org_id)
      .single();

    if (capaError || !capaData) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = capaData as any;
    const detail: CAPADetail = {
      id: d.id,
      title: d.title ?? '',
      description: d.description ?? '',
      root_cause: d.root_cause ?? '',
      corrective_action: d.corrective_action ?? '',
      preventive_action: d.preventive_action ?? '',
      owner_id: d.owner_id ?? null,
      owner_name: d.owner?.full_name ?? 'Unassigned',
      status: d.status as CAPAStatus,
      due_date: d.due_date ?? '',
      severity: d.finding?.severity ?? 'medium',
      standard: d.finding?.standard ?? '',
      finding_title: d.finding?.title ?? '',
      verified_by_name: d.verifier?.full_name,
      verified_at: d.verified_at,
      verification_notes: d.verification_notes,
      org_id: d.org_id,
      created_at: d.created_at,
    };
    setCapa(detail);
    setEditTitle(detail.title);
    setEditDesc(detail.description);
    setEditRootCause(detail.root_cause);
    setEditCorrective(detail.corrective_action);
    setEditPreventive(detail.preventive_action);
    setEditOwnerId(detail.owner_id ?? '');
    setEditDue(detail.due_date ? detail.due_date.split('T')[0] : '');

    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, profile:profiles!user_id(full_name)')
      .eq('org_id', memberData.org_id)
      .eq('is_active', true);

    if (members) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOrgMembers(members.map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profile?.full_name ?? 'Unknown',
      })));
    }

    const { data: auditData } = await supabase
      .from('audit_log')
      .select('id, action, metadata, created_at, user:profiles!user_id(full_name)')
      .eq('entity_type', 'capa')
      .eq('entity_id', id)
      .order('created_at', { ascending: true });

    if (auditData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries: TimelineEntry[] = auditData.map((entry: any) => {
        let color = '#3BA7C9';
        const meta = entry.metadata ?? {};
        if (entry.action === 'capa.status_change') {
          color = STATUS_STYLES[meta.new_status]?.color ?? '#3BA7C9';
        }
        if (entry.action === 'capa.verify') color = '#16A34A';
        return {
          id: String(entry.id),
          action: meta.description ?? entry.action,
          created_at: entry.created_at,
          user_name: entry.user?.full_name ?? 'System',
          color,
        };
      });
      setTimeline(entries);
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function writeAuditLog(
    supabase: ReturnType<typeof createClient>,
    orgId: string,
    userId: string,
    action: string,
    metadata: Record<string, unknown>
  ) {
    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action,
      entity_type: 'capa',
      entity_id: id,
      metadata,
    });
  }

  async function handleSave() {
    if (!capa || !currentUserId) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('capas')
        .update({
          title: editTitle,
          description: editDesc,
          root_cause: editRootCause,
          corrective_action: editCorrective,
          preventive_action: editPreventive,
          owner_id: editOwnerId || null,
          due_date: editDue || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', capa.org_id);

      if (error) throw error;

      await writeAuditLog(supabase, capa.org_id, currentUserId, 'capa.update', {
        description: `CAPA updated by ${currentUserName}`,
      });

      showToast('Changes saved');
      setIsEditing(false);
      await loadData();
    } catch {
      showToast('Save failed — please try again');
    } finally {
      setIsSaving(false);
    }
  }

  async function advanceStatus() {
    if (!capa || !currentUserId) return;
    const current = STATUS_FLOW.indexOf(capa.status as typeof STATUS_FLOW[number]);
    if (current === -1 || current >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[current + 1];
    setIsAdvancing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('capas')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', capa.org_id);

      if (error) throw error;

      await writeAuditLog(supabase, capa.org_id, currentUserId, 'capa.status_change', {
        description: `Status changed to ${STATUS_LABELS[next]} by ${currentUserName}`,
        old_status: capa.status,
        new_status: next,
      });

      showToast(`Status updated to ${STATUS_LABELS[next]}`);
      await loadData();
    } catch {
      showToast('Failed to update status');
    } finally {
      setIsAdvancing(false);
    }
  }

  async function handleVerifyAndClose() {
    if (!capa || !currentUserId) return;
    if (!verifyNotes.trim()) { showToast('Please enter verification notes before closing.'); return; }
    setIsVerifying(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('capas')
        .update({
          status: 'closed',
          verified_by: currentUserId,
          verified_at: now,
          verification_notes: verifyNotes,
          updated_at: now,
        })
        .eq('id', id)
        .eq('org_id', capa.org_id);

      if (error) throw error;

      await writeAuditLog(supabase, capa.org_id, currentUserId, 'capa.verify', {
        description: `CAPA verified and closed by ${currentUserName}`,
        verification_notes: verifyNotes,
      });

      showToast('CAPA verified and closed.');
      setVerifyNotes('');
      await loadData();
    } catch {
      showToast('Failed to verify CAPA');
    } finally {
      setIsVerifying(false);
    }
  }

  if (isLoading) {
    return <div style={{ padding: '32px', color: 'var(--g400, #A3A3A3)', fontSize: '14px' }}>Loading…</div>;
  }

  if (notFound || !capa) {
    return (
      <div style={{ padding: '32px' }}>
        <Link href="/capa" style={{ color: 'var(--blue, #3BA7C9)', textDecoration: 'none', fontSize: '13px' }}>← Back to CAPAs</Link>
        <p style={{ marginTop: '16px', color: 'var(--g500, #737373)', fontSize: '14px' }}>CAPA not found.</p>
      </div>
    );
  }

  const isOverdue = capa.status !== 'closed' && capa.due_date && new Date(capa.due_date) < new Date();
  const ss = STATUS_STYLES[capa.status] ?? STATUS_STYLES.open;
  const sv = SEV_STYLES[capa.severity] ?? { bg: '#F5F5F5', color: '#525252' };
  const currentStatusIdx = STATUS_FLOW.indexOf(capa.status as typeof STATUS_FLOW[number]);
  const nextStatus = currentStatusIdx >= 0 && currentStatusIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStatusIdx + 1] : null;
  const dueDateDisplay = capa.due_date
    ? new Date(capa.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No due date';
  const capaCode = `CAPA-${new Date(capa.created_at).getFullYear()}-${capa.id.slice(0, 6).toUpperCase()}`;

  const canEdit = userRole === 'admin' || userRole === 'compliance';
  const canVerify = userRole === 'admin' || userRole === 'compliance' || userRole === 'supervisor';

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
        <span style={{ color: 'var(--g700, #404040)', fontFamily: 'monospace', fontSize: '12px' }}>{capaCode}</span>
      </div>

      {/* Overdue warning */}
      {isOverdue && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#DC2626', fontWeight: 500 }}>
          ⚠ This CAPA is overdue. Due date was {dueDateDisplay}.
        </div>
      )}

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
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--g400, #A3A3A3)' }}>{capaCode}</span>
            <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color }}>{STATUS_LABELS[capa.status]}</span>
            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: sv.bg, color: sv.color, textTransform: 'capitalize' }}>{capa.severity}</span>
          </div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} style={{ padding: '7px 14px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--g600, #525252)' }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={isSaving} style={{ padding: '7px 16px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} style={{ padding: '7px 16px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: 'var(--g700, #404040)' }}>
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status advancement */}
      {nextStatus && canEdit && (
        <div style={{ background: 'var(--blue-bg, #F0F9FC)', border: '1px solid var(--blue-light, #E8F6FA)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--blue-dark, #2A8BA8)', margin: 0 }}>
            Ready to advance from <strong>{STATUS_LABELS[capa.status]}</strong> to <strong>{STATUS_LABELS[nextStatus]}</strong>?
          </p>
          <button
            onClick={advanceStatus}
            disabled={isAdvancing}
            style={{ padding: '7px 16px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: isAdvancing ? 'wait' : 'pointer', opacity: isAdvancing ? 0.7 : 1 }}
          >
            {isAdvancing ? 'Updating…' : `Advance to ${STATUS_LABELS[nextStatus]}`}
          </button>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Description */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>Description</h2>
            {isEditing ? (
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.65', margin: 0 }}>{capa.description || <em style={{ color: 'var(--g400)' }}>No description</em>}</p>
            )}
            {capa.finding_title && (
              <div style={{ borderTop: '1px solid var(--g100, #F5F5F5)', paddingTop: '16px', marginTop: '16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 4px' }}>Linked Finding</p>
                <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: 0 }}>{capa.finding_title}</p>
              </div>
            )}
          </div>

          {/* Root cause */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Root Cause Analysis</h2>
            {isEditing ? (
              <textarea value={editRootCause} onChange={(e) => setEditRootCause(e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.65', margin: 0 }}>{capa.root_cause || <em style={{ color: 'var(--g400)' }}>Not yet documented</em>}</p>
            )}
          </div>

          {/* Corrective action */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Corrective Action</h2>
            {isEditing ? (
              <textarea value={editCorrective} onChange={(e) => setEditCorrective(e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.65', margin: 0 }}>{capa.corrective_action || <em style={{ color: 'var(--g400)' }}>Not yet documented</em>}</p>
            )}
          </div>

          {/* Preventive action */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Preventive Action</h2>
            {isEditing ? (
              <textarea value={editPreventive} onChange={(e) => setEditPreventive(e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.65', margin: 0 }}>{capa.preventive_action || <em style={{ color: 'var(--g400)' }}>Not yet documented</em>}</p>
            )}
          </div>

          {/* Verification section */}
          {capa.status === 'pending_verification' && canVerify && (
            <div style={{ background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '10px', padding: '20px 24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--g700, #404040)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Verification</h2>
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
                disabled={isVerifying}
                style={{ padding: '8px 20px', background: 'var(--green, #16A34A)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: isVerifying ? 'wait' : 'pointer', opacity: isVerifying ? 0.7 : 1 }}
              >
                {isVerifying ? 'Verifying…' : 'Verify & Close CAPA'}
              </button>
            </div>
          )}

          {capa.status === 'closed' && capa.verification_notes && (
            <div style={{ background: 'var(--green-light, #F0FDF4)', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '20px 24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--green, #16A34A)', margin: '0 0 10px' }}>✓ CAPA Closed &amp; Verified</h2>
              {capa.verified_by_name && (
                <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: '0 0 6px' }}>
                  <strong>Verified by:</strong> {capa.verified_by_name}{capa.verified_at && ` on ${new Date(capa.verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </p>
              )}
              <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: 0 }}><strong>Notes:</strong> {capa.verification_notes}</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Details */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '18px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g500, #737373)', margin: '0 0 14px' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--g400, #A3A3A3)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 3px' }}>Owner</p>
                {isEditing ? (
                  <select value={editOwnerId} onChange={(e) => setEditOwnerId(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '5px', fontSize: '13px', background: '#fff' }}>
                    <option value="">Unassigned</option>
                    {orgMembers.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
                  </select>
                ) : (
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g800, #262626)', margin: 0 }}>{capa.owner_name}</p>
                )}
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--g400, #A3A3A3)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 3px' }}>Due Date</p>
                {isEditing ? (
                  <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '5px', fontSize: '13px', boxSizing: 'border-box' }} />
                ) : (
                  <p style={{ fontSize: '13px', fontWeight: 500, color: isOverdue ? '#DC2626' : 'var(--g800, #262626)', margin: 0 }}>
                    {isOverdue && '⚠ '}{dueDateDisplay}
                  </p>
                )}
              </div>
              {capa.standard && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--g400, #A3A3A3)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 3px' }}>Standard</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g800, #262626)', margin: 0 }}>{capa.standard}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--g400, #A3A3A3)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>Status</p>
                <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color }}>
                  {STATUS_LABELS[capa.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '18px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g500, #737373)', margin: '0 0 14px' }}>Activity Timeline</h3>
            {timeline.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>No activity recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {timeline.map((entry, i) => (
                  <div key={entry.id} style={{ display: 'flex', gap: '10px', paddingBottom: i < timeline.length - 1 ? '12px' : '0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, marginTop: '4px', flexShrink: 0 }} />
                      {i < timeline.length - 1 && (
                        <div style={{ width: '1px', flex: 1, background: 'var(--g200, #E8E8E8)', marginTop: '4px' }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: '4px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--g700, #404040)', margin: '0 0 2px', lineHeight: '1.4' }}>{entry.action}</p>
                      <p style={{ fontSize: '11px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {entry.user_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
