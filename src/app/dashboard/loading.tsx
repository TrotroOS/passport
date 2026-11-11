export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-14 border-b bg-white sm:h-16" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8 h-10 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-slate-50" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-slate-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
