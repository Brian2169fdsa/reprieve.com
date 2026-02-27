'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/hooks/use-org';
import { useRole } from '@/hooks/use-role';
import { createClient } from '@/lib/supabase/client';
import type { OrgRole } from '@/lib/types';

const ALL_ROLES: OrgRole[] = ['admin', 'compliance', 'clinical', 'ops', 'hr', 'billing', 'supervisor', 'executive'];

const ROLE_COLORS: Record<OrgRole, { bg: string; color: string }> = {
  admin:      { bg: '#EFF6FF', color: '#1D4ED8' },
  compliance: { bg: '#F0FDF4', color: '#15803D' },
  clinical:   { bg: '#F5F3FF', color: '#6D28D9' },
  ops:        { bg: '#FFF7ED', color: '#C2410C' },
  hr:         { bg: '#FDF4FF', color: '#9333EA' },
  billing:    { bg: '#FFFBEB', color: '#B45309' },
  supervisor: { bg: '#E8F6FA', color: '#0E7490' },
  executive:  { bg: '#FEF2F2', color: '#B91C1C' },
};

const ROLE_LABELS: Record<OrgRole, string> = {
  admin:      'Admin',
  compliance: 'Compliance',
  clinical:   'Clinical',
  ops:        'Ops',
  hr:         'HR',
  billing:    'Billing',
  supervisor: 'Supervisor',
  executive:  'Executive',
};

interface MemberRow {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
  joined_at: string;
  profiles: { id: string; full_name: string; email: string } | null;
}

