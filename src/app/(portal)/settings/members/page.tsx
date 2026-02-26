'use client';

import { useState } from 'react';
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

interface Member {
  id: string;
  name: string;
  email: string;
  role: OrgRole;
  isActive: boolean;
  joinedDate: string;
}

const SEED_MEMBERS: Member[] = [
  { id: '1', name: 'Wayne Giles',     email: 'wayne@chollabh.com', role: 'admin',      isActive: true, joinedDate: 'Jan 15, 2026' },
  { id: '2', name: 'Sarah Chen',      email: 'sarah@chollabh.com', role: 'compliance', isActive: true, joinedDate: 'Jan 15, 2026' },
  { id: '3', name: 'James Williams',  email: 'james@chollabh.com', role: 'clinical',   isActive: true, joinedDate: 'Jan 20, 2026' },
  { id: '4', name: 'Maria Rodriguez', email: 'maria@chollabh.com', role: 'ops',        isActive: true, joinedDate: 'Feb 1, 2026'  },
  { id: '5', name: 'David Kim',       email: 'david@chollabh.com', role: 'billing',    isActive: true, joinedDate: 'Feb 1, 2026'  },
];

function RoleBadge({ role }: { role: OrgRole }) {
  const { bg, color } = ROLE_COLORS[role];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      background: bg,
      color,
    }}>
      {ROLE_LABELS[role]}
    </span>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>(SEED_MEMBERS);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('clinical');
  const [inviteSent, setInviteSent] = useState(false);

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
      setInviteEmail('');
    }, 2000);
  }

  function updateRole(id: string, role: OrgRole) {
    setMembers((m) => m.map((mem) => mem.id === id ? { ...mem, role } : mem));
  }

  function toggleActive(id: string) {
    setMembers((m) => m.map((mem) => mem.id === id ? { ...mem, isActive: !mem.isActive } : mem));
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-source-serif-4, serif)', fontSize: '24px', fontWeight: 600, color: 'var(--g900, #171717)', marginBottom: '4px' }}>
        Team Members
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--g500, #737373)', marginBottom: '32px' }}>
        Manage who has access to your organization and what role they hold.
      </p>

      {/* Invite section */}
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
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@chollabh.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--g300, #D4D4D4)',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: '0 0 160px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--g600, #525252)', marginBottom: '6px' }}>
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--g300, #D4D4D4)',
                borderRadius: '6px',
                fontSize: '14px',
                background: '#fff',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleInvite}
            style={{
              padding: '8px 20px',
              background: inviteSent ? 'var(--green, #16A34A)' : 'var(--blue, #3BA7C9)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              alignSelf: 'flex-end',
              marginBottom: '1px',
            }}
          >
            {inviteSent ? 'Invite Sent!' : 'Send Invite'}
          </button>
        </div>
      </div>

      {/* Members table */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--g200, #E8E8E8)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--g50, #FAFAFA)', borderBottom: '1px solid var(--g200, #E8E8E8)' }}>
              {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} style={{
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--g500, #737373)',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member, i) => (
              <tr key={member.id} style={{ borderBottom: i < members.length - 1 ? '1px solid var(--g100, #F5F5F5)' : 'none' }}>
                <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--g900, #171717)' }}>
                  {member.name}
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--g500, #737373)' }}>
                  {member.email}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <RoleBadge role={member.role} />
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: member.isActive ? 'var(--green-light, #F0FDF4)' : 'var(--g100, #F5F5F5)',
                    color: member.isActive ? 'var(--green, #16A34A)' : 'var(--g400, #A3A3A3)',
                  }}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--g500, #737373)' }}>
                  {member.joinedDate}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={member.role}
                      onChange={(e) => updateRole(member.id, e.target.value as OrgRole)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid var(--g300, #D4D4D4)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => toggleActive(member.id)}
                      style={{
                        padding: '4px 10px',
                        border: '1px solid var(--g300, #D4D4D4)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: '#fff',
                        color: member.isActive ? 'var(--rust, #C05A2C)' : 'var(--green, #16A34A)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {member.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
