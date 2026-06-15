import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ExercicesProgressionClient } from "./exercices-client"

export type ExerciseProgressionRecord = {
  id: string
  name: string
  image: string | null
  muscleGroupName: string
  bestMax: number
  history: Array<{ recordedAt: string; estimatedMax: number }>
}

export default async function ExercicesProgressionPage({
  searchParams,
}: {
  searchParams: Promise<{ exercice?: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const params = await searchParams
  const exerciceId = params?.exercice ?? null

  const setLogs = await prisma.setLog.findMany({
    where: {
      workoutExercise: {
        workout: {
          userId: session.user.id,
          status: "TERMINEE",
          completedAt: { not: null },
        },
        ...(exerciceId ? { exerciseId: exerciceId } : {}),
      },
      weight: { gt: 0 },
    },
    select: {
      reps: true,
      weight: true,
      workoutExercise: {
        select: {
          exerciseId: true,
          workout: {
            select: { id: true, completedAt: true },
          },
          exercise: {
            select: {
              id: true,
              name: true,
              image: true,
              muscleGroup: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  type ExMap = Map<string, {
    id: string
    name: string
    image: string | null
    muscleGroupName: string
    workouts: Map<string, { completedAt: string; bestEpley: number }>
  }>

  const exerciseMap: ExMap = new Map()

  for (const log of setLogs) {
    const we = log.workoutExercise
    const ex = we.exercise
    const workout = we.workout
    if (!log.weight || !workout.completedAt) continue
    const epley = Math.round(log.weight * (1 + log.reps / 30))
    const completedAt = workout.completedAt.toISOString()

    if (!exerciseMap.has(ex.id)) {
      exerciseMap.set(ex.id, {
        id: ex.id,
        name: ex.name,
        image: ex.image,
        muscleGroupName: ex.muscleGroup.name,
        workouts: new Map(),
      })
    }

    const exEntry = exerciseMap.get(ex.id)!
    const existing = exEntry.workouts.get(workout.id)
    if (!existing || epley > existing.bestEpley) {
      exEntry.workouts.set(workout.id, { completedAt, bestEpley: epley })
    }
  }

  const records: ExerciseProgressionRecord[] = []

  for (const [, ex] of exerciseMap) {
    if (ex.workouts.size < 2) continue

    const history = Array.from(ex.workouts.values())
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
      .map(w => ({ recordedAt: w.completedAt, estimatedMax: w.bestEpley }))

    const bestMax = Math.max(...history.map(h => h.estimatedMax))

    records.push({
      id: ex.id,
      name: ex.name,
      image: ex.image,
      muscleGroupName: ex.muscleGroupName,
      bestMax,
      history,
    })
  }

  records.sort((a, b) =>
    b.history[b.history.length - 1].recordedAt.localeCompare(
      a.history[a.history.length - 1].recordedAt
    )
  )

  return (
    <ExercicesProgressionClient
      exercises={records}
      filteredExerciseId={exerciceId}
    />
  )
}
