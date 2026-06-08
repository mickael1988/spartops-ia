export default function AgendaLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-56 rounded bg-muted animate-pulse" />
      </div>
      <div className="rounded-xl border bg-card p-4">
        {/* Calendar skeleton */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-5 w-8 rounded bg-muted animate-pulse" />
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          <div className="h-5 w-8 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
