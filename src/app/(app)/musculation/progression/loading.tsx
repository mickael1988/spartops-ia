export default function ProgressionLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="h-9 w-52 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted animate-pulse" />
      </div>
      {/* Banner */}
      <div className="rounded-xl border bg-muted/50 px-4 py-3 h-12 animate-pulse" />
      {/* 3 exercise cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex justify-between">
              <div className="h-5 w-28 rounded bg-muted animate-pulse" />
              <div className="h-6 w-16 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-20 rounded bg-muted/50 animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-9 w-full rounded-lg bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
