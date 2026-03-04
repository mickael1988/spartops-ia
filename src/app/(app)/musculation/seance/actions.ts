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

  redirect(`/musculation/seance/${workout.id}`)
}
