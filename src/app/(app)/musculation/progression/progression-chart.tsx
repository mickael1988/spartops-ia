"use client"

export type ChartEntry = {
  estimatedMax: number
  recordedAt: string // ISO string
}

export function ProgressionChart({ history }: { history: ChartEntry[] }) {
  const W = 240
  const H = 80
  const PAD = { top: 14, right: 8, bottom: 20, left: 30 }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
        Aucune donnée
      </div>
    )
  }

  const values = history.map(e => e.estimatedMax)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  function xPos(i: number) {
    return PAD.left + (history.length === 1 ? chartW / 2 : (i / (history.length - 1)) * chartW)
  }
  function yPos(v: number) {
    return PAD.top + chartH - ((v - minVal) / range) * chartH
  }

  const points = history.map((e, i) => ({ x: xPos(i), y: yPos(e.estimatedMax) }))
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")

  function shortDate(iso: string) {
    const d = new Date(iso)
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      <text x={PAD.left - 4} y={PAD.top + 4} fontSize="9" fill="#6b7280" textAnchor="end">{maxVal}</text>
      {minVal !== maxVal && (
        <text x={PAD.left - 4} y={PAD.top + chartH} fontSize="9" fill="#6b7280" textAnchor="end">{minVal}</text>
      )}
      {history.length > 1 && (
        <path d={linePath} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
      )}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#f97316" />
          <text x={p.x} y={Math.max(p.y - 5, PAD.top + 4)} fontSize="8" fill="#f97316" textAnchor="middle">
            {history[i].estimatedMax}
          </text>
          <text x={p.x} y={H - 2} fontSize="8" fill="#6b7280" textAnchor="middle">
            {shortDate(history[i].recordedAt)}
          </text>
        </g>
      ))}
    </svg>
  )
}
