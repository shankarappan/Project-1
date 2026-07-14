export default function GroupLoading() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="h-16 border-b border-border/80 bg-card" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
