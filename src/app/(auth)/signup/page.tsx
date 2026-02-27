'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type PasswordStrength = 'weak' | 'medium' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (password.length >= 12 && score >= 3) return 'strong';
  if (password.length >= 8 && score >= 2) return 'medium';
  return 'weak';
}

const strengthConfig: Record<PasswordStrength, { label: string; color: string; width: string }> = {
  weak: { label: 'Weak', color: 'bg-red', width: 'w-1/3' },
  medium: { label: 'Medium', color: 'bg-yellow', width: 'w-2/3' },
  strong: { label: 'Strong', color: 'bg-green', width: 'w-full' },
};

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;
  const strengthCfg = passwordStrength ? strengthConfig[passwordStrength] : null;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let supabase;
    try {
      supabase = createClient();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setLoading(false);
      return;
    }

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

    // Profile is auto-created by the handle_new_user trigger in the database.
    // Create org via API route which uses service-role key (bypasses RLS,
    // works even when email confirmation is required and session isn't active yet).
    const res = await fetch('/api/setup-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgName }),
    });
    const orgResult = await res.json();

    if (!res.ok) {
      // Non-fatal: account exists, user can create org from Settings
      if (res.status === 409) {
        // Already has an org — just navigate
      } else {
        setError(`Account created! But org setup failed: ${orgResult.error ?? 'unknown error'}. Go to Settings to finish setup.`);
        setLoading(false);
        return;
      }
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-bold text-g900 mb-2 tracking-tight">
          Create your account
        </h2>
        <p className="text-sm text-g500">
          Set up your REPrieve.ai compliance portal
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex border border-g200 rounded-lg p-1 mb-7 bg-g100">
        {(['signin', 'create'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              if (tab === 'signin') router.push('/login');
            }}
            className={[
              'flex-1 py-2 px-4 rounded-md text-[13px] font-semibold cursor-pointer transition-all',
              tab === 'create'
                ? 'bg-white text-blue-dark shadow-sm'
                : 'bg-transparent text-g500',
            ].join(' ')}
          >
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      {/* Signup form */}
      <form onSubmit={handleSignup}>
        {error && (
          <div className="bg-red-light border border-red rounded-[6px] px-3.5 py-2.5 text-[13px] text-red mb-5">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="fullName" className="block text-[13px] font-semibold text-g700 mb-1.5">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-3 py-2.5 border border-g300 rounded-[6px] text-sm text-g800 bg-white outline-none transition-colors focus:border-blue-dark focus:ring-2 focus:ring-blue-dark/10 placeholder:text-g400"
          />
        </div>

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
            placeholder="jane@yourorg.com"
            className="w-full px-3 py-2.5 border border-g300 rounded-[6px] text-sm text-g800 bg-white outline-none transition-colors focus:border-blue-dark focus:ring-2 focus:ring-blue-dark/10 placeholder:text-g400"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-[13px] font-semibold text-g700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full px-3 py-2.5 border border-g300 rounded-[6px] text-sm text-g800 bg-white outline-none transition-colors focus:border-blue-dark focus:ring-2 focus:ring-blue-dark/10 placeholder:text-g400"
          />
          {/* Password strength indicator */}
          {passwordStrength && strengthCfg && (
            <div className="mt-2">
              <div className="h-1 bg-g200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strengthCfg.color} ${strengthCfg.width}`}
                />
              </div>
              <p className="text-[12px] text-g500 mt-1">
                Password strength:{' '}
                <span className={
                  passwordStrength === 'strong' ? 'text-green font-semibold' :
                  passwordStrength === 'medium' ? 'text-yellow font-semibold' :
                  'text-red font-semibold'
                }>
                  {strengthCfg.label}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="orgName" className="block text-[13px] font-semibold text-g700 mb-1.5">
            Organization name
          </label>
          <input
            id="orgName"
            type="text"
            required
            autoComplete="organization"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Cholla Behavioral Health"
            className="w-full px-3 py-2.5 border border-g300 rounded-[6px] text-sm text-g800 bg-white outline-none transition-colors focus:border-blue-dark focus:ring-2 focus:ring-blue-dark/10 placeholder:text-g400"
          />
          <p className="text-[12px] text-g400 mt-1">
            You&apos;ll be set as the admin and can invite team members later.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[11px] px-4 bg-blue-dark text-white border-0 rounded-[6px] text-sm font-semibold cursor-pointer transition-colors tracking-[0.1px] hover:bg-blue disabled:bg-g400 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      {/* Sign in link */}
      <p className="text-center text-[13px] text-g500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-dark font-semibold no-underline hover:text-blue transition-colors">
          Sign in
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
