'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/hooks/use-org';
import { useRole } from '@/hooks/use-role';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { org, isLoading } = useOrg();
  const { isAdmin, isLoading: roleLoading } = useRole();

  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (org) {
      setOrgName(org.name);
      setOrgSlug(org.slug);
    }
  }, [org]);

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function handleNameChange(val: string) {
    setOrgName(val);
    setOrgSlug(slugify(val));
  }

  async function handleSave() {
    if (!org) return;
    if (!orgName.trim()) {
      setError('Organization name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();

    // Check slug uniqueness if changed
    if (orgSlug !== org.slug) {
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .neq('id', org.id)
        .maybeSingle();

      if (existing) {
        setError('This slug is already taken. Choose a different name.');
        setSaving(false);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ name: orgName.trim(), slug: orgSlug, updated_at: new Date().toISOString() })
      .eq('id', org.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // Write audit log
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_log').insert({
      org_id: org.id,
      user_id: user?.id,
      action: 'org.update',
      entity_type: 'organization',
      entity_id: org.id,
      metadata: { name: orgName.trim(), slug: orgSlug },
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const createdAt = org?.created_at
    ? new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  const readOnly = !isAdmin;

  return (
    <div style={{ padding: '32px', maxWidth: '640px' }}>
      <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
        Organization Settings
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', marginBottom: '32px' }}>
        Manage your organization details and preferences.
      </p>

      {!isAdmin && !roleLoading && (
        <div style={{
          background: 'var(--yellow-light, #FFFBEB)',
          border: '1px solid #FDE68A',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '13px',
          color: 'var(--yellow, #D97706)',
          marginBottom: '20px',
        }}>
          You have read-only access. Contact an admin to make changes.
        </div>
      )}

      <div style={{
        background: '#fff',
        border: '1px solid var(--g200, #E8E8E8)',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: '28px',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g800, #262626)', marginBottom: '20px' }}>
          Organization Details
        </h2>

        {isLoading || roleLoading ? (
          <div style={{ color: 'var(--g400, #A3A3A3)', fontSize: '14px' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Org Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => handleNameChange(e.target.value)}
                readOnly={readOnly}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--g300, #D4D4D4)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: 'var(--g900, #171717)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: readOnly ? 'var(--g50, #FAFAFA)' : '#fff',
                  cursor: readOnly ? 'not-allowed' : 'text',
                }}
              />
            </div>

            {/* Slug */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                Organization Slug
                <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--g400, #A3A3A3)', fontWeight: 400 }}>auto-generated</span>
              </label>
              <input
                type="text"
                value={orgSlug}
                readOnly
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--g200, #E8E8E8)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: 'var(--g500, #737373)',
                  background: 'var(--g50, #FAFAFA)',
                  cursor: 'not-allowed',
                  boxSizing: 'border-box',
                }}
              />
              {isAdmin && (
                <p style={{ fontSize: '11px', color: 'var(--g400, #A3A3A3)', margin: '4px 0 0' }}>
                  Auto-generated from your organization name.
                </p>
              )}
            </div>

            {/* Created date */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                Member Since
              </label>
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', margin: 0 }}>{createdAt}</p>
            </div>

            {error && (
              <div style={{
                padding: '8px 12px',
                background: 'var(--red-light, #FEF2F2)',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--red, #DC2626)',
              }}>
                {error}
              </div>
            )}

            {/* Save — admin only */}
            {isAdmin && (
              <div style={{ paddingTop: '8px', borderTop: '1px solid var(--g100, #F5F5F5)' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '8px 20px',
                    background: saved ? 'var(--green, #16A34A)' : 'var(--blue, #3BA7C9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    transition: 'background 0.15s',
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
