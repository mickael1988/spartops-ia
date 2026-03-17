"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function rescheduleWorkout(
  workoutId: string,
  newDate: string
): Promise<{ error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Non authentifié" }

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId: session.user.id },
  })
  if (!workout) return { error: "Séance introuvable" }

  const date = new Date(newDate + "T00:00:00.000Z")
  if (isNaN(date.getTime())) return { error: "Date invalide" }

  await prisma.workout.update({
    where: { id: workoutId },
    data: { scheduledAt: date },
  })

  revalidatePath("/agenda")
  return {}
}

export async function assignWorkoutToDate(
  templateId: string,
  date: string
): Promise<{ error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Non authentifié" }

  const template = await prisma.workout.findFirst({
    where: { id: templateId, userId: session.user.id, isTemplate: true },
    include: {
      exercises: {
        orderBy: { order: "asc" },
      },
    },
  })
  if (!template) return { error: "Template introuvable" }

  const scheduledAt = new Date(date + "T00:00:00.000Z")
  if (isNaN(scheduledAt.getTime())) return { error: "Date invalide" }

  await prisma.workout.create({
    data: {
      userId: session.user.id,
      name: template.name,
      isTemplate: false,
      status: "PLANIFIEE",
      scheduledAt,
      exercises: {
        create: template.exercises.map(e => ({
          exerciseId: e.exerciseId,
          order: e.order,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          restSeconds: e.restSeconds,
        })),
      },
    },
  })

  revalidatePath("/agenda")
  return {}
}
