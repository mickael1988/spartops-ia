"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type WorkoutExerciseInput = {
  exerciseId: string
  order: number
  sets: number
  reps: number
  weight: number | null
  restSeconds: number
}

type CreateWorkoutInput = {
  name: string
  exercises: WorkoutExerciseInput[]
}

export async function createWorkout(data: CreateWorkoutInput): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  if (!data.name.trim()) throw new Error("Le nom de la séance est requis")
  if (data.name.trim().length > 100) throw new Error("Nom trop long (max 100 caractères)")
  if (data.exercises.length === 0) throw new Error("Ajoutez au moins un exercice")
  if (data.exercises.length > 30) throw new Error("Maximum 30 exercices par séance")

  const exerciseIds = data.exercises.map((ex) => ex.exerciseId)
  const uniqueIds = new Set(exerciseIds)
  if (uniqueIds.size !== exerciseIds.length) throw new Error("Exercices en double détectés")

  // Validation des valeurs numériques
  for (const ex of data.exercises) {
    if (ex.sets < 1 || ex.reps < 1 || ex.order < 1 || ex.restSeconds < 0 || ex.sets > 20 || ex.reps > 100 || ex.restSeconds > 600) {
      throw new Error("Valeurs d'exercice invalides")
    }
    if (ex.weight !== null && ex.weight < 0) {
      throw new Error("Le poids ne peut pas être négatif")
    }
  }

  // Validation que tous les exerciceId existent en base
  const foundExercises = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds } },
    select: { id: true },
  })
  if (foundExercises.length !== exerciseIds.length) {
    throw new Error("Un ou plusieurs exercices sont invalides")
  }

  // Création de la séance — redirect() est EN DEHORS du try/catch
  let workoutId: string
  try {
    const workout = await prisma.workout.create({
      data: {
        name: data.name.trim(),
        userId: session.user.id,
        status: "PLANIFIEE",
        exercises: {
          create: data.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            order: ex.order,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restSeconds: ex.restSeconds,
          })),
        },
      },
    })
    workoutId = workout.id
  } catch (err) {
    console.error("[createWorkout]", err)
    throw new Error("Erreur lors de la création de la séance")
  }

  redirect(`/musculation/seance/${workoutId}`)
}

export async function startWorkout(workoutId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  await prisma.workout.updateMany({
    where: { id: workoutId, userId: session.user.id, status: "PLANIFIEE" },
    data: { status: "EN_COURS", startedAt: new Date() },
  })
}

export async function completeSet(
  workoutExerciseId: string
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const we = await prisma.workoutExercise.findFirst({
    where: { id: workoutExerciseId, workout: { userId: session.user.id } },
    select: { completedSets: true, sets: true },
  })
  if (!we) throw new Error("Exercice introuvable")
  if (we.completedSets >= we.sets) return

  await prisma.workoutExercise.update({
    where: { id: workoutExerciseId },
    data: {
      completedSets: { increment: 1 },
    },
  })
}

export async function quickStartWorkout(exerciseId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, name: true },
  })
  if (!exercise) throw new Error("Exercice introuvable")

  let workoutId: string
  try {
    const workout = await prisma.workout.create({
      data: {
        name: exercise.name,
        userId: session.user.id,
        status: "EN_COURS",
        startedAt: new Date(),
        exercises: {
          create: {
            exerciseId: exercise.id,
            order: 1,
            sets: 3,
            reps: 10,
            weight: null,
            restSeconds: 60,
          },
        },
      },
    })
    workoutId = workout.id
  } catch (err) {
    console.error("[quickStartWorkout]", err)
    throw new Error("Erreur lors du démarrage de la séance")
  }

  redirect(`/musculation/seance/${workoutId}/live`)
}

export async function finishWorkout(workoutId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  await prisma.workout.updateMany({
    where: { id: workoutId, userId: session.user.id, status: "EN_COURS" },
    data: { status: "TERMINEE", completedAt: new Date() },
  })
}
