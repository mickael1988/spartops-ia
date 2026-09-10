import {
  offlineDb,
  type LocalSetLog,
  type OutboxEntry,
  type SetTypeOffline,
} from "./db"
import {
  startWorkout,
  completeSet,
  finishWorkout,
  rateAndFinishWorkout,
} from "@/app/(app)/musculation/seance/actions"

type CompleteSetPayload = {
  workoutExerciseId: string
  reps: number
  weight: number | null
  setType: SetTypeOffline
  rpe: number | null
}

type StartWorkoutPayload = { workoutId: string }
type FinishWorkoutPayload = { workoutId: string }
type RateAndFinishWorkoutPayload = { workoutId: string; rating: number | null; comment: string }

const listeners = new Set<() => void>()

export function onOutboxChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((l) => l())
}

export async function ensureLocalWorkout(workout: {
  id: string
  name: string
  exercises: { id: string; exerciseId: string; sets: number; restSeconds: number }[]
}): Promise<void> {
  const existing = await offlineDb.localWorkouts.get(workout.id)
  if (existing) return
  await offlineDb.localWorkouts.add({
    workoutId: workout.id,
    name: workout.name,
    exercises: workout.exercises.map((ex) => ({
      workoutExerciseId: ex.id,
      exerciseId: ex.exerciseId,
      sets: ex.sets,
      restSeconds: ex.restSeconds,
    })),
  })
}

export function getUnsyncedSetLogs(workoutId: string): Promise<LocalSetLog[]> {
  return offlineDb.localSetLogs.where("workoutId").equals(workoutId).sortBy("setNumber")
}

export function getPendingCount(workoutId: string): Promise<number> {
  return offlineDb.outbox.where("workoutId").equals(workoutId).count()
}

async function enqueue(workoutId: string, actionType: OutboxEntry["actionType"], payload: unknown): Promise<string> {
  const outboxId = crypto.randomUUID()
  await offlineDb.outbox.add({
    outboxId,
    workoutId,
    actionType,
    payload,
    status: "pending",
    createdAt: new Date().toISOString(),
  })
  notify()
  void drainOutbox()
  return outboxId
}

export async function queueStartWorkout(workoutId: string): Promise<void> {
  await enqueue(workoutId, "startWorkout", { workoutId } satisfies StartWorkoutPayload)
}

export async function queueCompleteSet(
  workoutId: string,
  workoutExerciseId: string,
  setNumber: number,
  reps: number,
  weight: number | null,
  setType: SetTypeOffline,
  rpe: number | null
): Promise<void> {
  const outboxId = crypto.randomUUID()
  await offlineDb.localSetLogs.add({ outboxId, workoutId, workoutExerciseId, setNumber, reps, weight, setType, rpe })
  await offlineDb.outbox.add({
    outboxId,
    workoutId,
    actionType: "completeSet",
    payload: { workoutExerciseId, reps, weight, setType, rpe } satisfies CompleteSetPayload,
    status: "pending",
    createdAt: new Date().toISOString(),
  })
  notify()
  void drainOutbox()
}

export async function queueFinishWorkout(workoutId: string): Promise<void> {
  await enqueue(workoutId, "finishWorkout", { workoutId } satisfies FinishWorkoutPayload)
}

export async function queueRateAndFinishWorkout(
  workoutId: string,
  rating: number | null,
  comment: string
): Promise<void> {
  await enqueue(workoutId, "rateAndFinishWorkout", { workoutId, rating, comment } satisfies RateAndFinishWorkoutPayload)
}

let draining = false

export async function drainOutbox(): Promise<void> {
  if (draining) return
  if (typeof navigator !== "undefined" && !navigator.onLine) return
  draining = true
  try {
    for (;;) {
      const entry = await offlineDb.outbox.orderBy("createdAt").first()
      if (!entry) break
      const ok = await syncEntry(entry)
      if (!ok) break
    }
  } finally {
    draining = false
  }
}

async function syncEntry(entry: OutboxEntry): Promise<boolean> {
  try {
    await offlineDb.outbox.update(entry.outboxId, { status: "syncing" })

    switch (entry.actionType) {
      case "startWorkout": {
        const { workoutId } = entry.payload as StartWorkoutPayload
        await startWorkout(workoutId)
        break
      }
      case "completeSet": {
        const p = entry.payload as CompleteSetPayload
        await completeSet(p.workoutExerciseId, p.reps, p.weight, p.setType, p.rpe, entry.outboxId)
        await offlineDb.localSetLogs.delete(entry.outboxId)
        break
      }
      case "finishWorkout": {
        const { workoutId } = entry.payload as FinishWorkoutPayload
        await finishWorkout(workoutId)
        break
      }
      case "rateAndFinishWorkout": {
        const p = entry.payload as RateAndFinishWorkoutPayload
        await rateAndFinishWorkout(p.workoutId, p.rating, p.comment)
        break
      }
    }

    await offlineDb.outbox.delete(entry.outboxId)

    const remaining = await offlineDb.outbox.where("workoutId").equals(entry.workoutId).count()
    if (remaining === 0) {
      const stillHasLogs = await offlineDb.localSetLogs.where("workoutId").equals(entry.workoutId).count()
      if (stillHasLogs === 0) {
        await offlineDb.localWorkouts.delete(entry.workoutId)
      }
    }

    notify()
    return true
  } catch (err) {
    console.error("[outbox:sync]", entry.actionType, err)
    await offlineDb.outbox.update(entry.outboxId, { status: "failed" })
    notify()
    return false
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void drainOutbox())
}
