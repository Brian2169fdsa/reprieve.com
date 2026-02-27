'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[REPrieve] Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-g50 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-10 h-10 border-2 border-blue-dark rounded-[6px] flex items-center justify-center text-xl font-bold font-serif text-blue-dark">
            R
          </div>
          <div className="text-lg font-bold text-g900 tracking-tight">REPrieve.ai</div>
        </div>

        <div className="text-5xl mb-4">⚠️</div>

        <h1 className="font-serif text-2xl font-bold text-g900 mb-3 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-g500 leading-relaxed mb-8">
          An unexpected error occurred. Our team has been notified. You can try again or return to the dashboard.
        </p>

        {error.digest && (
          <p className="text-[11px] text-g400 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-dark text-white rounded-[6px] text-sm font-semibold transition-colors hover:bg-blue border-0 cursor-pointer"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 bg-white text-g700 border border-g200 rounded-[6px] text-sm font-semibold no-underline transition-colors hover:bg-g100"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
