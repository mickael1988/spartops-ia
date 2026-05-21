import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { startFromTemplate } from "../../actions"
import { WorkoutLive } from "./workout-live"

export type HistoryEntry = {
  date: string
  maxWeight: number
  totalReps: number
  sets: number
}

export default async function WorkoutLivePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const workout = await prisma.workout.findFirst({
    where: { id, userId: session.user.id },
    include: {
      exercises: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!workout) notFound()
  if (workout.status === "TERMINEE") redirect(`/musculation/seance/${id}`)
  if (workout.isTemplate) await startFromTemplate(id)

  // Comptage des setLogs WARMUP existants par workoutExercise (pour reprise de séance)
  const warmupCounts = await prisma.setLog.groupBy({
    by: ["workoutExerciseId"],
    where: {
      workoutExercise: { workoutId: workout.id },
      setType: "WARMUP",
    },
    _count: { id: true },
  })
  const warmupCountByExercise: Record<string, number> = Object.fromEntries(
    warmupCounts.map((r) => [r.workoutExerciseId, r._count.id])
  )

  const exerciseIds = workout.exercises.map((e) => e.exerciseId)

  // Historique : 3 derniers WorkoutExercise TERMINEE par exercice
  const pastWorkoutExercises = await prisma.workoutExercise.findMany({
    where: {
      exerciseId: { in: exerciseIds },
      workout: {
        userId: session.user.id,
        status: "TERMINEE",
        id: { not: workout.id },
      },
    },
    include: {
      setLogs: true,
      workout: { select: { completedAt: true } },
    },
    orderBy: { workout: { completedAt: "desc" } },
    take: exerciseIds.length * 10,
  })

  // Grouper par exerciseId, garder les 3 plus récents
  const historyByExercise: Record<string, HistoryEntry[]> = {}
  for (const we of pastWorkoutExercises) {
    const existing = historyByExercise[we.exerciseId] ?? []
    if (existing.length >= 3) continue
    const workingLogs = we.setLogs.filter((log) => log.setType !== "WARMUP")
    if (workingLogs.length === 0) continue
    const maxWeight = workingLogs.reduce((max, log) => Math.max(max, log.weight ?? 0), 0)
    const totalReps = workingLogs.reduce((acc, log) => acc + log.reps, 0)
    existing.push({
      date: we.workout.completedAt?.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) ?? "",
      maxWeight,
      totalReps,
      sets: workingLogs.length,
    })
    historyByExercise[we.exerciseId] = existing
  }

  // PRs : meilleur poids réel soulevé (inputWeight) par exercice
  const oneRepMaxes = await prisma.oneRepMax.findMany({
    where: { userId: session.user.id, exerciseId: { in: exerciseIds } },
    orderBy: { inputWeight: "desc" },
    distinct: ["exerciseId"],
  })
  const prByExercise: Record<string, number> = Object.fromEntries(
    oneRepMaxes
      .filter((orm) => orm.inputWeight != null)
      .map((orm) => [orm.exerciseId, orm.inputWeight!])
  )

  return (
    <WorkoutLive
      workout={workout}
      historyByExercise={historyByExercise}
      prByExercise={prByExercise}
      warmupCountByExercise={warmupCountByExercise}
    />
  )
}
