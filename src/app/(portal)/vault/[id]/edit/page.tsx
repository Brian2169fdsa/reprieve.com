'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { JSONContent } from '@tiptap/react';
import { createClient } from '@/lib/supabase/client';
import type { Policy, PolicyVersion } from '@/lib/types';
import PolicyEditor from '@/components/vault/policy-editor';

export default function PolicyEditPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const [policy, setPolicy]         = useState<Policy | null>(null);
  const [currentVer, setCurrentVer] = useState<PolicyVersion | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [userId, setUserId]         = useState<string | null>(null);

  // Track editor content via callback (not React state to avoid re-renders)
  const editorContentRef = useRef<{ json: JSONContent; html: string } | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPolicy = useCallback(async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserId(user.id);

    const { data: pol, error: pErr } = await supabase
      .from('policies')
      .select('*')
      .eq('id', id)
      .single();

    if (pErr || !pol) {
      setError(pErr?.message ?? 'Policy not found.');
      setLoading(false);
      return;
    }
    setPolicy(pol as Policy);

    // Load current version content
    if (pol.current_version_id) {
      const { data: ver } = await supabase
        .from('policy_versions')
        .select('*')
        .eq('id', pol.current_version_id)
        .single();
      if (ver) setCurrentVer(ver as PolicyVersion);
    }

    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadPolicy();
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [loadPolicy]);

  // Auto-save draft to localStorage every 30s
  useEffect(() => {
    const scheduleAutoSave = () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        if (editorContentRef.current) {
          const key = `policy-draft-${id}`;
          localStorage.setItem(key, JSON.stringify({
            content: editorContentRef.current,
            savedAt: new Date().toISOString(),
          }));
        }
        scheduleAutoSave();
      }, 30_000);
    };

    if (!loading) scheduleAutoSave();
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [id, loading]);

  function handleEditorChange(json: JSONContent, html: string) {
    editorContentRef.current = { json, html };
    setSaveSuccess(false);
  }

  async function handleSave() {
    if (!policy || !userId) return;
    const content = editorContentRef.current;
    if (!content) return;

    setSaving(true);
    setError(null);
    const supabase = createClient();

    // Get next version number
    const { data: existingVersions } = await supabase
      .from('policy_versions')
      .select('version_number')
      .eq('policy_id', id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = existingVersions && existingVersions.length > 0
      ? existingVersions[0].version_number + 1
      : 1;

    // Insert new version
    const { data: newVer, error: vErr } = await supabase
      .from('policy_versions')
      .insert({
        policy_id: id,
        version_number: nextVersion,
        content: content.json,
        content_html: content.html,
        change_summary: changeSummary.trim() || `Version ${nextVersion}`,
        created_by: userId,
      })
      .select('id')
      .single();

    if (vErr || !newVer) {
      setError(vErr?.message ?? 'Failed to save version.');
      setSaving(false);
      return;
    }

    // Update policy's current_version_id and updated_at
    const { error: upErr } = await supabase
      .from('policies')
      .update({
        current_version_id: newVer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    // Clear localStorage draft
    localStorage.removeItem(`policy-draft-${id}`);
    setChangeSummary('');
    setSaving(false);
    setSaveSuccess(true);

    // Navigate back to detail after short delay
    setTimeout(() => router.push(`/vault/${id}`), 1000);
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px' }}>
        Loading editor…
      </div>
    );
  }

  if (error && !policy) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '14px 18px', fontSize: '13px', color: '#B91C1C', marginBottom: '16px' }}>
          {error}
        </div>
        <Link href="/vault" style={{ color: '#2A8BA8', fontSize: '13px', textDecoration: 'none' }}>
          ← Back to Knowledge Vault
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
        <Link href="/vault" style={{ color: '#2A8BA8', textDecoration: 'none' }}>Knowledge Vault</Link>
        <span style={{ color: '#A3A3A3' }}>›</span>
        <Link href={`/vault/${id}`} style={{ color: '#2A8BA8', textDecoration: 'none' }}>{policy?.title ?? 'Policy'}</Link>
        <span style={{ color: '#A3A3A3' }}>›</span>
        <span style={{ color: '#737373' }}>Edit</span>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#737373', background: '#F5F5F5', padding: '2px 7px', borderRadius: '4px' }}>
            {policy?.code}
          </span>
          {currentVer && (
            <span style={{ fontSize: '12px', color: '#A3A3A3' }}>
              Editing from v{currentVer.version_number} → will save as v{currentVer.version_number + 1}
            </span>
          )}
        </div>
        <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '22px', fontWeight: 700, color: '#171717' }}>
          {policy?.title}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#B91C1C', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Tiptap Editor */}
      <PolicyEditor
        content={(currentVer?.content as JSONContent) ?? null}
        onChange={handleEditorChange}
        placeholder="Start writing your policy…"
      />

      {/* Change summary + actions */}
      <div style={{ marginTop: '20px', background: '#FAFAFA', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '18px 20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#404040', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
          Change Summary
        </label>
        <textarea
          value={changeSummary}
          onChange={(e) => setChangeSummary(e.target.value)}
          placeholder="Briefly describe what changed in this version…"
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #D4D4D4',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#262626',
            background: '#fff',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: '1.6',
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: '11px', color: '#A3A3A3', marginTop: '6px' }}>
          Saving will create a new version and update the policy record. The current version is preserved in history.
        </p>

        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
          {/* Auto-save indicator */}
          <span style={{ fontSize: '12px', color: '#A3A3A3' }}>
            Auto-saves draft locally every 30 seconds
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href={`/vault/${id}`}
              style={{ padding: '9px 18px', background: '#F5F5F5', color: '#525252', border: '1px solid #E8E8E8', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={saving || saveSuccess}
              onClick={handleSave}
              style={{
                padding: '9px 20px',
                background: saveSuccess ? '#16A34A' : saving ? '#A3A3A3' : '#2A8BA8',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving || saveSuccess ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.15s',
              }}
            >
              {saveSuccess ? '✓ Saved — redirecting…' : saving ? 'Saving…' : '💾 Save New Version'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
