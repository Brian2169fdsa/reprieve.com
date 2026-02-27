'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/hooks/use-org';
import { createClient } from '@/lib/supabase/client';
import SuggestionCard from '@/components/ai/suggestion-card';
import type { AISuggestion, SuggestionStatus } from '@/lib/types';

const TABS: { key: SuggestionStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

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

async function applyChangesToEntity(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string | undefined,
  changes: Record<string, unknown> | undefined,
  orgId: string,
) {
  if (!entityId || !changes || Object.keys(changes).length === 0) return;
  const tableMap: Record<string, string> = { policy: 'policies', checkpoint: 'checkpoints', capa: 'capas', control: 'controls' };
  const table = tableMap[entityType];
  if (!table) return;
  await supabase.from(table).update({ ...changes, updated_at: new Date().toISOString() }).eq('id', entityId).eq('org_id', orgId);
}

export default function SuggestionsPage() {
  const { org } = useOrg();

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SuggestionStatus | 'all'>('pending');
  const [pendingCount, setPendingCount] = useState(0);

  // Reject modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('ai_suggestions')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false });

    if (activeTab !== 'all') query = query.eq('status', activeTab);

    const { data } = await query;

    if (data && data.length > 0) {
      setSuggestions(data as AISuggestion[]);
    } else if (activeTab === 'pending' || activeTab === 'all') {
      setSuggestions(MOCK_SUGGESTIONS);
    } else {
      setSuggestions([]);
    }
    setLoading(false);
  }, [org, activeTab]);

  useEffect(() => {
    if (org) fetchSuggestions();
  }, [org, fetchSuggestions]);

  // Pending count
  useEffect(() => {
    if (!org) return;
    const supabase = createClient();
    supabase
      .from('ai_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? MOCK_SUGGESTIONS.filter((s) => s.status === 'pending').length));
  }, [org, suggestions]);

  // Realtime
  useEffect(() => {
    if (!org) return;
    const supabase = createClient();
    const channel = supabase
      .channel('suggestions-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_suggestions', filter: `org_id=eq.${org.id}` }, () => fetchSuggestions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [org, fetchSuggestions]);

  async function handleAccept(s: AISuggestion) {
    if (!org) return;
    if (s.id.startsWith('mock-')) {
      setSuggestions((prev) => prev.filter((item) => item.id !== s.id));
      setPendingCount((c) => Math.max(0, c - 1));
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    await supabase.from('ai_suggestions').update({ status: 'accepted', reviewed_by: user?.id, reviewed_at: now }).eq('id', s.id);
    await applyChangesToEntity(supabase, s.entity_type, s.entity_id, s.suggested_changes, org.id);
    await supabase.from('audit_log').insert({
      org_id: org.id, user_id: user?.id, action: 'suggestion.accept', entity_type: 'ai_suggestion', entity_id: s.id,
      metadata: { suggestion_type: s.suggestion_type, target_entity: s.entity_type, target_id: s.entity_id },
    });
    fetchSuggestions();
  }

  function handleRejectStart(s: AISuggestion) {
    setRejectId(s.id);
    setRejectReason('');
  }

  async function handleRejectSubmit() {
    if (!org || !rejectId) return;
    setRejecting(true);
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
    const now = new Date().toISOString();

    await supabase.from('ai_suggestions').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: now, review_notes: rejectReason.trim() || null }).eq('id', rejectId);
    await supabase.from('audit_log').insert({
      org_id: org.id, user_id: user?.id, action: 'suggestion.reject', entity_type: 'ai_suggestion', entity_id: rejectId,
      metadata: { reason: rejectReason.trim() },
    });
    setRejectId(null);
    setRejectReason('');
    setRejecting(false);
    fetchSuggestions();
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 700, color: '#171717', marginBottom: '4px' }}>
            AI Suggestions
          </h1>
          <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
            Review and act on AI-generated recommendations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '24px', background: '#F5F5F5', borderRadius: '8px', padding: '3px', width: 'fit-content' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? '#171717' : '#737373',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span style={{ padding: '1px 7px', background: '#FFFBEB', color: '#D97706', borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px' }}>Loading...</div>
      ) : suggestions.length === 0 ? (
        <div style={{ padding: '48px 32px', textAlign: 'center', background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#525252', marginBottom: '8px' }}>
            {activeTab === 'pending' ? 'All clear! No pending suggestions from your AI team.' : `No ${activeTab} suggestions`}
          </p>
          <p style={{ fontSize: '13px', color: '#A3A3A3', margin: 0 }}>
            Suggestions will appear here once AI agents flag items for review.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onAccept={handleAccept}
              onReject={handleRejectStart}
            />
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div
          onClick={() => setRejectId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#171717', marginBottom: '8px' }}>Reject Suggestion</h3>
            <p style={{ fontSize: '13px', color: '#737373', marginBottom: '16px' }}>Optionally provide a reason. This helps the agent improve future suggestions.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Optional: explain why you're rejecting this suggestion..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #D4D4D4', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '20px' }}
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
