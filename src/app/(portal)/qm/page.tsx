'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/hooks/use-org';
import { createClient } from '@/lib/supabase/client';
import { QMTabs } from '@/components/qm/qm-tabs';
import { MeetingChecklist } from '@/components/qm/meeting-checklist';
import { ExecutiveSummary } from '@/components/qm/executive-summary';
import { FindingsGrid } from '@/components/qm/findings-grid';
import { CAPAList } from '@/components/qm/capa-list';
import type { QMMeeting } from '@/lib/types';

function currentPeriodValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function generatePeriods(): { label: string; value: string }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { label, value };
  });
}

function formatPeriodLabel(value: string): string {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function QMPage() {
  const { org, isLoading: orgLoading } = useOrg();
  const [periods] = useState(generatePeriods);
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodValue);
  const [meeting, setMeeting] = useState<QMMeeting | null>(null);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [findingsCount, setFindingsCount] = useState(0);
  const [capaCount, setCapaCount] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [creating, setCreating] = useState(false);

  const fetchMeeting = useCallback(async () => {
    if (!org?.id || !selectedPeriod) return;
    setMeetingLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('qm_meetings')
      .select('*')
      .eq('org_id', org.id)
      .eq('period', selectedPeriod)
      .maybeSingle();
    setMeeting(data ?? null);
    setMeetingLoading(false);
  }, [org?.id, selectedPeriod]);

  useEffect(() => { fetchMeeting(); }, [fetchMeeting]);

  // Fetch badge counts when meeting changes (include auto-generated findings from calendar)
  useEffect(() => {
    if (!org?.id || !meeting?.id) {
      setFindingsCount(0);
      setCapaCount(0);
      return;
    }
    const supabase = createClient();

    // Count manual findings
    const manualFindingsPromise = supabase
      .from('findings')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('qm_meeting_id', meeting.id);

    // Count auto-generated findings from failed/overdue checkpoints
    const autoFindingsPromise = supabase
      .from('checkpoints')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('period', selectedPeriod)
      .in('status', ['failed', 'overdue']);

    Promise.all([manualFindingsPromise, autoFindingsPromise]).then(([manual, auto]) => {
      setFindingsCount((manual.count ?? 0) + (auto.count ?? 0));
    });

    supabase
      .from('findings')
      .select('id')
      .eq('org_id', org.id)
      .eq('qm_meeting_id', meeting.id)
      .then(({ data: findings }) => {
        if (!findings?.length) { setCapaCount(0); return; }
        const ids = findings.map((f: { id: string }) => f.id);
        supabase
          .from('capas')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .in('finding_id', ids)
          .then(({ count }) => setCapaCount(count ?? 0));
      });
  }, [org?.id, meeting?.id, selectedPeriod]);

  async function createMeeting() {
    if (!org?.id || !selectedPeriod) return;
    setCreating(true);
    const supabase = createClient();
    const [year, month] = selectedPeriod.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const meetingDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { data } = await supabase
      .from('qm_meetings')
      .insert({
        org_id: org.id,
        period: selectedPeriod,
        meeting_date: meetingDate,
        status: 'draft',
        agenda: [],
        attendees: [],
      })
      .select()
      .single();
    setMeeting(data ?? null);
    setCreating(false);
  }

  const tabs = [
    { label: 'Meeting Checklist' },
    { label: 'Executive Summary' },
    { label: 'Findings', ...(findingsCount > 0 ? { badge: findingsCount } : {}) },
    { label: 'CAPAs', ...(capaCount > 0 ? { badge: capaCount } : {}) },
  ];

  if (orgLoading) {
    return <div style={{ padding: '32px', color: 'var(--g500, #737373)', fontSize: '14px' }}>Loading...</div>;
  }

  const statusBadge = meeting?.status === 'completed'
    ? { bg: 'var(--green-light, #F0FDF4)', color: 'var(--green, #16A34A)', label: '✓ Meeting Complete' }
    : meeting
    ? { bg: 'var(--yellow-light, #FFFBEB)', color: 'var(--yellow, #D97706)', label: 'Meeting Pending' }
    : { bg: 'var(--g100, #F5F5F5)', color: 'var(--g400, #A3A3A3)', label: 'No Meeting' };

  return (
    <div style={{ padding: '32px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', margin: '0 0 4px' }}>
            QM Workbench
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', margin: 0 }}>
            Quality management review and meeting preparation
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedPeriod}
            onChange={(e) => { setSelectedPeriod(e.target.value); setActiveTab(0); }}
            style={{ padding: '7px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '13px', background: '#fff', color: 'var(--g800, #262626)', cursor: 'pointer', fontWeight: 500 }}
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <span style={{ padding: '5px 12px', background: statusBadge.bg, color: statusBadge.color, borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      {meetingLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--g400, #A3A3A3)', fontSize: '14px' }}>
          Loading meeting data...
        </div>
      ) : !meeting ? (
        <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '15px', color: 'var(--g600, #525252)', margin: '0 0 20px' }}>
            No QM meeting found for <strong>{formatPeriodLabel(selectedPeriod)}</strong>.
          </p>
          <button
            onClick={createMeeting}
            disabled={creating}
            style={{ padding: '10px 28px', background: 'var(--blue, #3BA7C9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1 }}
          >
            {creating ? 'Creating...' : '+ Create Meeting'}
          </button>
        </div>
      ) : (
        <>
          {/* Meeting meta bar */}
          <div style={{ display: 'flex', gap: '20px', padding: '14px 20px', background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', marginBottom: '24px', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {[
              {
                label: 'Meeting Date',
                value: meeting.meeting_date
                  ? new Date(meeting.meeting_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—',
              },
              { label: 'Period', value: formatPeriodLabel(meeting.period) },
              { label: 'Status', value: meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1) },
              { label: 'Audit Readiness', value: meeting.audit_readiness_score != null ? `${meeting.audit_readiness_score}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--g400, #A3A3A3)', margin: '0 0 2px' }}>
                  {label}
                </p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--g800, #262626)', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <QMTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab content */}
          {activeTab === 0 && (
            <MeetingChecklist
              meetingId={meeting.id}
              orgId={org?.id}
              agenda={meeting.agenda}
              onMarkComplete={() => setMeeting((m) => m ? { ...m, status: 'completed' } : m)}
            />
          )}
          {activeTab === 1 && (
            <ExecutiveSummary
              meetingId={meeting.id}
              orgId={org?.id}
              period={meeting.period}
              overallScore={meeting.audit_readiness_score}
              executiveSummary={meeting.executive_summary}
            />
          )}
          {activeTab === 2 && (
            <FindingsGrid
              meetingId={meeting.id}
              orgId={org?.id}
              period={meeting.period}
              onFindingCreated={() => setFindingsCount((c) => c + 1)}
            />
          )}
          {activeTab === 3 && (
            <CAPAList
              meetingId={meeting.id}
              orgId={org?.id}
              showAddButton={true}
            />
          )}
        </>
      )}
    </div>
  );
}
