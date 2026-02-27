'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          ✉️
        </div>
        <h2 className="font-serif text-2xl font-bold text-g900 mb-2 tracking-tight">
          Check your email
        </h2>
        <p className="text-sm text-g500 mb-6 leading-relaxed">
          We sent a password reset link to <strong className="text-g700">{email}</strong>.
          Check your inbox and follow the link to reset your password.
        </p>
        <p className="text-[13px] text-g400">
          Didn&apos;t receive it?{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-blue-dark font-medium hover:text-blue transition-colors"
          >
            Try again
          </button>
        </p>
        <div className="mt-8 pt-5 border-t border-g200">
          <Link
            href="/login"
            className="text-[13px] text-blue-dark font-semibold no-underline hover:text-blue transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-bold text-g900 mb-2 tracking-tight">
          Reset your password
        </h2>
        <p className="text-sm text-g500">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-light border border-red rounded-[6px] px-3.5 py-2.5 text-[13px] text-red mb-5">
            {error}
          </div>
        )}

        <div className="mb-6">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[11px] px-4 bg-blue-dark text-white border-0 rounded-[6px] text-sm font-semibold cursor-pointer transition-colors tracking-[0.1px] hover:bg-blue disabled:bg-g400 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <div className="mt-8 pt-5 border-t border-g200 text-center">
        <Link
          href="/login"
          className="text-[13px] text-blue-dark font-semibold no-underline hover:text-blue transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
