'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Sign out and redirect to login with success message
    await supabase.auth.signOut();
    router.push('/login?message=password_reset');
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-bold text-g900 mb-2 tracking-tight">
          Choose a new password
        </h2>
        <p className="text-sm text-g500">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-light border border-red rounded-[6px] px-3.5 py-2.5 text-[13px] text-red mb-5">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="password" className="block text-[13px] font-semibold text-g700 mb-1.5">
            New password
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
        </div>

        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-[13px] font-semibold text-g700 mb-1.5">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className={[
              'w-full px-3 py-2.5 border rounded-[6px] text-sm text-g800 bg-white outline-none transition-colors placeholder:text-g400',
              confirmPassword.length > 0 && confirmPassword !== password
                ? 'border-red focus:border-red focus:ring-2 focus:ring-red/10'
                : 'border-g300 focus:border-blue-dark focus:ring-2 focus:ring-blue-dark/10',
            ].join(' ')}
          />
          {confirmPassword.length > 0 && confirmPassword !== password && (
            <p className="text-[12px] text-red mt-1">Passwords do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[11px] px-4 bg-blue-dark text-white border-0 rounded-[6px] text-sm font-semibold cursor-pointer transition-colors tracking-[0.1px] hover:bg-blue disabled:bg-g400 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
