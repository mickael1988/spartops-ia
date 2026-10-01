import type { StopwatchState, StopwatchTimeline } from "@/lib/cardio/timeline"
import { formatClock, formatStepUnit } from "@/lib/cardio/format"

type Props = {
  state: StopwatchState
  timeline: StopwatchTimeline
  checkedSteps: number[]
  onToggleStep: (stepIndex: number) => void
}

export function ForTimeView({ state, timeline, checkedSteps, onToggleStep }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Chrono</p>
        <p role="timer" className="text-6xl font-mono font-bold tabular-nums">
          {formatClock(state.elapsedMs, "up")}
        </p>
      </div>

      <div className="space-y-2">
        {timeline.steps.map((step, stepIndex) => {
          const checked = checkedSteps.includes(stepIndex)
          return (
            <button
              key={step.order}
              type="button"
              onClick={() => onToggleStep(stepIndex)}
              aria-pressed={checked}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                checked
                  ? "border-primary/40 bg-primary/10 opacity-60"
                  : "bg-background/80 backdrop-blur-sm"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                  checked ? "border-primary bg-primary text-primary-foreground" : ""
                }`}
                aria-hidden="true"
              >
                {checked ? "✓" : ""}
              </span>
              <span className="text-2xl" aria-hidden="true">{step.image ?? "🔥"}</span>
              <span className="flex-1 text-sm font-medium">{step.name}</span>
              <span className="text-sm font-semibold tabular-nums">{formatStepUnit(step)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
