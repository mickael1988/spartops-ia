"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  MAX_ELAPSED_SECONDS,
  MAX_ROUNDS,
  MAX_EXTRA_REPS,
  MAX_SESSION_AGE_MS,
} from "@/lib/cardio/limits"

export type SaveCardioSessionInput = {
  programId: string
  startedAt: string
  completedAt: string
  elapsedSeconds: number
  roundsCompleted: number | null
  extraReps: number | null
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export async function saveCardioSession(
  input: SaveCardioSessionInput,
  clientRequestId: string
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  if (!clientRequestId) throw new Error("Identifiant de requête manquant")
  const existing = await prisma.userCardioSession.findUnique({ where: { clientRequestId } })
  if (existing) return

  if (typeof input.programId !== "string" || !input.programId) throw new Error("WOD introuvable")
  const program = await prisma.cardioProgram.findFirst({
    where: { id: input.programId, OR: [{ userId: null }, { userId: session.user.id }] },
    select: { format: true },
  })
  if (!program) throw new Error("WOD introuvable")

  const startedAt = new Date(input.startedAt)
  const completedAt = new Date(input.completedAt)
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(completedAt.getTime())) {
    throw new Error("Dates invalides")
  }
  if (startedAt.getTime() > completedAt.getTime()) throw new Error("Dates incohérentes")
  const now = Date.now()
  for (const date of [startedAt, completedAt]) {
    if (date.getTime() < now - MAX_SESSION_AGE_MS || date.getTime() > now + FIVE_MINUTES_MS) {
      throw new Error("Date hors limites")
    }
  }

  if (
    !Number.isInteger(input.elapsedSeconds) ||
    input.elapsedSeconds < 1 ||
    input.elapsedSeconds > MAX_ELAPSED_SECONDS
  ) {
    throw new Error("Durée invalide")
  }

  if (program.format !== "AMRAP") {
    if (input.roundsCompleted !== null || input.extraReps !== null) {
      throw new Error("Tours autorisés uniquement pour un AMRAP")
    }
  } else {
    if (
      input.roundsCompleted !== null &&
      (!Number.isInteger(input.roundsCompleted) || input.roundsCompleted < 0 || input.roundsCompleted > MAX_ROUNDS)
    ) {
      throw new Error("Nombre de tours invalide")
    }
    if (
      input.extraReps !== null &&
      (!Number.isInteger(input.extraReps) || input.extraReps < 0 || input.extraReps > MAX_EXTRA_REPS)
    ) {
      throw new Error("Nombre de répétitions invalide")
    }
  }

  try {
    await prisma.userCardioSession.create({
      data: {
        userId: session.user.id,
        programId: input.programId,
        startedAt,
        completedAt,
        elapsedSeconds: input.elapsedSeconds,
        roundsCompleted: input.roundsCompleted,
        extraReps: input.extraReps,
        clientRequestId,
      },
    })
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") return
    throw err
  }
}
