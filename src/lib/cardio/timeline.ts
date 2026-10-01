export type StepInput = {
  order: number
  name: string
  image: string | null
  durationSec: number | null
  reps: number | null
  distanceM: number | null
}

export type WodFormat = "CIRCUIT" | "AMRAP" | "EMOM" | "FOR_TIME"

export type WodForTimeline = {
  format: WodFormat
  durationMin: number
  steps: StepInput[]
}

export type Phase = {
  index: number
  stepIndex: number
  minuteIndex: number | null
  name: string
  image: string | null
  startMs: number
  durationMs: number
}

export type PhasedTimeline = {
  kind: "phased"
  format: "CIRCUIT" | "EMOM"
  phases: Phase[]
  totalMs: number
  minutes: number | null
}
export type CountdownTimeline = { kind: "countdown"; totalMs: number; roundTemplate: StepInput[] }
export type StopwatchTimeline = { kind: "stopwatch"; steps: StepInput[] }
export type Timeline = PhasedTimeline | CountdownTimeline | StopwatchTimeline

export type PhasedState = {
  kind: "phased"
  phaseIndex: number
  phase: Phase
  phaseRemainingMs: number
  totalRemainingMs: number
  next: Phase | null
  finished: boolean
}
export type CountdownState = { kind: "countdown"; totalRemainingMs: number; finished: boolean }
export type StopwatchState = { kind: "stopwatch"; elapsedMs: number }
export type TimelineState = PhasedState | CountdownState | StopwatchState

export type Clock = {
  startedAtMs: number
  pausedAtMs: number | null
  pausedTotalMs: number
}

export function buildTimeline(wod: WodForTimeline): Timeline {
  const steps = [...wod.steps].sort((a, b) => a.order - b.order)
  if (steps.length === 0) throw new Error("WOD sans étape")

  if (wod.format === "AMRAP") {
    return { kind: "countdown", totalMs: wod.durationMin * 60_000, roundTemplate: steps }
  }
  if (wod.format === "FOR_TIME") {
    return { kind: "stopwatch", steps }
  }

  const isEmom = wod.format === "EMOM"
  const passes = isEmom ? wod.durationMin : 1
  const phases: Phase[] = []
  let cursor = 0
  for (let pass = 0; pass < passes; pass++) {
    steps.forEach((step, stepIndex) => {
      if (step.durationSec === null) {
        throw new Error(`Étape sans durée dans un WOD ${wod.format}`)
      }
      const durationMs = step.durationSec * 1000
      phases.push({
        index: phases.length,
        stepIndex,
        minuteIndex: isEmom ? pass : null,
        name: step.name,
        image: step.image,
        startMs: cursor,
        durationMs,
      })
      cursor += durationMs
    })
  }
  return { kind: "phased", format: wod.format, phases, totalMs: cursor, minutes: isEmom ? passes : null }
}

export function getState(timeline: Timeline, elapsedMs: number): TimelineState {
  const elapsed = Math.max(0, elapsedMs)

  if (timeline.kind === "stopwatch") return { kind: "stopwatch", elapsedMs: elapsed }

  if (timeline.kind === "countdown") {
    const remaining = Math.max(0, timeline.totalMs - elapsed)
    return { kind: "countdown", totalRemainingMs: remaining, finished: remaining === 0 }
  }

  const index = timeline.phases.findIndex((p) => elapsed < p.startMs + p.durationMs)
  if (index === -1) {
    const last = timeline.phases[timeline.phases.length - 1]
    return {
      kind: "phased",
      phaseIndex: last.index,
      phase: last,
      phaseRemainingMs: 0,
      totalRemainingMs: 0,
      next: null,
      finished: true,
    }
  }
  const phase = timeline.phases[index]
  return {
    kind: "phased",
    phaseIndex: index,
    phase,
    phaseRemainingMs: phase.startMs + phase.durationMs - elapsed,
    totalRemainingMs: timeline.totalMs - elapsed,
    next: timeline.phases[index + 1] ?? null,
    finished: false,
  }
}

export function computeElapsedMs(clock: Clock, nowMs: number): number {
  const end = clock.pausedAtMs ?? nowMs
  return Math.max(0, end - clock.startedAtMs - clock.pausedTotalMs)
}

export function pauseClock(clock: Clock, nowMs: number): Clock {
  return clock.pausedAtMs === null ? { ...clock, pausedAtMs: nowMs } : clock
}

export function resumeClock(clock: Clock, nowMs: number): Clock {
  if (clock.pausedAtMs === null) return clock
  return { ...clock, pausedAtMs: null, pausedTotalMs: clock.pausedTotalMs + (nowMs - clock.pausedAtMs) }
}
