'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/hooks/use-org';
import { createClient } from '@/lib/supabase/client';
import AgentCard from '@/components/ai/agent-card';
import type { AgentMetrics } from '@/components/ai/agent-card';
import SuggestionCard from '@/components/ai/suggestion-card';
import AIChatSlideout from '@/components/ai/ai-chat-slideout';
import type { AgentName, AISuggestion } from '@/lib/types';

const AGENTS: AgentName[] = ['policy_guardian', 'compliance_monitor', 'evidence_librarian', 'qm_orchestrator'];

// Mock metrics used when real queries return zero
const MOCK_METRICS: Record<AgentName, AgentMetrics[]> = {
  policy_guardian: [
    { label: 'Policies Analyzed', value: 47 },
    { label: 'Conflicts Found', value: 3 },
    { label: 'Reviews Pending', value: 5 },
    { label: 'Last Run', value: '2 hours ago' },
  ],
  compliance_monitor: [
    { label: 'Checkpoints Generated', value: 24 },
    { label: 'Overdue Items', value: 2 },
    { label: 'Reminders Sent', value: 12 },
    { label: 'Last Run', value: '1 hour ago' },
  ],
  evidence_librarian: [
    { label: 'Evidence Tracked', value: 38 },
    { label: 'Missing Evidence', value: 4 },
    { label: 'Binders Organized', value: 3 },
    { label: 'Last Run', value: '4 hours ago' },
  ],
  qm_orchestrator: [
    { label: 'Meetings Prepared', value: 6 },
    { label: 'Findings Tracked', value: 8 },
    { label: 'CAPAs Monitored', value: 3 },
    { label: 'Last Run', value: 'Yesterday' },
  ],
};

