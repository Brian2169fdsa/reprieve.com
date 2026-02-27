'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  useDroppable, useDraggable,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import type { CAPAStatus, OrgRole } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CAPARow {
  id: string;
  code: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  owner_id: string | null;
  owner: string;
  status: CAPAStatus;
  due_date_raw: string;
  dueDate: string;
  daysOpen: number;
  standard?: string;
  org_id: string;
}

interface OrgMemberOption {
  user_id: string;
  full_name: string;
}

type SortKey = 'due_date_raw' | 'severity' | 'status' | 'daysOpen';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'board';

const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const STATUS_ORDER: Record<string, number> = { overdue: 5, open: 4, in_progress: 3, pending_verification: 2, closed: 1 };

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  open:                 { bg: '#EFF6FF',  color: '#1D4ED8', label: 'Open' },
  in_progress:          { bg: '#FFFBEB',  color: '#B45309', label: 'In Progress' },
  pending_verification: { bg: '#F5F3FF',  color: '#6D28D9', label: 'Pending Verification' },
  closed:               { bg: '#F0FDF4',  color: '#15803D', label: 'Closed' },
  overdue:              { bg: '#FEF2F2',  color: '#DC2626', label: 'Overdue' },
};
const SEV_STYLES: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#FEF2F2', color: '#DC2626' },
  high:     { bg: '#FDF0EB', color: '#C05A2C' },
  medium:   { bg: '#FFFBEB', color: '#B45309' },
  low:      { bg: '#F0FDF4', color: '#16A34A' },
};
const STD_COLORS: Record<string, { bg: string; color: string }> = {
  AHCCCS: { bg: '#F0FDF4', color: '#15803D' },
  HIPAA:  { bg: '#F5F3FF', color: '#6D28D9' },
  Safety: { bg: '#FFFBEB', color: '#B45309' },
  OIG:    { bg: '#EFF6FF', color: '#1D4ED8' },
};

const ALL_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'closed', label: 'Closed' },
  { value: 'overdue', label: 'Overdue' },
];
const ALL_SEVERITIES = ['All Severities', 'Critical', 'High', 'Medium', 'Low'];
const PAGE_SIZE = 20;

const KANBAN_COLUMNS: { id: CAPAStatus; label: string; accent: string }[] = [
  { id: 'open', label: 'Open', accent: '#D97706' },
  { id: 'in_progress', label: 'In Progress', accent: '#3BA7C9' },
  { id: 'pending_verification', label: 'Pending Verification', accent: '#6D28D9' },
  { id: 'closed', label: 'Closed', accent: '#16A34A' },
];

// ── Kanban sub-components ──────────────────────────────────────────────────────

function DroppableColumn({ id, label, accent, count, children }: {
  id: string; label: string; accent: string; count: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minWidth: '220px',
        background: isOver ? '#F0F9FC' : 'var(--g50, #FAFAFA)',
        border: isOver ? '2px dashed var(--blue, #3BA7C9)' : '1px solid var(--g200, #E8E8E8)',
        borderRadius: '10px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'background 0.15s, border 0.15s',
        maxHeight: '75vh',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', paddingBottom: '8px', borderBottom: `2px solid ${accent}` }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--g800, #262626)' }}>{label}</span>
        <span style={{ padding: '1px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: accent + '20', color: accent }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function DraggableCard({ capa }: { capa: CAPARow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: capa.id });
  const sv = SEV_STYLES[capa.severity];
  const isOverdue = capa.status !== 'closed' && capa.due_date_raw && new Date(capa.due_date_raw) < new Date();

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        background: '#fff',
        border: isOverdue ? '1px solid #DC2626' : '1px solid var(--g200, #E8E8E8)',
        borderRadius: '8px',
        padding: '12px',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
        touchAction: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ padding: '1px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: sv.bg, color: sv.color, textTransform: 'capitalize' }}>
          {capa.severity}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--g400, #A3A3A3)', fontFamily: 'monospace' }}>{capa.code}</span>
      </div>
      <Link href={`/capa/${capa.id}`} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g900, #171717)', textDecoration: 'none', lineHeight: '1.4', display: 'block', marginBottom: '8px' }}
        onClick={(e) => e.stopPropagation()}>
        {capa.title}
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--g500, #737373)' }}>
        <span>{capa.owner}</span>
        <span style={{ color: isOverdue ? '#DC2626' : undefined, fontWeight: isOverdue ? 600 : 400 }}>
          {isOverdue && '⚠ '}{capa.dueDate}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--g400, #A3A3A3)', marginTop: '4px' }}>{capa.daysOpen}d open</div>
    </div>
  );
}

