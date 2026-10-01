import type { CountdownState, CountdownTimeline } from "@/lib/cardio/timeline"
import { formatClock, formatStepUnit } from "@/lib/cardio/format"

type Props = {
  state: CountdownState
  timeline: CountdownTimeline
  roundsCompleted: number
  onAddRound: () => void
  onRemoveRound: () => void
}

export function AmrapView({ state, timeline, roundsCompleted, onAddRound, onRemoveRound }: Props) {
  const urgent = !state.finished && state.totalRemainingMs <= 10000

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Temps restant</p>
        <p
          role="timer"
          className={`text-6xl font-mono font-bold tabular-nums ${urgent ? "text-red-500" : ""}`}
        >
          {formatClock(state.totalRemainingMs, "down")}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">Un tour :</p>
        {timeline.roundTemplate.map((step) => (
          <div
            key={step.order}
            className="flex items-center gap-3 rounded-xl border bg-background/80 backdrop-blur-sm px-4 py-3"
          >
            <span className="text-2xl" aria-hidden="true">{step.image ?? "🔥"}</span>
            <p className="flex-1 text-sm font-medium">{step.name}</p>
            <p className="text-sm font-semibold tabular-nums">{formatStepUnit(step)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          Tours terminés :{" "}
          <strong className="text-2xl tabular-nums text-foreground">{roundsCompleted}</strong>
        </p>
        <button
          type="button"
          onClick={onAddRound}
          className="w-full rounded-2xl py-5 text-xl font-bold text-white transition-transform active:scale-[0.98]"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          +1 tour
        </button>
        <button
          type="button"
          onClick={onRemoveRound}
          disabled={roundsCompleted === 0}
          className="px-4 py-3 text-xs text-muted-foreground underline disabled:opacity-40"
        >
          Retirer un tour
        </button>
      </div>
    </div>
  )
}
