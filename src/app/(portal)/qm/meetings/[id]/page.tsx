'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MeetingChecklist } from '@/components/qm/meeting-checklist';
import type { QMMeeting, Profile } from '@/lib/types';

interface ActionItem {
  assignee: string;
  action: string;
  due: string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: 'var(--g100, #F5F5F5)',         color: 'var(--g500, #737373)',    label: 'Draft' },
  ready:     { bg: 'var(--green-light, #F0FDF4)',   color: 'var(--green, #16A34A)',   label: 'Ready' },
  completed: { bg: 'var(--blue-light, #E8F6FA)',    color: 'var(--blue-dark, #2A8BA8)', label: 'Completed' },
};

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<QMMeeting | null>(null);
  const [attendees, setAttendees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const fetchMeeting = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('qm_meetings')
      .select('*')
      .eq('id', id)
      .single();

    if (data) {
      setMeeting(data);
      if (data.attendees?.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, created_at')
          .in('id', data.attendees);
        setAttendees(profiles ?? []);
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchMeeting(); }, [fetchMeeting]);

  async function updateStatus(status: string) {
    if (!meeting) return;
    setUpdatingStatus(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('qm_meetings')
      .update({ status })
      .eq('id', meeting.id)
      .select()
      .single();
    if (data) setMeeting(data);
    setUpdatingStatus(false);
    showToast(`Meeting marked as ${status}`);
  }

  if (loading) {
    return <div style={{ padding: '32px', color: 'var(--g500, #737373)', fontSize: '14px' }}>Loading meeting...</div>;
  }

  if (!meeting) {
    return (
      <div style={{ padding: '32px' }}>
        <Link href="/qm" style={{ color: 'var(--blue, #3BA7C9)', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
          ← Back to QM Workbench
        </Link>
        <p style={{ marginTop: '24px', color: 'var(--g500, #737373)', fontSize: '14px' }}>Meeting not found.</p>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[meeting.status] ?? STATUS_STYLES.draft;
  const actionItems = Array.isArray(meeting.action_items)
    ? (meeting.action_items as unknown as ActionItem[])
    : [];

  const checkedItems = Array.isArray(meeting.agenda)
    ? (meeting.agenda as unknown as { checked: boolean }[]).filter((i) => i.checked).length
    : 0;
  const totalItems = Array.isArray(meeting.agenda)
    ? (meeting.agenda as unknown[]).length
    : 0;

  const attendeeNames = attendees.length > 0
    ? attendees.map((a) => a.full_name)
    : (meeting.attendees ?? []);

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', background: 'var(--g900, #171717)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--g500, #737373)', marginBottom: '20px' }}>
        <Link href="/qm" style={{ color: 'var(--blue, #3BA7C9)', textDecoration: 'none', fontWeight: 500 }}>
          QM Workbench
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--g700, #404040)' }}>Meeting — {formatPeriodLabel(meeting.period)}</span>
      </div>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 4px' }}>
            QM Meeting — {formatPeriodLabel(meeting.period)}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', margin: 0 }}>
            {meeting.meeting_date
              ? new Date(meeting.meeting_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              : 'Date not set'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ padding: '5px 12px', background: statusStyle.bg, color: statusStyle.color, borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            {statusStyle.label}
          </span>
          {meeting.status !== 'ready' && (
            <button
              onClick={() => updateStatus('ready')}
              disabled={updatingStatus}
              style={{ padding: '7px 14px', background: '#fff', color: 'var(--g700, #404040)', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: updatingStatus ? 'default' : 'pointer' }}
            >
              Mark Ready
            </button>
          )}
          {meeting.status !== 'completed' && (
            <button
              onClick={() => updateStatus('completed')}
              disabled={updatingStatus}
              style={{ padding: '7px 14px', background: '#fff', color: 'var(--green, #16A34A)', border: '1px solid var(--green-light, #F0FDF4)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: updatingStatus ? 'default' : 'pointer' }}
            >
              Mark Complete
            </button>
          )}
          <button
            onClick={() => showToast('PDF export coming in Phase 5')}
            style={{ padding: '7px 16px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Export Meeting Packet
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 6px' }}>Audit Readiness</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green, #16A34A)', margin: '0 0 2px' }}>
            {meeting.audit_readiness_score != null ? `${meeting.audit_readiness_score}%` : '—'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>Current period</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 6px' }}>Checklist</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--blue, #3BA7C9)', margin: '0 0 2px' }}>
            {totalItems > 0 ? `${checkedItems}/${totalItems}` : '—'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>Items reviewed</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 6px' }}>Attendees</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--g800, #262626)', margin: '0 0 2px' }}>
            {attendeeNames.length}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>Team members</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 6px' }}>Action Items</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--rust, #C05A2C)', margin: '0 0 2px' }}>{actionItems.length}</p>
          <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>Assigned for next period</p>
        </div>
      </div>

      {/* Executive Summary */}
      {meeting.executive_summary && (
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g800, #262626)', margin: '0 0 12px' }}>Executive Summary</h2>
          <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>
            {meeting.executive_summary}
          </p>
        </div>
      )}

      {/* Attendees */}
      {attendeeNames.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g800, #262626)', margin: '0 0 12px' }}>Attendees</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {attendeeNames.map((name, i) => (
              <span key={i} style={{ padding: '5px 14px', background: 'var(--blue-light, #E8F6FA)', color: 'var(--blue-dark, #2A8BA8)', borderRadius: '20px', fontSize: '13px', fontWeight: 500 }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g800, #262626)', margin: '0 0 16px' }}>Meeting Checklist</h2>
        <MeetingChecklist
          meetingId={meeting.id}
          orgId={meeting.org_id}
          agenda={meeting.agenda}
          onMarkComplete={() => setMeeting((m) => m ? { ...m, status: 'completed' } : m)}
        />
      </div>

      {/* Action items */}
      {actionItems.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g800, #262626)', margin: '0 0 12px' }}>Action Items</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--g100, #F5F5F5)' }}>
                {['Assignee', 'Action', 'Due'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--g500, #737373)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actionItems.map((item, i) => (
                <tr key={i} style={{ borderBottom: i < actionItems.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none' }}>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500, color: 'var(--g800, #262626)', whiteSpace: 'nowrap' }}>{item.assignee}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--g700, #404040)' }}>{item.action}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--g500, #737373)', whiteSpace: 'nowrap' }}>{item.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
