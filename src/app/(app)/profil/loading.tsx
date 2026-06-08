export default function ProfilLoading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
      <div className="rounded-xl border bg-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
