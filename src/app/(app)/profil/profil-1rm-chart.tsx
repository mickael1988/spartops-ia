"use client"

import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ExerciseRecord, OneRepMaxEntry } from "@/app/(app)/musculation/progression/page"

type Props = {
  exercises: ExerciseRecord[]
}

const EXERCISE_IMAGES: Record<string, string> = {
  "Squat": "/groups/squat.png",
  "Développé couché": "/groups/developpe-couche.png",
  "Soulevé de terre": "/groups/SDT.png",
}

function ProgressionChart({ history }: { history: OneRepMaxEntry[] }) {
  const W = 240
  const H = 80
  const PAD = { top: 14, right: 8, bottom: 20, left: 30 }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic">
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

export function Profil1RMChart({ exercises }: Props) {
  const hasData = exercises.some(ex => ex.history.length > 0)

  return (
    <Card className="bg-background/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Progression 1RM</CardTitle>
          </div>
          <Link
            href="/musculation/progression"
            className="text-xs font-medium text-orange-500 hover:underline"
          >
            Voir tout →
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun 1RM enregistré pour le moment.
            </p>
            <Link
              href="/musculation/progression"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(to right, #ea580c, #f97316)" }}
            >
              Faire mon premier test
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {exercises.map(ex => {
              const image = EXERCISE_IMAGES[ex.name]
              return (
                <div key={ex.id} className="rounded-lg border overflow-hidden">
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={ex.name} className="w-full h-auto" />
                  )}
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{ex.name}</p>
                      <span className="text-sm font-bold text-orange-500">
                        {ex.bestMax !== null ? `${ex.bestMax} kg` : "— kg"}
                      </span>
                    </div>
                    <ProgressionChart history={ex.history} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
