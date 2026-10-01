export default function CardioLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-44 rounded bg-muted animate-pulse" />
      </div>
      {/* Onglets */}
      <div className="flex gap-2">
        <div className="h-9 w-28 rounded-full bg-muted animate-pulse" />
        <div className="h-9 w-28 rounded-full bg-muted animate-pulse" />
      </div>
      {/* Filtres */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-8 w-20 rounded-full bg-muted animate-pulse" />
            ))}
          </div>
        ))}
      </div>
      {/* Cartes WOD */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
              <div className="h-5 w-36 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
