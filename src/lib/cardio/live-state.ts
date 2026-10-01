import { LOCAL_SNAPSHOT_MAX_AGE_MS } from "./limits"

export type LiveSnapshot = {
  localSessionId: string
  startedAtMs: number
  pausedAtMs: number | null
  pausedTotalMs: number
  roundsCompleted: number
  checkedSteps: number[]
  finished: { atMs: number; elapsedMs: number } | null
}

const KEY_PREFIX = "cardio-live:v1:"

function isFinished(value: unknown): value is { atMs: number; elapsedMs: number } {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.atMs === "number" && typeof v.elapsedMs === "number"
}

function isSnapshot(value: unknown): value is LiveSnapshot {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.localSessionId === "string" &&
    typeof v.startedAtMs === "number" &&
    (v.pausedAtMs === null || typeof v.pausedAtMs === "number") &&
    typeof v.pausedTotalMs === "number" &&
    typeof v.roundsCompleted === "number" &&
    Array.isArray(v.checkedSteps) &&
    v.checkedSteps.every((n) => typeof n === "number") &&
    (v.finished === null || isFinished(v.finished))
  )
}

export function loadLiveState(programId: string): LiveSnapshot | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + programId)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSnapshot(parsed)) return null
    if (Date.now() - parsed.startedAtMs > LOCAL_SNAPSHOT_MAX_AGE_MS) {
      window.localStorage.removeItem(KEY_PREFIX + programId)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveLiveState(programId: string, snapshot: LiveSnapshot): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY_PREFIX + programId, JSON.stringify(snapshot))
  } catch {
    // stockage indisponible : la séance continue, sans reprise possible
  }
}

export function clearLiveState(programId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(KEY_PREFIX + programId)
  } catch {
    // ignoré
  }
}
