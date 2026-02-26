'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { MeetingChecklist } from '@/components/qm/meeting-checklist';

const SEED_MEETING = {
  id: '1',
  period: 'February 2026',
  meeting_date: 'February 28, 2026',
  scheduled_time: '2:00 PM MST',
  location: 'Conference Room A',
  status: 'ready',
  audit_readiness_score: 87,
  attendees: ['Wayne Giles', 'Sarah Chen', 'James Williams', 'Maria Rodriguez'],
  executive_summary: 'Compliance performance improved to 87% audit readiness in February 2026. Key findings include incomplete fire drill documentation, a cross-policy conflict in the Telehealth policy, and an overdue CAPA for medication storage. Positive: IOP Chart Audit maintained 100% pass rate for a third consecutive month.',
  action_items: [
    { assignee: 'James Williams', action: 'Close CAPA-2026-003 for medication storage by Mar 5', due: 'Mar 5, 2026' },
    { assignee: 'Maria Rodriguez', action: 'Conduct new fire drill with complete documentation', due: 'Mar 15, 2026' },
    { assignee: 'Sarah Chen', action: 'Resolve Telehealth ↔ Consent policy conflict before approving POL-CLN-002', due: 'Mar 10, 2026' },
    { assignee: 'Wayne Giles', action: 'Accept or reject AI suggestion to add temperature logging control', due: 'Mar 1, 2026' },
  ],
  checklist_complete: 4,
  checklist_total: 8,
};

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const meeting = { ...SEED_MEETING, id };
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          background: 'var(--g900, #171717)',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 1000,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--g500, #737373)', marginBottom: '20px' }}>
        <Link href="/qm" style={{ color: 'var(--blue, #3BA7C9)', textDecoration: 'none', fontWeight: 500 }}>
          QM Workbench
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--g700, #404040)' }}>Meeting #{meeting.id}</span>
      </div>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 4px' }}>
            QM Meeting — {meeting.period}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', margin: 0 }}>
            {meeting.meeting_date} · {meeting.scheduled_time} · {meeting.location}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '5px 12px',
            background: 'var(--green-light, #F0FDF4)',
            color: 'var(--green, #16A34A)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            Ready
          </span>
          <button
            onClick={() => showToast('PDF generation coming in Phase 5')}
            style={{
              padding: '7px 16px',
              background: 'var(--blue, #3BA7C9)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export Meeting Packet
          </button>
        </div>
      </div>

      {/* Meeting info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 6px' }}>Audit Readiness</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green, #16A34A)', margin: '0 0 2px' }}>{meeting.audit_readiness_score}%</p>
          <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>+3% vs. January</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 6px' }}>Checklist</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--blue, #3BA7C9)', margin: '0 0 2px' }}>{meeting.checklist_complete}/{meeting.checklist_total}</p>
          <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>Items reviewed</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 6px' }}>Attendees</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--g800, #262626)', margin: '0 0 2px' }}>{meeting.attendees.length}</p>
          <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>Team members</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 6px' }}>Action Items</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--rust, #C05A2C)', margin: '0 0 2px' }}>{meeting.action_items.length}</p>
          <p style={{ fontSize: '12px', color: 'var(--g400, #A3A3A3)', margin: 0 }}>Assigned for next period</p>
        </div>
      </div>

      {/* Executive Summary */}
      <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g800, #262626)', margin: '0 0 12px' }}>Executive Summary</h2>
        <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', lineHeight: '1.7', margin: 0 }}>
          {meeting.executive_summary}
        </p>
      </div>

      {/* Attendees */}
      <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g800, #262626)', margin: '0 0 12px' }}>Attendees</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {meeting.attendees.map((a) => (
            <span key={a} style={{
              padding: '5px 14px',
              background: 'var(--blue-light, #E8F6FA)',
              color: 'var(--blue-dark, #2A8BA8)',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g800, #262626)', margin: '0 0 16px' }}>Meeting Checklist</h2>
        <MeetingChecklist />
      </div>

      {/* Action items */}
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
            {meeting.action_items.map((item, i) => (
              <tr key={i} style={{ borderBottom: i < meeting.action_items.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none' }}>
                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500, color: 'var(--g800, #262626)', whiteSpace: 'nowrap' }}>{item.assignee}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: 'var(--g700, #404040)' }}>{item.action}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: 'var(--g500, #737373)', whiteSpace: 'nowrap' }}>{item.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
