export default function CardioWodLoading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
          <div className="h-9 w-56 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="h-4 w-full max-w-md rounded bg-muted animate-pulse" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-20 rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
      {/* Étapes */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 rounded bg-muted animate-pulse" />
              <div className="h-3 w-14 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-14 w-full rounded-2xl bg-muted animate-pulse" />
    </div>
  )
}
