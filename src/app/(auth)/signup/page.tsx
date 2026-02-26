'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // 1. Create auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message ?? 'Failed to create account. Please try again.');
      setLoading(false);
      return;
    }

    const userId = signUpData.user.id;

    // 2. Create profile record
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      full_name: fullName,
      email,
    });

    if (profileError) {
      setError('Account created but profile setup failed. Please contact support.');
      setLoading(false);
      return;
    }

    // 3. Create organization
    const slug = slugify(orgName) || `org-${Date.now()}`;
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName, slug })
      .select('id')
      .single();

    if (orgError || !orgData) {
      setError('Account created but organization setup failed. Please contact support.');
      setLoading(false);
      return;
    }

    // 4. Link user to org as admin
    const { error: memberError } = await supabase.from('org_members').insert({
      org_id: orgData.id,
      user_id: userId,
      role: 'admin',
    });

    if (memberError) {
      setError('Organization created but membership setup failed. Please contact support.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D4D4D4',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#262626',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#404040',
    marginBottom: '6px',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h2 style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: '24px', fontWeight: '700',
          color: '#171717', marginBottom: '8px', letterSpacing: '-0.3px',
        }}>
          Create your account
        </h2>
        <p style={{ fontSize: '14px', color: '#737373' }}>
          Set up your REPrieve.ai compliance portal
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex',
        border: '1px solid #E8E8E8',
        borderRadius: '8px',
        padding: '4px',
        marginBottom: '28px',
        background: '#F5F5F5',
      }}>
        {(['signin', 'create'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              if (tab === 'signin') router.push('/login');
            }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              background: tab === 'create' ? '#ffffff' : 'transparent',
              color: tab === 'create' ? '#2A8BA8' : '#737373',
              boxShadow: tab === 'create' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      {/* Signup form */}
      <form onSubmit={handleSignup}>
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #DC2626',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#DC2626',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="fullName" style={labelStyle}>Full name</label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email" style={labelStyle}>Email address</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@yourorg.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="password" style={labelStyle}>Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="orgName" style={labelStyle}>Organization name</label>
          <input
            id="orgName"
            type="text"
            required
            autoComplete="organization"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Cholla Behavioral Health"
            style={inputStyle}
          />
          <p style={{ fontSize: '12px', color: '#A3A3A3', marginTop: '4px' }}>
            You&apos;ll be set as the admin and can invite team members later.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '11px 16px',
            background: loading ? '#A3A3A3' : '#2A8BA8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
            letterSpacing: '0.1px',
          }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      {/* Sign in link */}
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#737373', marginTop: '24px' }}>
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: '#2A8BA8', fontWeight: '600', textDecoration: 'none' }}
        >
          Sign in
        </Link>
      </p>

      {/* Footer help */}
      <div style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #E8E8E8',
        textAlign: 'center',
        fontSize: '12px',
        color: '#A3A3A3',
        lineHeight: '1.6',
      }}>
        Need help? Contact{' '}
        <a href="mailto:support@reprieve.ai" style={{ color: '#2A8BA8', textDecoration: 'none' }}>
          support@reprieve.ai
        </a>
        {' '}or call{' '}
        <a href="tel:+16025550100" style={{ color: '#2A8BA8', textDecoration: 'none' }}>
          (602) 555-0100
        </a>
      </div>
    </div>
  );
}
