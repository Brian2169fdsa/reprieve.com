import Link from 'next/link';

export default function NotFound() {
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

        {/* 404 */}
        <div className="text-7xl font-bold text-g200 font-serif mb-4 leading-none">404</div>

        <h1 className="font-serif text-2xl font-bold text-g900 mb-3 tracking-tight">
          Page not found
        </h1>
        <p className="text-sm text-g500 leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to access it.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-dark text-white rounded-[6px] text-sm font-semibold no-underline transition-colors hover:bg-blue"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center px-5 py-2.5 bg-white text-g700 border border-g200 rounded-[6px] text-sm font-semibold no-underline transition-colors hover:bg-g100"
          >
            Back to Home
          </Link>
        </div>

        <p className="mt-6 text-xs text-g400">
          If you believe this is an error, contact your administrator.
        </p>
      </div>
    </div>
  );
}
