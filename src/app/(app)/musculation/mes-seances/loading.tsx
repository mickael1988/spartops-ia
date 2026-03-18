export default function MesSeancesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="h-9 w-44 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-56 rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
