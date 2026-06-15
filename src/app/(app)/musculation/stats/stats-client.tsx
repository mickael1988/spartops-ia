"use client"

import type { StatsData, WeeklyVolume } from "./page"

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function VolumeBarChart({ weeks }: { weeks: WeeklyVolume[] }) {
  const W = 320
  const H = 100
  const PAD = { top: 8, right: 4, bottom: 20, left: 4 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVol = Math.max(...weeks.map((w) => w.volume), 1)
  const barW = Math.floor(chartW / weeks.length) - 3

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      {weeks.map((week, i) => {
        const x = PAD.left + i * (chartW / weeks.length) + 1.5
        const barH = week.volume > 0 ? Math.max(4, (week.volume / maxVol) * chartH) : 2
        const y = PAD.top + chartH - barH
        const isCurrentWeek = i === weeks.length - 1

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill={isCurrentWeek ? "#f97316" : "#f97316"}
              opacity={isCurrentWeek ? 1 : 0.35 + (i / weeks.length) * 0.5}
            />
            {week.volume > 0 && (
              <text
                x={x + barW / 2}
                y={y - 3}
                fontSize="7"
                fill="#f97316"
                textAnchor="middle"
                opacity={isCurrentWeek ? 1 : 0.7}
              >
                {week.volume >= 1000
                  ? `${(week.volume / 1000).toFixed(1)}t`
                  : `${week.volume}`}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H - 2}
              fontSize="7.5"
              fill="#6b7280"
              textAnchor="middle"
            >
              {week.weekLabel}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub?: string
  icon: string
}) {
  return (
    <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-4 space-y-1">
      <p className="text-xl">{icon}</p>
      <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function StatsClient({ stats }: { stats: StatsData }) {
  const { streak, totalWorkouts, totalVolume, favoriteExercise, weeklyVolumes } = stats

  const volumeDisplay =
    totalVolume >= 1000000
      ? `${(totalVolume / 1000000).toFixed(1)}M`
      : totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(1)}k`
      : `${totalVolume}`

  const hasAnyVolume = weeklyVolumes.some((w) => w.volume > 0)

  return (
    <div className="space-y-6">
      {/* Grille de stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon="🔥"
          label="Jours de suite"
          value={streak === 0 ? "—" : String(streak)}
          sub={streak > 0 ? `Série en cours` : "Commence aujourd'hui !"}
        />
        <StatCard
          icon="💪"
          label="Séances terminées"
          value={String(totalWorkouts)}
          sub={totalWorkouts === 0 ? "Aucune encore" : undefined}
        />
        <StatCard
          icon="⚡"
          label="kg soulevés (total)"
          value={totalVolume === 0 ? "—" : `${volumeDisplay} kg`}
        />
        <StatCard
          icon="🏋️"
          label="Exercice favori"
          value={favoriteExercise?.name.split(" ")[0] ?? "—"}
          sub={
            favoriteExercise
              ? `${favoriteExercise.name} · ${favoriteExercise.count} séries`
              : "Pas encore de données"
          }
        />
      </div>

      {/* Graphique volume hebdomadaire */}
      <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">Volume hebdomadaire</p>
          <p className="text-xs text-muted-foreground">kg soulevés · 8 dernières semaines</p>
        </div>
        {hasAnyVolume ? (
          <VolumeBarChart weeks={weeklyVolumes} />
        ) : (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            Aucune donnée — termine ta première séance !
          </div>
        )}
      </div>
    </div>
  )
}