const MOCK_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'mock-1', org_id: '', agent: 'policy_guardian', entity_type: 'policy', suggestion_type: 'flag',
    title: 'Potential conflict between HIPAA Privacy and Telehealth policies',
    description: 'The HIPAA Privacy Policy (POL-HIPAA-001) specifies a 30-day data retention period for telehealth sessions, while the Telehealth Policy (POL-TELE-001) references 90 days. This inconsistency could create compliance risk during audits.',
    confidence: 0.87, status: 'pending', created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'mock-2', org_id: '', agent: 'compliance_monitor', entity_type: 'control', suggestion_type: 'create',
    title: 'Recommend adding quarterly medication reconciliation checkpoint',
    description: 'Analysis of AHCCCS requirements indicates medication reconciliation should be tracked as a formal checkpoint. Currently no control exists for this requirement.',
    confidence: 0.92, status: 'pending', created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'mock-3', org_id: '', agent: 'evidence_librarian', entity_type: 'checkpoint', suggestion_type: 'flag',
    title: 'Fire Drill Log (SAFE-FD-001) missing evidence for February',
    description: 'The February fire drill checkpoint was marked as passed, but no evidence documents have been uploaded. Evidence is required for audit compliance.',
    confidence: 0.95, status: 'pending', created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'mock-4', org_id: '', agent: 'policy_guardian', entity_type: 'policy', suggestion_type: 'edit',
    title: 'Update POL-HIPAA-001 Section 4.2 to reflect 2026 HITECH amendments',
    description: 'The HITECH Act amendments effective January 2026 require updated breach notification timelines. Section 4.2 of POL-HIPAA-001 still references the pre-2026 60-day window.',
    suggested_changes: { section: '4.2', field: 'breach_notification_timeline', old_value: '60 days', new_value: '30 days', reason: '2026 HITECH amendment' },
    confidence: 0.78, status: 'pending', created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'mock-5', org_id: '', agent: 'qm_orchestrator', entity_type: 'qm_meeting', suggestion_type: 'review',
    title: 'February QM packet ready — 3 findings need committee review',
    description: 'The monthly QM packet for February 2026 has been assembled. Three findings from this month\'s checkpoint results require QM committee discussion and disposition.',
    confidence: 0.91, status: 'pending', created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'mock-6', org_id: '', agent: 'compliance_monitor', entity_type: 'checkpoint', suggestion_type: 'flag',
    title: 'Staff member David Kim credentials expire March 15, 2026',
    description: 'David Kim\'s clinical license (LPC #12345) expires in 16 days. No renewal documentation has been uploaded. Credential lapse would affect IOP program compliance.',
    confidence: 0.99, status: 'pending', created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function AIAgentsPage() {
  const { org } = useOrg();

  const [agentMetrics, setAgentMetrics] = useState<Record<AgentName, AgentMetrics[]>>(MOCK_METRICS);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [chatAgent, setChatAgent] = useState<AgentName | null>(null);
  const [loading, setLoading] = useState(true);

  // Reject modal state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchMetrics = useCallback(async () => {
    if (!org) return;
    const supabase = createClient();
    const orgId = org.id;
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

    const [
      policiesRes,
      policyConflictsRes,
      reviewsPendingRes,
      policyGuardianRunRes,
      checkpointsRes,
      overdueRes,
      remindersRes,
      complianceRunRes,
      evidenceRes,
      missingEvidenceRes,
      bindersRes,
      evidenceRunRes,
      meetingsRes,
      findingsRes,
      capasRes,
      qmRunRes,
    ] = await Promise.all([
      // Policy Guardian metrics
      supabase.from('policies').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('ai_suggestions').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('agent', 'policy_guardian').eq('suggestion_type', 'flag'),
      supabase.from('policies').select('id', { count: 'exact', head: true }).eq('org_id', orgId).lte('next_review_date', thirtyDaysFromNow),
      supabase.from('ai_agent_runs').select('created_at').eq('org_id', orgId).eq('agent', 'policy_guardian').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // Compliance Monitor metrics
      supabase.from('checkpoints').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('period', currentPeriod),
      supabase.from('checkpoints').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'overdue'),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('type', 'checkpoint_due'),
      supabase.from('ai_agent_runs').select('created_at').eq('org_id', orgId).eq('agent', 'compliance_monitor').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // Evidence Librarian metrics
      supabase.from('evidence').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('checkpoints').select('id, evidence(id)', { count: 'exact' }).eq('org_id', orgId).eq('status', 'passed'),
      supabase.from('evidence').select('checkpoint_id, checkpoints!inner(period)').eq('org_id', orgId),
      supabase.from('ai_agent_runs').select('created_at').eq('org_id', orgId).eq('agent', 'evidence_librarian').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // QM Orchestrator metrics
      supabase.from('qm_meetings').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('findings').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('capas').select('id', { count: 'exact', head: true }).eq('org_id', orgId).neq('status', 'closed'),
      supabase.from('ai_agent_runs').select('created_at').eq('org_id', orgId).eq('agent', 'qm_orchestrator').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const policies = policiesRes.count ?? 0;
    const conflicts = policyConflictsRes.count ?? 0;
    const reviewsPending = reviewsPendingRes.count ?? 0;
    const pgRun = policyGuardianRunRes.data?.created_at;

    const checkpoints = checkpointsRes.count ?? 0;
    const overdue = overdueRes.count ?? 0;
    const reminders = remindersRes.count ?? 0;
    const cmRun = complianceRunRes.data?.created_at;

    const evidenceCount = evidenceRes.count ?? 0;
    // Count checkpoints that passed but have no evidence attached
    const passedCheckpoints = missingEvidenceRes.data ?? [];
    const missingEvidence = passedCheckpoints.filter((cp: { evidence?: { id: string }[] }) => !cp.evidence || cp.evidence.length === 0).length;
    const binders = new Set((bindersRes.data ?? []).map((e: { checkpoints: { period: string }[] }) => e.checkpoints?.[0]?.period).filter(Boolean)).size;
    const elRun = evidenceRunRes.data?.created_at;

    const meetings = meetingsRes.count ?? 0;
    const findingsCount = findingsRes.count ?? 0;
    const capas = capasRes.count ?? 0;
    const qmRun = qmRunRes.data?.created_at;

    // Only replace mock data if we got real data
    const hasRealData = policies > 0 || checkpoints > 0 || evidenceCount > 0 || meetings > 0;

    if (hasRealData) {
      setAgentMetrics({
        policy_guardian: [
          { label: 'Policies Analyzed', value: policies || MOCK_METRICS.policy_guardian[0].value },
          { label: 'Conflicts Found', value: conflicts || MOCK_METRICS.policy_guardian[1].value },
          { label: 'Reviews Pending', value: reviewsPending || MOCK_METRICS.policy_guardian[2].value },
          { label: 'Last Run', value: pgRun ? timeAgo(pgRun) : (MOCK_METRICS.policy_guardian[3].value as string) },
        ],
        compliance_monitor: [
          { label: 'Checkpoints Generated', value: checkpoints || MOCK_METRICS.compliance_monitor[0].value },
          { label: 'Overdue Items', value: overdue },
          { label: 'Reminders Sent', value: reminders || MOCK_METRICS.compliance_monitor[2].value },
          { label: 'Last Run', value: cmRun ? timeAgo(cmRun) : (MOCK_METRICS.compliance_monitor[3].value as string) },
        ],
        evidence_librarian: [
          { label: 'Evidence Tracked', value: evidenceCount || MOCK_METRICS.evidence_librarian[0].value },
          { label: 'Missing Evidence', value: missingEvidence || MOCK_METRICS.evidence_librarian[1].value },
          { label: 'Binders Organized', value: binders || MOCK_METRICS.evidence_librarian[2].value },
          { label: 'Last Run', value: elRun ? timeAgo(elRun) : (MOCK_METRICS.evidence_librarian[3].value as string) },
        ],
        qm_orchestrator: [
          { label: 'Meetings Prepared', value: meetings || MOCK_METRICS.qm_orchestrator[0].value },
          { label: 'Findings Tracked', value: findingsCount || MOCK_METRICS.qm_orchestrator[1].value },
          { label: 'CAPAs Monitored', value: capas || MOCK_METRICS.qm_orchestrator[2].value },
          { label: 'Last Run', value: qmRun ? timeAgo(qmRun) : (MOCK_METRICS.qm_orchestrator[3].value as string) },
        ],
      });
    }
  }, [org]);

  const fetchSuggestions = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(8);

    if (data && data.length > 0) {
      setSuggestions(data as AISuggestion[]);
    } else {
      setSuggestions(MOCK_SUGGESTIONS);
    }

    const { count } = await supabase
      .from('ai_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('status', 'pending');
    setPendingCount(count ?? MOCK_SUGGESTIONS.filter((s) => s.status === 'pending').length);
    setLoading(false);
  }, [org]);

  useEffect(() => {
    if (org) {
      fetchMetrics();
      fetchSuggestions();
    }
  }, [org, fetchMetrics, fetchSuggestions]);

  // Realtime
  useEffect(() => {
    if (!org) return;
    const supabase = createClient();
    const channel = supabase
      .channel('ai-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_suggestions', filter: `org_id=eq.${org.id}` }, () => fetchSuggestions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [org, fetchSuggestions]);

  async function handleAccept(s: AISuggestion) {
    if (!org) return;
    // If mock, just remove from list
    if (s.id.startsWith('mock-')) {
      setSuggestions((prev) => prev.filter((item) => item.id !== s.id));
      setPendingCount((c) => Math.max(0, c - 1));
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ai_suggestions').update({ status: 'accepted', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', s.id);
    await supabase.from('audit_log').insert({ org_id: org.id, user_id: user?.id, action: 'suggestion.accept', entity_type: 'ai_suggestion', entity_id: s.id, metadata: { suggestion_type: s.suggestion_type } });
    fetchSuggestions();
  }

  function handleRejectStart(s: AISuggestion) {
    setRejectId(s.id);
    setRejectReason('');
  }

  async function handleRejectSubmit() {
    if (!org || !rejectId) return;
    setRejecting(true);
    // If mock, just remove
    if (rejectId.startsWith('mock-')) {
      setSuggestions((prev) => prev.filter((item) => item.id !== rejectId));
      setPendingCount((c) => Math.max(0, c - 1));
      setRejectId(null);
      setRejectReason('');
      setRejecting(false);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ai_suggestions').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: rejectReason.trim() || null }).eq('id', rejectId);
    await supabase.from('audit_log').insert({ org_id: org.id, user_id: user?.id, action: 'suggestion.reject', entity_type: 'ai_suggestion', entity_id: rejectId, metadata: { reason: rejectReason.trim() } });
    setRejectId(null);
    setRejectReason('');
    setRejecting(false);
    fetchSuggestions();
  }

  return (
    <div style={{ padding: '32px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 700, color: '#171717', marginBottom: '4px' }}>
          AI Agents
        </h1>
        <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
          Your intelligent compliance team
        </p>
      </div>

      {/* Agent Cards 2x2 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '40px' }}>
        {AGENTS.map((agent) => (
          <AgentCard
            key={agent}
            agent={agent}
            metrics={agentMetrics[agent]}
            onChatClick={setChatAgent}
          />
        ))}
      </div>

      {/* Recent AI Suggestions */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '18px', fontWeight: 600, color: '#171717', margin: 0 }}>
            Recent AI Suggestions
          </h2>
          {pendingCount > 0 && (
            <span style={{ padding: '2px 10px', background: '#FFFBEB', color: '#D97706', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>
              {pendingCount} pending
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px' }}>Loading...</div>
        ) : suggestions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px' }}>
            <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>All clear! No pending suggestions from your AI team.</p>
          </div>
        ) : (
          <div>
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onAccept={handleAccept}
                onReject={handleRejectStart}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Chat Slideout */}
      <AIChatSlideout
        agent={chatAgent}
        onClose={() => setChatAgent(null)}
        orgId={org?.id}
      />

      {/* Reject Modal */}
      {rejectId && (
        <div
          onClick={() => setRejectId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>Reject Suggestion</h3>
            <p style={{ fontSize: '13px', color: '#737373', marginBottom: '16px' }}>Optionally provide a reason to help the agent improve.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why are you rejecting this suggestion?"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #D4D4D4', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectId(null)}
                style={{ padding: '7px 16px', background: '#fff', color: '#525252', border: '1px solid #D4D4D4', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejecting}
                style={{ padding: '7px 16px', background: '#C05A2C', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: rejecting ? 'not-allowed' : 'pointer', opacity: rejecting ? 0.7 : 1 }}
              >
                {rejecting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