function RoleBadge({ role }: { role: OrgRole }) {
  const { bg, color } = ROLE_COLORS[role];
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: bg, color }}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function MembersPage() {
  const { org } = useOrg();
  const { isAdmin, isLoading: roleLoading } = useRole();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('clinical');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ tempPassword: string; email: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from('org_members')
      .select('id, org_id, user_id, role, is_active, joined_at, profiles(id, full_name, email)')
      .eq('org_id', org.id)
      .order('joined_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setMembers((data ?? []) as unknown as MemberRow[]);
    }
    setLoading(false);
  }, [org]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function updateRole(memberId: string, newRole: OrgRole) {
    if (!org) return;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('org_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (updateError) {
      alert('Failed to update role: ' + updateError.message);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const member = members.find((m) => m.id === memberId);
    await supabase.from('audit_log').insert({
      org_id: org.id,
      user_id: user?.id,
      action: 'member.role_change',
      entity_type: 'org_member',
      entity_id: memberId,
      metadata: { previous_role: member?.role, new_role: newRole, target_user: member?.user_id },
    });

    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
  }

  async function toggleActive(memberId: string, currentlyActive: boolean) {
    if (!org) return;
    const action = currentlyActive ? 'deactivate' : 'activate';
    const confirmed = window.confirm(
      currentlyActive
        ? 'Deactivate this member? They will lose portal access immediately.'
        : 'Reactivate this member?'
    );
    if (!confirmed) return;

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('org_members')
      .update({ is_active: !currentlyActive })
      .eq('id', memberId);

    if (updateError) {
      alert('Failed to update member: ' + updateError.message);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const member = members.find((m) => m.id === memberId);
    await supabase.from('audit_log').insert({
      org_id: org.id,
      user_id: user?.id,
      action: `member.${action}`,
      entity_type: 'org_member',
      entity_id: memberId,
      metadata: { target_user: member?.user_id },
    });

    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, is_active: !currentlyActive } : m));
  }

  async function handleInvite() {
    if (!org || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteResult(null);

    const supabase = createClient();
    const tempPassword = generateTempPassword();

    // Create the auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: inviteEmail.trim(),
      password: tempPassword,
      options: { data: { org_id: org.id } },
    });

    if (signUpError) {
      setInviteError(signUpError.message);
      setInviting(false);
      return;
    }

    const newUserId = signUpData.user?.id;
    if (!newUserId) {
      setInviteError('Failed to create user account. The email may already be registered.');
      setInviting(false);
      return;
    }

    // Insert org_member record (profile will be created by user on first login)
    const { error: memberError } = await supabase.from('org_members').insert({
      org_id: org.id,
      user_id: newUserId,
      role: inviteRole,
      is_active: true,
    });

    if (memberError) {
      setInviteError('Account created but failed to assign role: ' + memberError.message);
      setInviting(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_log').insert({
      org_id: org.id,
      user_id: user?.id,
      action: 'member.invite',
      entity_type: 'org_member',
      metadata: { email: inviteEmail.trim(), role: inviteRole, invited_user_id: newUserId },
    });

    setInviteResult({ email: inviteEmail.trim(), tempPassword });
    setInviteEmail('');
    setInviting(false);
    fetchMembers();
  }

  function dismissInviteResult() {
    setInviteResult(null);
  }

  const displayMembers = members;

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
        Team Members
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', marginBottom: '32px' }}>
        Manage who has access to your organization and what role they hold.
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
          You have read-only access. Only admins can invite or modify members.
        </div>
      )}

      {/* Invite section — admin only */}
      {isAdmin && (
        <div style={{
          background: '#fff',
          border: '1px solid var(--g200, #E8E8E8)',
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--g800, #262626)', marginBottom: '16px' }}>
            Invite a New Member
          </h2>

          {inviteResult ? (
            <div style={{ background: 'var(--green-light, #F0FDF4)', border: '1px solid #86EFAC', borderRadius: '8px', padding: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--green, #16A34A)', margin: '0 0 8px' }}>
                Invite created for {inviteResult.email}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--g700, #404040)', margin: '0 0 4px' }}>
                Share these credentials with the new member:
              </p>
              <div style={{ background: '#fff', border: '1px solid #86EFAC', borderRadius: '6px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '13px', marginBottom: '12px' }}>
                Email: {inviteResult.email}<br />
                Temporary password: <strong>{inviteResult.tempPassword}</strong>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--g500, #737373)', margin: '0 0 12px' }}>
                The member must complete their profile on first login. They may also need to confirm their email.
              </p>
              <button
                onClick={dismissInviteResult}
                style={{ padding: '6px 14px', background: 'var(--green, #16A34A)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@organization.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: '0 0 160px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '6px', fontSize: '14px', background: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  style={{
                    padding: '8px 20px',
                    background: 'var(--blue, #3BA7C9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: inviting || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                    opacity: inviting || !inviteEmail.trim() ? 0.6 : 1,
                    flexShrink: 0,
                    alignSelf: 'flex-end',
                    marginBottom: '1px',
                  }}
                >
                  {inviting ? 'Creating…' : 'Send Invite'}
                </button>
              </div>
              {inviteError && (
                <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--red-light, #FEF2F2)', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', color: 'var(--red, #DC2626)' }}>
                  {inviteError}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Members table */}
      <div style={{ background: '#fff', border: '1px solid var(--g200, #E8E8E8)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--g400, #A3A3A3)', fontSize: '14px' }}>Loading members…</div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--red, #DC2626)', fontSize: '13px' }}>{error}</div>
        ) : displayMembers.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--g400, #A3A3A3)', fontSize: '14px' }}>No members found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--g50, #FAFAFA)', borderBottom: '1px solid var(--g200, #E8E8E8)' }}>
                {['Name', 'Email', 'Role', 'Status', 'Joined', ...(isAdmin ? ['Actions'] : [])].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--g500, #737373)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayMembers.map((member, i) => {
                const name = member.profiles?.full_name || '—';
                const email = member.profiles?.email || `(user ${member.user_id.slice(0, 8)}…)`;
                const joined = new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <tr key={member.id} style={{ borderBottom: i < displayMembers.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--g900, #171717)' }}>{name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--g500, #737373)' }}>{email}</td>
                    <td style={{ padding: '14px 16px' }}><RoleBadge role={member.role} /></td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: member.is_active ? 'var(--green-light, #F0FDF4)' : 'var(--g100, #F5F5F5)',
                        color: member.is_active ? 'var(--green, #16A34A)' : 'var(--g400, #A3A3A3)',
                      }}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--g500, #737373)' }}>{joined}</td>
                    {isAdmin && (
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select
                            value={member.role}
                            onChange={(e) => updateRole(member.id, e.target.value as OrgRole)}
                            style={{ padding: '4px 8px', border: '1px solid var(--g300, #D4D4D4)', borderRadius: '4px', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                          >
                            {ALL_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => toggleActive(member.id, member.is_active)}
                            style={{
                              padding: '4px 10px',
                              border: '1px solid var(--g300, #D4D4D4)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              background: '#fff',
                              color: member.is_active ? 'var(--rust, #C05A2C)' : 'var(--green, #16A34A)',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            {member.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
