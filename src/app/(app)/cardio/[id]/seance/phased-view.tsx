import type { PhasedState, PhasedTimeline } from "@/lib/cardio/timeline"
import { formatClock } from "@/lib/cardio/format"
import { CountdownRing } from "./countdown-ring"

type Props = {
  state: PhasedState
  timeline: PhasedTimeline
}

export function PhasedView({ state, timeline }: Props) {
  const { phase, next } = state
  const progress = phase.durationMs > 0 ? state.phaseRemainingMs / phase.durationMs : 0
  const urgent = !state.finished && state.phaseRemainingMs <= 3000
  const globalProgress = timeline.totalMs > 0 ? 1 - state.totalRemainingMs / timeline.totalMs : 0

  return (
    <div className="space-y-6 text-center">
      {phase.minuteIndex !== null && timeline.minutes !== null && (
        <p className="text-sm font-semibold text-muted-foreground">
          Minute {phase.minuteIndex + 1} / {timeline.minutes}
        </p>
      )}

      <div className="flex justify-center">
        <CountdownRing
          progress={progress}
          label={formatClock(state.phaseRemainingMs, "down")}
          urgent={urgent}
        />
      </div>

      <div className="space-y-1">
        <div className="text-5xl" aria-hidden="true">{phase.image ?? "🔥"}</div>
        <h2 className="text-2xl font-bold">{phase.name}</h2>
        <p className="text-sm text-muted-foreground">
          {next ? `Ensuite : ${next.name}` : "Dernière étape"}
        </p>
      </div>

      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(globalProgress * 100)}%`,
              background: "linear-gradient(to right, #3F5EFB, #F50535)",
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          Reste {formatClock(state.totalRemainingMs, "down")}
        </p>
      </div>
    </div>
  )
}
