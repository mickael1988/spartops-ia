"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function save1RM(
  exerciseId: string,
  estimatedMax: number,
  inputWeight: number | null,
  inputReps: number | null,
  isManual: boolean
): Promise<{ error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Non authentifié" }

  if (estimatedMax <= 0 || estimatedMax > 500)
    return { error: "1RM invalide (entre 1 et 500 kg)" }

  if (!isManual) {
    if (!inputWeight || inputWeight <= 0) return { error: "Poids invalide" }
    if (!inputReps || inputReps < 1 || inputReps > 30)
      return { error: "Répétitions invalides (entre 1 et 30)" }
  }

  await prisma.oneRepMax.create({
    data: {
      userId: session.user.id,
      exerciseId,
      estimatedMax,
      inputWeight,
      inputReps,
      isManual,
    },
  })

  revalidatePath("/musculation/progression")
  return {}
}

export async function scheduleTest(): Promise<{ error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Non authentifié" }

  const now = new Date()

  const existing = await prisma.workout.findFirst({
    where: {
      userId: session.user.id,
      name: "Test 1RM",
      status: "PLANIFIEE",
      scheduledAt: { gte: now },
    },
  })
  if (existing) return { error: "Un test est déjà planifié" }

  const scheduledAt = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)

  await prisma.workout.create({
    data: {
      userId: session.user.id,
      name: "Test 1RM",
      isTemplate: false,
      status: "PLANIFIEE",
      scheduledAt,
    },
  })

  revalidatePath("/agenda")
  revalidatePath("/musculation/progression")
  return {}
}
