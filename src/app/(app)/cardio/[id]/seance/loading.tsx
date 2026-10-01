export default function CardioSeanceLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-6 w-44 rounded bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl border bg-card animate-pulse" />
        ))}
      </div>
      <div className="h-16 w-full rounded-2xl bg-muted animate-pulse" />
    </div>
  )
}
