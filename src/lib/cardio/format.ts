import type { StepInput } from "./timeline"

export function formatClock(ms: number, mode: "down" | "up"): string {
  const safe = Math.max(0, ms)
  const totalSeconds = mode === "down" ? Math.ceil(safe / 1000) : Math.floor(safe / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatStepUnit(step: Pick<StepInput, "durationSec" | "reps" | "distanceM">): string {
  if (step.durationSec !== null) return `${step.durationSec}s`
  if (step.distanceM !== null) return `${step.distanceM.toLocaleString("fr-FR")} m`
  return `${step.reps} reps`
}
