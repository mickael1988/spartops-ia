export default function StatsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="h-9 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-56 rounded bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-7 w-16 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-xl border bg-card animate-pulse" />
    </div>
  )
}
