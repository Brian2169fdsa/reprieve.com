'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getPolicyDocumentUrl, uploadPolicyDocument } from '@/lib/supabase/storage';
import type { Policy, PolicyVersion, PolicyStatus } from '@/lib/types';
import VersionHistory from '@/components/vault/version-history';
import ApprovalWorkflow from '@/components/vault/approval-workflow';

// ─── Style helpers ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: '#F5F5F5', color: '#737373', label: 'Draft' },
  in_review: { bg: '#FFFBEB', color: '#B45309', label: 'In Review' },
  approved:  { bg: '#E8F6FA', color: '#0E7490', label: 'Approved' },
  effective: { bg: '#F0FDF4', color: '#15803D', label: 'Effective' },
  retired:   { bg: '#FEF2F2', color: '#B91C1C', label: 'Retired' },
};

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  HIPAA:      { bg: '#F5F3FF', color: '#6D28D9' },
  Safety:     { bg: '#FFFBEB', color: '#B45309' },
  HR:         { bg: '#FDF4FF', color: '#9333EA' },
  Clinical:   { bg: '#F0FDF4', color: '#15803D' },
  Operations: { bg: '#EFF6FF', color: '#1D4ED8' },
  Billing:    { bg: '#FFF7ED', color: '#C2410C' },
  Admin:      { bg: '#F5F5F5', color: '#525252' },
};

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, background: bg, color }}>
      {text}
    </span>
  );
}

// ─── Related policy entry type ────────────────────────────────────────────────

interface PolicyRef {
  id: string;
  source_policy_id: string;
  target_policy_id: string;
  relationship: string;
  otherPolicy: { id: string; title: string; code: string; status: string };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PolicyDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = params.id as string;

