export default function PortalLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      {/* Page title skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-g200 rounded-[6px]" />
        <div className="h-9 w-28 bg-g200 rounded-[6px]" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-g200 rounded-[10px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-g200 rounded" />
              <div className="h-8 w-8 bg-g200 rounded-lg" />
            </div>
            <div className="h-8 w-16 bg-g200 rounded" />
            <div className="h-3 w-32 bg-g100 rounded" />
          </div>
        ))}
      </div>

      {/* Content rows skeleton */}
      <div className="bg-white border border-g200 rounded-[10px] overflow-hidden">
        <div className="px-4 py-3 border-b border-g100">
          <div className="h-5 w-36 bg-g200 rounded" />
        </div>
        <div className="divide-y divide-g100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              <div className="h-4 w-4 bg-g200 rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-g200 rounded" style={{ width: `${50 + (i * 8) % 35}%` }} />
                <div className="h-3 bg-g100 rounded w-32" />
              </div>
              <div className="h-6 w-16 bg-g100 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Secondary content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-g200 rounded-[10px] overflow-hidden">
            <div className="px-4 py-3 border-b border-g100">
              <div className="h-5 w-28 bg-g200 rounded" />
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-g200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-g200 rounded" style={{ width: `${40 + (j * 15) % 40}%` }} />
                    <div className="h-3 bg-g100 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
