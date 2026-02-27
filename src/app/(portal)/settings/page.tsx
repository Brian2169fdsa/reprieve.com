'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/hooks/use-org';
import { useRole } from '@/hooks/use-role';
import { createClient } from '@/lib/supabase/client';

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default function SettingsPage() {
  const { org, isLoading, error: orgError } = useOrg();
  const { isAdmin, isLoading: roleLoading } = useRole();

  // Edit existing org
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create org (no-org state)
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (org) {
      setOrgName(org.name);
      setOrgSlug(org.slug);
    }
  }, [org]);

  function handleNameChange(val: string) {
    setOrgName(val);
    setOrgSlug(slugify(val));
  }

  async function handleCreate() {
    if (!newOrgName.trim()) {
      setCreateError('Organization name is required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/setup-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: newOrgName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? 'Failed to create organization.');
        return;
      }
      // Refresh page so org context reloads
      window.location.reload();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!org) return;
    if (!orgName.trim()) { setError('Organization name is required.'); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    if (orgSlug !== org.slug) {
      const { data: existing } = await supabase.from('organizations').select('id').eq('slug', orgSlug).neq('id', org.id).maybeSingle();
      if (existing) { setError('This slug is already taken.'); setSaving(false); return; }
    }
    const { error: updateError } = await supabase.from('organizations').update({ name: orgName.trim(), slug: orgSlug, updated_at: new Date().toISOString() }).eq('id', org.id);
    if (updateError) { setError(updateError.message); setSaving(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_log').insert({ org_id: org.id, user_id: user?.id, action: 'org.update', entity_type: 'organization', entity_id: org.id, metadata: { name: orgName.trim(), slug: orgSlug } });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const createdAt = org?.created_at
    ? new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  const loading = isLoading || roleLoading;

  // ── No org state: show setup form ──────────────────────────────────────
  if (!loading && !org) {
    return (
      <div style={{ padding: '32px', maxWidth: '640px' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: '#171717', marginBottom: '4px' }}>
          Organization Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#737373', marginBottom: '32px' }}>
          Set up your organization to unlock the full REPrieve.ai platform.
        </p>

        <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E8F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏢</div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717', margin: 0 }}>Create Your Organization</h2>
              <p style={{ fontSize: '13px', color: '#737373', margin: '2px 0 0' }}>You'll be set as Owner / Admin with full access.</p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#525252', marginBottom: 6 }}>
              Organization Name
            </label>
            <input
              type="text"
              value={newOrgName}
              onChange={e => setNewOrgName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Cholla Behavioral Health"
              autoFocus
              style={{
                width: '100%', padding: '9px 12px', border: '1px solid #D4D4D4', borderRadius: '6px',
                fontSize: '14px', color: '#171717', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {newOrgName && (
              <p style={{ fontSize: '11px', color: '#A3A3A3', marginTop: 4 }}>
                Slug: <span style={{ fontFamily: 'monospace', color: '#737373' }}>{slugify(newOrgName) || '—'}</span>
              </p>
            )}
          </div>

          {createError && (
            <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', color: '#DC2626', marginBottom: 16 }}>
              {createError}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || !newOrgName.trim()}
            style={{
              padding: '9px 20px', background: creating || !newOrgName.trim() ? '#A3A3A3' : '#2A8BA8',
              color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600,
              cursor: creating || !newOrgName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {creating ? 'Creating…' : 'Create Organization'}
          </button>
        </div>

        {orgError && (
          <p style={{ fontSize: '12px', color: '#A3A3A3', marginTop: 12 }}>
            Debug: {orgError}
          </p>
        )}
      </div>
    );
  }

  // ── Normal org view ─────────────────────────────────────────────────────
  const readOnly = !isAdmin;

  return (
    <div style={{ padding: '32px', maxWidth: '640px' }}>
      <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: '#171717', marginBottom: '4px' }}>
        Organization Settings
      </h1>
      <p style={{ fontSize: '14px', color: '#737373', marginBottom: '32px' }}>
        Manage your organization details and preferences.
      </p>

      {readOnly && !roleLoading && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#D97706', marginBottom: '20px' }}>
          You have read-only access. Contact an admin to make changes.
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#262626', marginBottom: '20px' }}>
          Organization Details
        </h2>

        {loading ? (
          <div style={{ color: '#A3A3A3', fontSize: '14px' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#525252', marginBottom: '6px' }}>
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => handleNameChange(e.target.value)}
                readOnly={readOnly}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #D4D4D4', borderRadius: '6px',
                  fontSize: '14px', color: '#171717', outline: 'none', boxSizing: 'border-box',
                  background: readOnly ? '#FAFAFA' : '#fff', cursor: readOnly ? 'not-allowed' : 'text',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#525252', marginBottom: '6px' }}>
                Organization Slug
                <span style={{ marginLeft: '8px', fontSize: '11px', color: '#A3A3A3', fontWeight: 400 }}>auto-generated</span>
              </label>
              <input
                type="text"
                value={orgSlug}
                readOnly
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #E8E8E8', borderRadius: '6px',
                  fontSize: '14px', color: '#737373', background: '#FAFAFA', cursor: 'not-allowed', boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#525252', marginBottom: '6px' }}>
                Member Since
              </label>
              <p style={{ fontSize: '14px', color: '#404040', margin: 0 }}>{createdAt}</p>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', color: '#DC2626' }}>
                {error}
              </div>
            )}

            {isAdmin && (
              <div style={{ paddingTop: '8px', borderTop: '1px solid #F5F5F5' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '8px 20px', background: saved ? '#16A34A' : '#3BA7C9',
                    color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