function CardOverlay({ capa }: { capa: CAPARow }) {
  const sv = SEV_STYLES[capa.severity];
  return (
    <div style={{ background: '#fff', border: '1px solid var(--blue, #3BA7C9)', borderRadius: '8px', padding: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.2)', width: '240px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
        <span style={{ padding: '1px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: sv.bg, color: sv.color, textTransform: 'capitalize' }}>{capa.severity}</span>
      </div>
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g900, #171717)', margin: '0 0 4px' }}>{capa.title}</p>
      <p style={{ fontSize: '11px', color: 'var(--g500, #737373)', margin: 0 }}>{capa.owner}</p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function CAPAPage() {
  const [capas, setCapas] = useState<CAPARow[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<OrgRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [ownerFilter, setOwnerFilter] = useState('All Owners');
  const [sortKey, setSortKey] = useState<SortKey>('daysOpen');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // New CAPA modal
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRootCause, setNewRootCause] = useState('');
  const [newSeverity, setNewSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [newOwnerId, setNewOwnerId] = useState('');
  const [newDue, setNewDue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Kanban drag state
  const [activeCapa, setActiveCapa] = useState<CAPARow | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const fetchCapas = useCallback(async (status: string, severity: string, pg: number) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      setCurrentUserId(user.id);

      const { data: memberData } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!memberData?.org_id) { setIsLoading(false); return; }
      setOrgId(memberData.org_id);
      setUserRole(memberData.role as OrgRole);

      let query = supabase
        .from('capas')
        .select('*, owner:profiles!owner_id(full_name), finding:findings(severity, standard)', { count: 'exact' })
        .eq('org_id', memberData.org_id);

      if (status !== 'all') query = query.eq('status', status);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      setTotalCount(count ?? 0);

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: CAPARow[] = data.map((c: any, i: number) => {
          const dueDateRaw = c.due_date ?? '';
          const isOverdue = c.status !== 'closed' && dueDateRaw && new Date(dueDateRaw) < new Date();
          return {
            id: c.id,
            code: `CAPA-${new Date(c.created_at).getFullYear()}-${String(i + 1 + pg * PAGE_SIZE).padStart(3, '0')}`,
            title: c.title ?? '',
            severity: (c.finding?.severity ?? 'medium') as CAPARow['severity'],
            owner_id: c.owner_id,
            owner: c.owner?.full_name ?? 'Unassigned',
            status: isOverdue && c.status !== 'closed' && c.status !== 'pending_verification' ? 'overdue' : c.status as CAPAStatus,
            due_date_raw: dueDateRaw,
            dueDate: dueDateRaw ? new Date(dueDateRaw + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date',
            daysOpen: Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000),
            standard: c.finding?.standard,
            org_id: c.org_id,
          };
        });
        setCapas(mapped);
      }

      // Fetch org members for filters + modal
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
    } catch {
      // show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCapas(statusFilter, severityFilter, page);
  }, [fetchCapas, statusFilter, severityFilter, page]);

  async function handleCreateCapa() {
    if (!newTitle.trim()) { showToast('Title is required'); return; }
    if (!orgId || !currentUserId) return;
    setIsCreating(true);
    try {
      const supabase = createClient();
      const { data: inserted, error } = await supabase
        .from('capas')
        .insert({
          org_id: orgId,
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          root_cause: newRootCause.trim() || null,
          owner_id: newOwnerId || null,
          due_date: newDue || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_log').insert({
        org_id: orgId,
        user_id: currentUserId,
        action: 'capa.create',
        entity_type: 'capa',
        entity_id: inserted.id,
        metadata: { description: `CAPA created: ${newTitle}`, severity: newSeverity },
      });

      showToast('CAPA created');
      setShowModal(false);
      setNewTitle(''); setNewDesc(''); setNewRootCause(''); setNewSeverity('medium'); setNewOwnerId(''); setNewDue('');
      await fetchCapas(statusFilter, severityFilter, page);
    } catch {
      showToast('Failed to create CAPA');
    } finally {
      setIsCreating(false);
    }
  }

  // ── Kanban drag handlers ────────────────────────────────────────────────────

  function onDragStart(event: DragStartEvent) {
    const capa = capas.find((c) => c.id === event.active.id);
    setActiveCapa(capa ?? null);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveCapa(null);
    if (!event.over || !currentUserId || !orgId) return;
    const capaId = event.active.id as string;
    const newStatus = event.over.id as CAPAStatus;
    const capa = capas.find((c) => c.id === capaId);
    if (!capa) return;

    // Map overdue back to the underlying status for comparison
    const currentDbStatus = capa.status === 'overdue' ? 'open' : capa.status;
    if (currentDbStatus === newStatus) return;

    // Optimistic update
    setCapas((prev) => prev.map((c) => c.id === capaId ? { ...c, status: newStatus } : c));

    try {
      const supabase = createClient();
      const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'closed') {
        updates.verified_by = currentUserId;
        updates.verified_at = new Date().toISOString();
      }
      await supabase.from('capas').update(updates).eq('id', capaId);
      await supabase.from('audit_log').insert({
        org_id: orgId,
        user_id: currentUserId,
        action: 'capa.status_change',
        entity_type: 'capa',
        entity_id: capaId,
        metadata: { description: `Status changed to ${STATUS_STYLES[newStatus]?.label ?? newStatus}`, old_status: currentDbStatus, new_status: newStatus },
      });
      showToast(`CAPA moved to ${STATUS_STYLES[newStatus]?.label ?? newStatus}`);
    } catch {
      // Revert
      setCapas((prev) => prev.map((c) => c.id === capaId ? { ...c, status: capa.status } : c));
      showToast('Failed to update status');
    }
  }

  // ── Filtering & sorting ──────────────────────────────────────────────────────

  const afterSevFilter = severityFilter === 'All Severities'
    ? capas
    : capas.filter((c) => c.severity === severityFilter.toLowerCase());

  const afterOwnerFilter = ownerFilter === 'All Owners'
    ? afterSevFilter
    : afterSevFilter.filter((c) => c.owner === ownerFilter);

  const sorted = [...afterOwnerFilter].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'due_date_raw') cmp = (a.due_date_raw || 'zzz').localeCompare(b.due_date_raw || 'zzz');
    else if (sortKey === 'severity') cmp = (SEV_ORDER[a.severity] ?? 0) - (SEV_ORDER[b.severity] ?? 0);
    else if (sortKey === 'status') cmp = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
    else if (sortKey === 'daysOpen') cmp = a.daysOpen - b.daysOpen;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return <span style={{ color: 'var(--g300)' }}> ↕</span>;
    return <span style={{ color: 'var(--blue, #3BA7C9)' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>;
  }

  const owners = ['All Owners', ...Array.from(new Set(capas.map((c) => c.owner)))];
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const counts = {
    open: capas.filter((c) => c.status === 'open').length,
    overdue: capas.filter((c) => c.status === 'overdue').length,
    in_progress: capas.filter((c) => c.status === 'in_progress').length,
  };
  const canCreate = userRole === 'admin' || userRole === 'compliance';

  // Kanban groups — overdue CAPAs go in their original column (open or in_progress)
  function kanbanStatus(capa: CAPARow): CAPAStatus {
    if (capa.status === 'overdue') return 'open';
    return capa.status;
  }

  return (
    <div style={{ padding: '32px' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', background: 'var(--g900, #171717)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

      {/* New CAPA modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '520px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '20px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 20px' }}>New CAPA</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g700, #404040)', marginBottom: '5px' }}>Title <span style={{ color: '#DC2626' }}>*</span></label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Brief description of the corrective action needed"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g700, #404040)', marginBottom: '5px' }}>Description</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} placeholder="Additional context, linked finding, or background…"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g700, #404040)', marginBottom: '5px' }}>Root Cause</label>
                <textarea value={newRootCause} onChange={(e) => setNewRootCause(e.target.value)} rows={2} placeholder="What caused this issue?"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g700, #404040)', marginBottom: '5px' }}>Severity</label>
                  <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as typeof newSeverity)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', background: '#fff' }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g700, #404040)', marginBottom: '5px' }}>Due Date</label>
                  <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g700, #404040)', marginBottom: '5px' }}>Owner</label>
                <select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', background: '#fff' }}>
                  <option value="">Unassigned</option>
                  {orgMembers.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--g600, #525252)' }}>
                Cancel
              </button>
              <button onClick={handleCreateCapa} disabled={isCreating} style={{ padding: '8px 20px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: isCreating ? 'wait' : 'pointer', opacity: isCreating ? 0.7 : 1 }}>
                {isCreating ? 'Creating…' : 'Create CAPA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 4px' }}>
            Corrective &amp; Preventive Actions
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', margin: 0 }}>Track findings to verified closure</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', overflow: 'hidden' }}>
            {(['table', 'board'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 14px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  background: viewMode === mode ? 'var(--blue, #3BA7C9)' : '#fff',
                  color: viewMode === mode ? '#fff' : 'var(--g600, #525252)',
                }}
              >
                {mode === 'table' ? 'Table' : 'Board'}
              </button>
            ))}
          </div>
          {canCreate && (
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              + New CAPA
            </button>
          )}
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: totalCount, color: 'var(--g700)', bg: '#fff', border: 'var(--g200, #E8E8E8)' },
          { label: 'Open', value: counts.open, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
          { label: 'In Progress', value: counts.in_progress, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Overdue', value: counts.overdue, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ padding: '10px 18px', background: bg, border: `1px solid ${border}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</span>
            <span style={{ fontSize: '12px', color: 'var(--g500, #737373)' }}>{label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--g400, #A3A3A3)', fontSize: '14px' }}>Loading…</p>
      ) : viewMode === 'board' ? (
        /* ── Kanban Board ──────────────────────────────────────────────── */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {KANBAN_COLUMNS.map((col) => {
              const items = afterOwnerFilter.filter((c) => kanbanStatus(c) === col.id);
              return (
                <DroppableColumn key={col.id} id={col.id} label={col.label} accent={col.accent} count={items.length}>
                  {items.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', textAlign: 'center', padding: '24px 0' }}>No CAPAs</p>
                  ) : (
                    items.map((capa) => <DraggableCard key={capa.id} capa={capa} />)
                  )}
                </DroppableColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeCapa && <CardOverlay capa={activeCapa} />}
          </DragOverlay>
        </DndContext>
      ) : (
        /* ── Table View ────────────────────────────────────────────────── */
        <>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              style={{ padding: '7px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', background: '#fff', cursor: 'pointer', color: 'var(--g800, #262626)' }}>
              {ALL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
              style={{ padding: '7px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', background: '#fff', cursor: 'pointer', color: 'var(--g800, #262626)' }}>
              {ALL_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', background: '#fff', cursor: 'pointer', color: 'var(--g800, #262626)' }}>
              {owners.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {(statusFilter !== 'all' || severityFilter !== 'All Severities' || ownerFilter !== 'All Owners') && (
              <button
                onClick={() => { setStatusFilter('all'); setSeverityFilter('All Severities'); setOwnerFilter('All Owners'); setPage(0); }}
                style={{ padding: '7px 12px', background: 'none', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '6px', fontSize: '13px', color: 'var(--g500, #737373)', cursor: 'pointer' }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--g50, #FAFAFA)', borderBottom: '1px solid var(--g200, #E8E8E8)' }}>
                  {[
                    { label: 'Code', key: null },
                    { label: 'Title', key: null },
                    { label: 'Severity', key: 'severity' as SortKey },
                    { label: 'Owner', key: null },
                    { label: 'Status', key: 'status' as SortKey },
                    { label: 'Due Date', key: 'due_date_raw' as SortKey },
                    { label: 'Days Open', key: 'daysOpen' as SortKey },
                    { label: '', key: null },
                  ].map(({ label, key }) => (
                    <th
                      key={label}
                      onClick={key ? () => toggleSort(key) : undefined}
                      style={{
                        padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--g500, #737373)',
                        textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                        cursor: key ? 'pointer' : 'default', userSelect: 'none',
                      }}
                    >
                      {label}{key && sortIndicator(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', fontSize: '14px', color: 'var(--g400, #A3A3A3)' }}>
                      {capas.length === 0 ? 'No CAPAs yet. Click "+ New CAPA" to create one.' : 'No CAPAs match the current filters.'}
                    </td>
                  </tr>
                ) : (
                  sorted.map((capa, i) => {
                    const ss = STATUS_STYLES[capa.status];
                    const sv = SEV_STYLES[capa.severity];
                    const std = capa.standard ? (STD_COLORS[capa.standard] ?? { bg: '#F5F5F5', color: '#525252' }) : null;
                    const isOverdue = capa.status === 'overdue';
                    return (
                      <tr
                        key={capa.id}
                        style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--g50, #FAFAFA)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--g500, #737373)', whiteSpace: 'nowrap' }}>{capa.code}</td>
                        <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g900, #171717)', margin: 0 }}>{capa.title}</p>
                          {std && (
                            <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '11px', background: std.bg, color: std.color, marginTop: '3px', display: 'inline-block' }}>
                              {capa.standard}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: sv.bg, color: sv.color, textTransform: 'capitalize' }}>
                            {capa.severity}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--g600, #525252)', whiteSpace: 'nowrap' }}>{capa.owner}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                            {ss.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: isOverdue ? 600 : 400, color: isOverdue ? '#DC2626' : 'var(--g600, #525252)', whiteSpace: 'nowrap' }}>
                          {isOverdue && <span style={{ marginRight: '4px' }}>⚠</span>}
                          {capa.dueDate}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--g500, #737373)' }}>{capa.daysOpen}d</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/capa/${capa.id}`}
                            style={{ padding: '5px 14px', background: 'var(--blue-bg, #F0F9FC)', color: 'var(--blue-dark, #2A8BA8)', border: '1px solid var(--blue-light, #E8F6FA)', borderRadius: '5px', fontSize: '12px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--g600, #525252)' }}>
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{ padding: '6px 14px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1, fontSize: '13px' }}
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    style={{ padding: '6px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', background: i === page ? 'var(--blue, #3BA7C9)' : '#fff', color: i === page ? '#fff' : 'var(--g700)', cursor: 'pointer', fontSize: '13px', fontWeight: i === page ? 600 : 400 }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{ padding: '6px 14px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1, fontSize: '13px' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
