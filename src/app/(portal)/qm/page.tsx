'use client';

import { useState } from 'react';
import { QMTabs } from '@/components/qm/qm-tabs';
import { MeetingChecklist } from '@/components/qm/meeting-checklist';
import { ExecutiveSummary } from '@/components/qm/executive-summary';
import { FindingsGrid } from '@/components/qm/findings-grid';
import { CAPAList } from '@/components/qm/capa-list';

const PERIODS = ['February 2026', 'January 2026', 'December 2025'];

const TABS = [
  { label: 'Meeting Checklist' },
  { label: 'Executive Summary' },
  { label: 'Findings', badge: 4 },
  { label: 'CAPAs', badge: 3 },
];

export default function QMPage() {
  const [period, setPeriod] = useState('February 2026');
  const [activeTab, setActiveTab] = useState(0);
  const [meetingComplete, setMeetingComplete] = useState(false);

  return (
    <div style={{ padding: '32px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 4px' }}>
            QM Workbench
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', margin: 0 }}>
            Monthly quality management meeting hub — packet, findings, and CAPAs
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '7px 12px',
              border: '1px solid var(--g300, #D4D4D4)',
              borderRadius: '6px',
              fontSize: '13px',
              background: '#fff',
              color: 'var(--g800, #262626)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Meeting status badge */}
          <span style={{
            padding: '5px 12px',
            background: meetingComplete ? 'var(--green-light, #F0FDF4)' : 'var(--yellow-light, #FFFBEB)',
            color: meetingComplete ? 'var(--green, #16A34A)' : 'var(--yellow, #D97706)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {meetingComplete ? '✓ Meeting Complete' : 'Meeting Pending'}
          </span>
        </div>
      </div>

      {/* QM meeting meta */}
      <div style={{
        display: 'flex',
        gap: '20px',
        padding: '14px 20px',
        background: '#fff',
        border: '1px solid var(--g200, #E8E8E8)',
        borderRadius: '10px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {[
          { label: 'Meeting Date', value: 'Feb 28, 2026' },
          { label: 'Scheduled Time', value: '2:00 PM MST' },
          { label: 'Location', value: 'Conference Room A' },
          { label: 'Attendees', value: 'Wayne G., Sarah C., James W.' },
          { label: 'Period', value: period },
        ].map(({ label, value }) => (
          <div key={label}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 2px' }}>
              {label}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g800, #262626)', margin: 0 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <QMTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === 0 && (
        <MeetingChecklist onMarkComplete={() => setMeetingComplete(true)} />
      )}
      {activeTab === 1 && (
        <ExecutiveSummary period={period} />
      )}
      {activeTab === 2 && (
        <FindingsGrid />
      )}
      {activeTab === 3 && (
        <CAPAList showAddButton={true} />
      )}
    </div>
  );
}
