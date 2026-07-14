export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="h-16 border-b border-border/80 bg-card" />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
