'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#737373' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [activeTab, setActiveTab] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
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
          Welcome back
        </h2>
        <p style={{ fontSize: '14px', color: '#737373' }}>
          Sign in to your REPrieve.ai portal
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
              if (tab === 'create') {
                router.push('/signup');
              } else {
                setActiveTab(tab);
              }
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
              background: activeTab === tab ? '#ffffff' : 'transparent',
              color: activeTab === tab ? '#2A8BA8' : '#737373',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      {/* Sign in form */}
      <form onSubmit={handleSignIn}>
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
          <label htmlFor="email" style={labelStyle}>Email address</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourorg.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label htmlFor="password" style={labelStyle}>Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: '14px', height: '14px', accentColor: '#2A8BA8', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: '#525252' }}>Remember me</span>
          </label>
          <a
            href="#"
            style={{
              fontSize: '13px',
              color: '#2A8BA8',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            Forgot password?
          </a>
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
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: '24px 0',
      }}>
        <div style={{ flex: 1, height: '1px', background: '#E8E8E8' }} />
        <span style={{ fontSize: '12px', color: '#A3A3A3', fontWeight: '500' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: '#E8E8E8' }} />
      </div>

      {/* Sign up link */}
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#737373' }}>
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          style={{ color: '#2A8BA8', fontWeight: '600', textDecoration: 'none' }}
        >
          Create one now
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
