import Dexie, { type EntityTable } from "dexie"

export type SetTypeOffline = "NORMAL" | "WARMUP" | "DROP_SET" | "FAILURE"

export type LocalWorkoutExercise = {
  workoutExerciseId: string
  exerciseId: string
  sets: number
  restSeconds: number
}

export type LocalWorkout = {
  workoutId: string
  name: string
  exercises: LocalWorkoutExercise[]
}

export type LocalSetLog = {
  outboxId: string
  workoutId: string
  workoutExerciseId: string
  setNumber: number
  reps: number
  weight: number | null
  setType: SetTypeOffline
  rpe: number | null
}

export type OutboxActionType = "startWorkout" | "completeSet" | "finishWorkout" | "rateAndFinishWorkout"

export type OutboxEntry = {
  outboxId: string
  workoutId: string
  actionType: OutboxActionType
  payload: unknown
  status: "pending" | "syncing" | "failed"
  createdAt: string
}

type SpartOpsOfflineDB = Dexie & {
  localWorkouts: EntityTable<LocalWorkout, "workoutId">
  localSetLogs: EntityTable<LocalSetLog, "outboxId">
  outbox: EntityTable<OutboxEntry, "outboxId">
}

export const offlineDb = new Dexie("spartops-offline") as SpartOpsOfflineDB

offlineDb.version(1).stores({
  localWorkouts: "workoutId",
  localSetLogs: "outboxId, workoutId, workoutExerciseId",
  outbox: "outboxId, workoutId, status, createdAt",
})
