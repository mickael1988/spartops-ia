"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type WeekData = {
  mois: "precedent" | "courant"
  weekIndex: number   // 1 à 5
  count: number
  isCurrent: boolean  // semaine en cours (hachuré)
}

type Props = {
  data: WeekData[]
  labelPrecedent: string  // ex : "Février"
  labelCourant: string    // ex : "Mars"
  periode: string         // ex : "Fév — Mar 2026"
}

const BAR_WIDTH = 18
const BAR_GAP = 4
const GROUP_GAP = 24
const CHART_HEIGHT = 100
const MAX_WEEKS = 5

export function ProfilActivityChart({ data, labelPrecedent, labelCourant, periode }: Props) {
  const precedent = data.filter(d => d.mois === "precedent")
  const courant   = data.filter(d => d.mois === "courant")

  const maxCount = Math.max(1, ...data.map(d => d.count))

  const groupWidth = MAX_WEEKS * (BAR_WIDTH + BAR_GAP) - BAR_GAP
  const svgWidth   = groupWidth * 2 + GROUP_GAP + 1
  const svgHeight  = CHART_HEIGHT + 20  // 20px pour les labels de mois

  function barHeight(count: number) {
    return (count / maxCount) * CHART_HEIGHT
  }

  function renderGroup(weeks: WeekData[], offsetX: number, isCourant: boolean) {
    return Array.from({ length: MAX_WEEKS }, (_, i) => {
      const week  = weeks.find(w => w.weekIndex === i + 1)
      const count = week?.count ?? 0
      const h = barHeight(count)
      const x = offsetX + i * (BAR_WIDTH + BAR_GAP)
      const y = CHART_HEIGHT - h
      const minH = count > 0 ? 4 : 0

      if (week?.isCurrent) {
        return (
          <g key={i}>
            <rect x={x} y={y} width={BAR_WIDTH} height={Math.max(h, minH)}
              fill="url(#hatch)"
              rx={3} ry={3}
              stroke="#f97316" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 2"
            />
            {count > 0 && (
              <text x={x + BAR_WIDTH / 2} y={y - 4} textAnchor="middle"
                fontSize="9" fill="#9ca3af">{count}</text>
            )}
          </g>
        )
      }

      if (isCourant) {
        return (
          <g key={i}>
            <rect x={x} y={y} width={BAR_WIDTH} height={Math.max(h, minH)}
              fill={count > 0 ? "url(#grad-courant)" : "#1f1f1f"}
              rx={3} ry={3}
            />
            {count > 0 && (
              <text x={x + BAR_WIDTH / 2} y={y - 4} textAnchor="middle"
                fontSize="9" fill="#f97316">{count}</text>
            )}
          </g>
        )
      }

      // Mois précédent
      return (
        <g key={i}>
          <rect x={x} y={y} width={BAR_WIDTH} height={Math.max(h, minH)}
            fill={count > 0 ? "#7c3d12" : "#1f1f1f"}
            fillOpacity={count > 0 ? 0.8 : 1}
            rx={3} ry={3}
          />
          {count > 0 && (
            <text x={x + BAR_WIDTH / 2} y={y - 4} textAnchor="middle"
              fontSize="9" fill="#9ca3af">{count}</text>
          )}
        </g>
      )
    })
  }

  const offsetCourant = groupWidth + GROUP_GAP + 1

  return (
    <Card className="bg-background/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Activité</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">{periode}</span>
        </div>
        <p className="text-xs text-muted-foreground">Séances complétées par semaine</p>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            width="100%"
            style={{ minWidth: svgWidth }}
          >
            {/* Defs uniques pour toute la figure */}
            <defs>
              <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.35"/>
              </pattern>
              <linearGradient id="grad-courant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c"/>
                <stop offset="100%" stopColor="#f97316"/>
              </linearGradient>
            </defs>

            {/* Lignes de grille horizontales */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line key={i}
                x1={0} y1={CHART_HEIGHT - ratio * CHART_HEIGHT}
                x2={svgWidth} y2={CHART_HEIGHT - ratio * CHART_HEIGHT}
                stroke="#1f1f1f" strokeWidth="1"
              />
            ))}

            {/* Barres mois précédent */}
            {renderGroup(precedent, 0, false)}

            {/* Séparateur vertical */}
            <line
              x1={groupWidth + GROUP_GAP / 2} y1={0}
              x2={groupWidth + GROUP_GAP / 2} y2={CHART_HEIGHT}
              stroke="#2a2a2a" strokeWidth="1"
            />

            {/* Barres mois en cours */}
            {renderGroup(courant, offsetCourant, true)}

            {/* Label mois précédent */}
            <text
              x={groupWidth / 2} y={CHART_HEIGHT + 14}
              textAnchor="middle" fontSize="10" fill="#6b7280"
            >
              {labelPrecedent}
            </text>

            {/* Label mois en cours */}
            <text
              x={offsetCourant + groupWidth / 2} y={CHART_HEIGHT + 14}
              textAnchor="middle" fontSize="10" fill="#f97316"
            >
              {labelCourant}
            </text>
          </svg>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#7c3d12] opacity-80"/>
            Mois précédent
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-amber-400 to-orange-500"/>
            Mois en cours
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm border border-dashed border-orange-500/50 bg-orange-500/10"/>
            Semaine en cours
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