  const [policy, setPolicy]           = useState<Policy | null>(null);
  const [versions, setVersions]       = useState<PolicyVersion[]>([]);
  const [related, setRelated]         = useState<PolicyRef[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<PolicyVersion | null>(null);
  const [showAddRef, setShowAddRef]   = useState(false);
  const [refSearch, setRefSearch]     = useState('');
  const [refResults, setRefResults]   = useState<Policy[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);
  const [orgId, setOrgId]             = useState<string | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [aiSuggestionTitle, setAiSuggestionTitle] = useState<string | undefined>(undefined);
  const [documentPath, setDocumentPath] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserId(user.id);

    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (membership) setOrgId(membership.org_id);

    // Fetch policy
    const { data: pol, error: pErr } = await supabase
      .from('policies')
      .select('*, owner:profiles!owner_id(id, full_name, email)')
      .eq('id', id)
      .single();

    if (pErr || !pol) {
      setError(pErr?.message ?? 'Policy not found.');
      setLoading(false);
      return;
    }
    setPolicy(pol as Policy);

    // Check for document path in settings
    const settings = (pol as Record<string, unknown>).settings as Record<string, unknown> | null;
    if (settings?.document_path) {
      setDocumentPath(settings.document_path as string);
    }

    // Fetch versions
    const { data: vers } = await supabase
      .from('policy_versions')
      .select('*')
      .eq('policy_id', id)
      .order('version_number', { ascending: false });
    setVersions((vers ?? []) as PolicyVersion[]);

    // Fetch related policies (as source or target)
    const { data: refsAsSource } = await supabase
      .from('policy_references')
      .select('*, otherPolicy:policies!target_policy_id(id, title, code, status)')
      .eq('source_policy_id', id);

    const { data: refsAsTarget } = await supabase
      .from('policy_references')
      .select('*, otherPolicy:policies!source_policy_id(id, title, code, status)')
      .eq('target_policy_id', id);

    const combined: PolicyRef[] = [
      ...((refsAsSource ?? []) as unknown as PolicyRef[]),
      ...((refsAsTarget ?? []) as unknown as PolicyRef[]),
    ];
    setRelated(combined);

    // Check if AI-generated
    const { data: aiSugg } = await supabase
      .from('ai_suggestions')
      .select('id, title')
      .eq('entity_type', 'policy')
      .eq('entity_id', id)
      .maybeSingle();

    if (aiSugg) {
      setIsAiGenerated(true);
      setAiSuggestionTitle(aiSugg.title);
    }

    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStatusChange(newStatus: PolicyStatus) {
    if (!policy || !userId || !orgId) return;
    setSavingStatus(true);
    const supabase = createClient();
    const updates: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'approved') {
      // Update policy_version with approved_by and approved_at
      const currentVer = versions.find(v => v.id === policy.current_version_id);
      if (currentVer) {
        await supabase
          .from('policy_versions')
          .update({
            approved_by: userId,
            approved_at: new Date().toISOString(),
          })
          .eq('id', currentVer.id);
      }
    }

    if (newStatus === 'effective') {
      // Set effective date on version
      const currentVer = versions.find(v => v.id === policy.current_version_id);
      if (currentVer) {
        await supabase
          .from('policy_versions')
          .update({ effective_date: new Date().toISOString().split('T')[0] })
          .eq('id', currentVer.id);
      }
    }

    if (newStatus === 'draft' && policy.status === 'in_review') {
      // Rejection — notify policy owner
      if (policy.owner_id) {
        await supabase.from('notifications').insert({
          org_id: orgId,
          user_id: policy.owner_id,
          type: 'approval_needed',
          title: 'Policy returned to draft',
          message: `"${policy.title}" was returned to draft status and needs revision.`,
          entity_type: 'policy',
          entity_id: policy.id,
        });
      }
    }

    const { data: updated, error: uErr } = await supabase
      .from('policies')
      .update(updates)
      .eq('id', id)
      .select('*, owner:profiles!owner_id(id, full_name, email)')
      .single();

    // Write audit log
    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action: `policy.${newStatus}`,
      entity_type: 'policy',
      entity_id: id,
      metadata: { from_status: policy.status, to_status: newStatus, title: policy.title },
    });

    if (!uErr && updated) {
      setPolicy(updated as Policy);
      // Reload versions to reflect approved_by changes
      const { data: vers } = await supabase
        .from('policy_versions')
        .select('*')
        .eq('policy_id', id)
        .order('version_number', { ascending: false });
      setVersions((vers ?? []) as PolicyVersion[]);
    }
    setSavingStatus(false);
  }

  async function handleAddReference(targetId: string) {
    if (!orgId) return;
    const supabase = createClient();
    await supabase.from('policy_references').insert({
      source_policy_id: id,
      target_policy_id: targetId,
      relationship: 'related',
    });
    setShowAddRef(false);
    setRefSearch('');
    setRefResults([]);
    await loadData();
  }

  async function handleRemoveReference(refId: string) {
    const supabase = createClient();
    await supabase.from('policy_references').delete().eq('id', refId);
    await loadData();
  }

  async function searchPolicies(q: string) {
    if (q.length < 2) { setRefResults([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from('policies')
      .select('id, title, code, status')
      .neq('id', id)
      .or(`title.ilike.%${q}%,code.ilike.%${q}%`)
      .limit(8);
    setRefResults((data ?? []) as Policy[]);
  }

  async function handleViewDocument() {
    if (!orgId || !documentPath) return;
    const url = await getPolicyDocumentUrl(orgId, documentPath);
    if (url) window.open(url, '_blank');
  }

  async function handleUploadNewDocument(file: File) {
    if (!orgId || !policy) return;
    setUploadingDoc(true);
    const result = await uploadPolicyDocument(orgId, policy.id, file);
    if (result.error) {
      setError('Document upload failed: ' + result.error.message);
    } else {
      // Update policy settings with new document path
      const supabase = createClient();
      const currentSettings = ((policy as unknown as Record<string, unknown>).settings as Record<string, unknown>) ?? {};
      await supabase.from('policies').update({
        settings: { ...currentSettings, document_path: result.path },
      }).eq('id', policy.id);
      setDocumentPath(result.path);
    }
    setUploadingDoc(false);
  }

  // Current displayed version content
  const displayVersion = selectedVersion
    ? selectedVersion
    : versions.find((v) => v.id === policy?.current_version_id) ?? versions[0] ?? null;

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px' }}>
        Loading policy…
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '14px 18px', fontSize: '13px', color: '#B91C1C', marginBottom: '16px' }}>
          {error ?? 'Policy not found.'}
        </div>
        <Link href="/vault" style={{ color: '#2A8BA8', fontSize: '13px', textDecoration: 'none' }}>
          ← Back to Knowledge Vault
        </Link>
      </div>
    );
  }

  const ss  = STATUS_STYLES[policy.status] ?? STATUS_STYLES.draft;
  const cc  = CAT_COLORS[policy.category] ?? { bg: '#F5F5F5', color: '#525252' };
  const ownerName = policy.owner?.full_name;
  const policySettings = ((policy as unknown as Record<string, unknown>).settings as Record<string, unknown>) ?? {};
  const description = policySettings.description as string | null;

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/vault" style={{ fontSize: '13px', color: '#2A8BA8', textDecoration: 'none' }}>
          ← Knowledge Vault
        </Link>
      </div>

      {/* AI Generated banner */}
      {isAiGenerated && (
        <div
          style={{
            padding: '12px 18px',
            background: '#F0F9FC',
            border: '1px solid #B2E0ED',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#0E7490',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 700,
            background: '#E8F6FA',
            color: '#2A8BA8',
            border: '1px solid #B2E0ED',
            flexShrink: 0,
          }}>
            AI Generated
          </span>
          <span>
            This policy was created by the AI Policy Guardian and requires human review before activation.
            {aiSuggestionTitle && <span style={{ color: '#737373' }}> — {aiSuggestionTitle}</span>}
          </span>
        </div>
      )}

      {/* Policy header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#737373', background: '#F5F5F5', padding: '2px 8px', borderRadius: '4px' }}>
              {policy.code}
            </span>
            <Badge text={ss.label} bg={ss.bg} color={ss.color} />
            <Badge text={policy.category} bg={cc.bg} color={cc.color} />
            {policy.program.map((p) => (
              <span key={p} style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '11px', background: '#F5F5F5', color: '#525252' }}>
                {p}
              </span>
            ))}
            {isAiGenerated && (
              <span style={{
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                background: '#E8F6FA',
                color: '#2A8BA8',
                border: '1px solid #B2E0ED',
              }}>
                AI
              </span>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '26px', fontWeight: 700, color: '#171717', marginBottom: '0', letterSpacing: '-0.3px' }}>
            {policy.title}
          </h1>
          {description && (
            <p style={{ fontSize: '14px', color: '#737373', marginTop: '6px' }}>
              {description}
            </p>
          )}
        </div>

        <Link
          href={`/vault/${id}/edit`}
          style={{
            padding: '9px 18px',
            background: '#2A8BA8',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          ✏ Edit Policy
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '28px', alignItems: 'start' }}>

        {/* ── Left column ─────────────────────────────────────────── */}
        <div>

          {/* Metadata card */}
          <div style={{ background: '#FAFAFA', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '18px 20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Owner', value: ownerName ?? '—' },
              { label: 'Department', value: policy.department ?? '—' },
              { label: 'Review Cadence', value: `Every ${policy.review_cadence_months} months` },
              { label: 'Next Review', value: policy.next_review_date ? new Date(policy.next_review_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
              { label: 'Created', value: new Date(policy.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              { label: 'Last Updated', value: new Date(policy.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                  {label}
                </div>
                <div style={{ fontSize: '13px', color: '#262626', fontWeight: 500 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Document Viewer */}
          {(documentPath || true) && (
            <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '18px 20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#404040', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                Policy Document
              </h3>
              {documentPath ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: '#FEF2F2', color: '#DC2626' }}>
                      PDF
                    </span>
                    <span style={{ fontSize: '13px', color: '#262626', fontWeight: 500 }}>
                      {documentPath.split('/').pop() ?? 'Document'}
                    </span>
                  </div>
                  <button
                    onClick={handleViewDocument}
                    style={{
                      padding: '6px 14px',
                      background: '#E8F6FA',
                      color: '#2A8BA8',
                      border: '1px solid #B2E0ED',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    View Document
                  </button>
                  <label style={{
                    padding: '6px 14px',
                    background: '#F5F5F5',
                    color: '#525252',
                    border: '1px solid #E8E8E8',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: uploadingDoc ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}>
                    {uploadingDoc ? 'Uploading…' : 'Re-upload'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadNewDocument(f); }}
                      style={{ display: 'none' }}
                      disabled={uploadingDoc}
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '13px', color: '#A3A3A3', marginBottom: '10px' }}>
                    No document uploaded yet.
                  </p>
                  <label style={{
                    padding: '7px 14px',
                    background: '#F5F5F5',
                    color: '#525252',
                    border: '1px solid #E8E8E8',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: uploadingDoc ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    display: 'inline-block',
                  }}>
                    {uploadingDoc ? 'Uploading…' : '📎 Upload Document'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadNewDocument(f); }}
                      style={{ display: 'none' }}
                      disabled={uploadingDoc}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Approval Workflow */}
          <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '18px 20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#404040', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
              Approval Workflow
            </h3>
            <ApprovalWorkflow
              currentStatus={policy.status as PolicyStatus}
              onStatusChange={handleStatusChange}
              disabled={savingStatus}
              isAiGenerated={isAiGenerated}
              aiSuggestionTitle={aiSuggestionTitle}
            />
          </div>

          {/* Policy content */}
          <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
            {/* Content header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E8E8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#404040', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Policy Content
                </span>
                {displayVersion && (
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#737373' }}>
                    {displayVersion.id === policy.current_version_id ? (
                      <span style={{ color: '#2A8BA8', fontWeight: 600 }}>v{displayVersion.version_number} (current)</span>
                    ) : (
                      <>
                        <span style={{ color: '#B45309', fontWeight: 600 }}>v{displayVersion.version_number} (historical)</span>
                        {' '}
                        <button
                          type="button"
                          onClick={() => setSelectedVersion(null)}
                          style={{ fontSize: '12px', color: '#2A8BA8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                        >
                          View current
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>
              <Link
                href={`/vault/${id}/edit`}
                style={{ fontSize: '12px', color: '#2A8BA8', textDecoration: 'none', fontWeight: 600 }}
              >
                Edit →
              </Link>
            </div>

            {/* Content body */}
            <div
              style={{ padding: '24px 28px', fontSize: '14px', lineHeight: '1.75', color: '#262626' }}
              className="policy-content"
            >
              <style>{`
                .policy-content h1 { font-family: var(--font-source-serif-4, serif); font-size: 22px; font-weight: 700; color: #171717; margin: 0 0 16px; }
                .policy-content h2 { font-family: var(--font-source-serif-4, serif); font-size: 17px; font-weight: 600; color: #262626; margin: 20px 0 8px; }
                .policy-content h3 { font-family: var(--font-source-serif-4, serif); font-size: 14px; font-weight: 600; color: #404040; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.03em; }
                .policy-content p { margin: 0 0 10px; }
                .policy-content ul, .policy-content ol { padding-left: 24px; margin: 0 0 10px; }
                .policy-content li { margin-bottom: 4px; }
                .policy-content strong { font-weight: 600; }
                .policy-content table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
                .policy-content th, .policy-content td { border: 1px solid #D4D4D4; padding: 8px 12px; }
                .policy-content th { background: #F5F5F5; font-weight: 600; }
                .policy-content hr { border: none; border-top: 2px solid #E8E8E8; margin: 20px 0; }
                .policy-content mark { background: #FEF9C3; padding: 1px 2px; border-radius: 2px; }
              `}</style>
              {displayVersion?.content_html ? (
                <div dangerouslySetInnerHTML={{ __html: displayVersion.content_html }} />
              ) : (
                <p style={{ color: '#A3A3A3', fontStyle: 'italic' }}>
                  No content yet.{' '}
                  <Link href={`/vault/${id}/edit`} style={{ color: '#2A8BA8' }}>
                    Add content in the editor →
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Related Policies */}
          <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#404040', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Related Policies
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRef(true)}
                style={{ fontSize: '12px', color: '#2A8BA8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
              >
                + Add Reference
              </button>
            </div>

            {related.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#A3A3A3', fontStyle: 'italic' }}>No cross-references yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {related.map((ref) => {
                  const op  = ref.otherPolicy;
                  const oss = STATUS_STYLES[op.status] ?? STATUS_STYLES.draft;
                  return (
                    <div key={ref.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#FAFAFA', borderRadius: '6px', border: '1px solid #E8E8E8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#737373' }}>{op.code}</span>
                        <Link href={`/vault/${op.id}`} style={{ fontSize: '13px', fontWeight: 500, color: '#2A8BA8', textDecoration: 'none' }}>
                          {op.title}
                        </Link>
                        <span style={{ fontSize: '11px', color: '#A3A3A3', background: '#F5F5F5', padding: '1px 6px', borderRadius: '4px' }}>
                          {ref.relationship}
                        </span>
                        <Badge text={oss.label} bg={oss.bg} color={oss.color} />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveReference(ref.id)}
                        style={{ fontSize: '12px', color: '#A3A3A3', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        title="Remove reference"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Reference inline search */}
            {showAddRef && (
              <div style={{ marginTop: '14px', padding: '14px', background: '#F0F9FC', border: '1px solid #B2E0ED', borderRadius: '6px' }}>
                <input
                  type="search"
                  placeholder="Search policies by title or code…"
                  value={refSearch}
                  onChange={(e) => { setRefSearch(e.target.value); searchPolicies(e.target.value); }}
                  autoFocus
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #D4D4D4', borderRadius: '6px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                {refResults.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {refResults.map((rp) => (
                      <div
                        key={rp.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleAddReference(rp.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddReference(rp.id)}
                        style={{ padding: '8px 12px', background: '#fff', border: '1px solid #E8E8E8', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#E8F6FA')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                      >
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#737373' }}>{rp.code}</span>
                        <span style={{ fontSize: '13px', color: '#262626' }}>{rp.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setShowAddRef(false); setRefSearch(''); setRefResults([]); }}
                  style={{ marginTop: '8px', fontSize: '12px', color: '#737373', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────── */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '18px 16px', position: 'sticky', top: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#404040', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
              Version History
            </h3>
            <VersionHistory
              versions={versions}
              currentVersionId={policy.current_version_id}
              selectedVersionId={selectedVersion?.id}
              onSelectVersion={(v) => {
                setSelectedVersion(v.id === policy.current_version_id ? null : v);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
