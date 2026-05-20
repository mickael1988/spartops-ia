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
  })

  // Grouper par exerciseId, garder les 3 plus récents
  const historyByExercise: Record<string, HistoryEntry[]> = {}
  for (const we of pastWorkoutExercises) {
    const existing = historyByExercise[we.exerciseId] ?? []
    if (existing.length >= 3) continue
    const maxWeight = we.setLogs.reduce((max, log) => Math.max(max, log.weight ?? 0), 0)
    const totalReps = we.setLogs.reduce((acc, log) => acc + log.reps, 0)
    existing.push({
      date: we.workout.completedAt?.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) ?? "",
      maxWeight,
      totalReps,
      sets: we.setLogs.length,
    })
    historyByExercise[we.exerciseId] = existing
  }

  // PRs : meilleur estimatedMax par exercice
  const oneRepMaxes = await prisma.oneRepMax.findMany({
    where: { userId: session.user.id, exerciseId: { in: exerciseIds } },
    orderBy: { estimatedMax: "desc" },
  })
  const prByExercise: Record<string, number> = {}
  for (const orm of oneRepMaxes) {
    if (!prByExercise[orm.exerciseId]) {
      prByExercise[orm.exerciseId] = orm.estimatedMax
    }
  }

  return (
    <WorkoutLive
      workout={workout}
      historyByExercise={historyByExercise}
      prByExercise={prByExercise}
    />
  )
}
