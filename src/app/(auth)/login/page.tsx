'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-10 text-g500">Loading...</div>}>
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

    window.location.href = redirectTo;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-bold text-g900 mb-2 tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm text-g500">
          Sign in to your REPrieve.ai portal
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex border border-g200 rounded-lg p-1 mb-7 bg-g100">
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
            className={[
              'flex-1 py-2 px-4 rounded-md text-[13px] font-semibold cursor-pointer transition-all',
              activeTab === tab
                ? 'bg-white text-blue-dark shadow-sm'
                : 'bg-transparent text-g500',
            ].join(' ')}
          >
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      {/* Sign in form */}
      <form onSubmit={handleSignIn}>
        {error && (
          <div className="bg-red-light border border-red rounded-[6px] px-3.5 py-2.5 text-[13px] text-red mb-5">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="block text-[13px] font-semibold text-g700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourorg.com"
            className="w-full px-3 py-2.5 border border-g300 rounded-[6px] text-sm text-g800 bg-white outline-none transition-colors focus:border-blue-dark focus:ring-2 focus:ring-blue-dark/10 placeholder:text-g400"
          />
        </div>

        <div className="mb-2">
          <label htmlFor="password" className="block text-[13px] font-semibold text-g700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2.5 border border-g300 rounded-[6px] text-sm text-g800 bg-white outline-none transition-colors focus:border-blue-dark focus:ring-2 focus:ring-blue-dark/10 placeholder:text-g400"
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-dark cursor-pointer"
            />
            <span className="text-[13px] text-g600">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-[13px] text-blue-dark font-medium hover:text-blue transition-colors no-underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[11px] px-4 bg-blue-dark text-white border-0 rounded-[6px] text-sm font-semibold cursor-pointer transition-colors tracking-[0.1px] hover:bg-blue disabled:bg-g400 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-g200" />
        <span className="text-[12px] text-g400 font-medium">or</span>
        <div className="flex-1 h-px bg-g200" />
      </div>

      {/* Sign up link */}
      <p className="text-center text-[13px] text-g500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-blue-dark font-semibold no-underline hover:text-blue transition-colors">
          Create one now
        </Link>
      </p>

      {/* Footer help */}
      <div className="mt-10 pt-5 border-t border-g200 text-center text-[12px] text-g400 leading-relaxed">
        Need help? Contact{' '}
        <a href="mailto:support@reprieve.ai" className="text-blue-dark no-underline hover:text-blue transition-colors">
          support@reprieve.ai
        </a>
        {' '}or call{' '}
        <a href="tel:+16025550100" className="text-blue-dark no-underline hover:text-blue transition-colors">
          (602) 555-0100
        </a>
      </div>
    </div>
  );
}
