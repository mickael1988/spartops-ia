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
  if (data.exercises.length === 0) throw new Error("Ajoutez au moins un exercice")

  // Validation des valeurs numériques
  for (const ex of data.exercises) {
    if (ex.sets < 1 || ex.reps < 1 || ex.order < 1 || ex.restSeconds < 0) {
      throw new Error("Valeurs d'exercice invalides")
    }
    if (ex.weight !== null && ex.weight < 0) {
      throw new Error("Le poids ne peut pas être négatif")
    }
  }

  // Validation que tous les exerciceId existent en base
  const exerciseIds = data.exercises.map((ex) => ex.exerciseId)
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
  } catch {
    throw new Error("Erreur lors de la création de la séance")
  }

  redirect(`/musculation/seance/${workoutId}`)
}
