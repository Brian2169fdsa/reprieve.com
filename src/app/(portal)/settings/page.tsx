'use client';

import { useState } from 'react';
import { useOrg } from '@/hooks/use-org';

export default function SettingsPage() {
  const { org, isLoading } = useOrg();
  const [orgName, setOrgName] = useState('');
  const [saved, setSaved] = useState(false);

  const displayName = orgName || (org?.name ?? 'Cholla Behavioral Health');
  const slug = org?.slug ?? 'cholla-behavioral-health';
  const createdAt = org?.created_at
    ? new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'January 15, 2026';

  function handleSave() {
    // TODO: persist via Supabase
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ padding: '32px', maxWidth: '640px' }}>
      <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
        Organization Settings
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', marginBottom: '32px' }}>
        Manage your organization details and preferences.
      </p>

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

        {isLoading ? (
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
                value={displayName}
                onChange={(e) => setOrgName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--g300, #D4D4D4)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: 'var(--g900, #171717)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Slug (read-only) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                Organization Slug
                <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--g400, #A3A3A3)', fontWeight: 400 }}>read-only</span>
              </label>
              <input
                type="text"
                value={slug}
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
            </div>

            {/* Created date (read-only) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                Member Since
              </label>
              <p style={{ fontSize: '14px', color: 'var(--g700, #404040)', margin: 0 }}>{createdAt}</p>
            </div>

            {/* Save */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--g100, #F5F5F5)' }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '8px 20px',
                  background: saved ? 'var(--green, #16A34A)' : 'var(--blue, #3BA7C9)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
