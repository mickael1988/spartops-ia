"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type CreateExerciseInput = {
  name: string
  description: string
  muscleGroupId: string
  difficulty: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"
  equipment: string
  defaultReps: number | null
  defaultRestSeconds: number | null
}

export async function createExercise(data: CreateExerciseInput): Promise<{ error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Non authentifié" }

  if (!data.name.trim()) return { error: "Le nom est requis" }
  if (data.name.trim().length > 100) return { error: "Nom trop long (max 100 caractères)" }
  if (!data.description.trim()) return { error: "La description est requise" }
  if (!data.muscleGroupId) return { error: "Veuillez choisir un groupe musculaire" }
  if (!["DEBUTANT", "INTERMEDIAIRE", "AVANCE"].includes(data.difficulty)) {
    return { error: "Difficulté invalide" }
  }
  if (data.defaultReps !== null && (data.defaultReps < 1 || data.defaultReps > 100)) {
    return { error: "Répétitions par défaut invalides (1–100)" }
  }
  if (data.defaultRestSeconds !== null && (data.defaultRestSeconds < 0 || data.defaultRestSeconds > 600)) {
    return { error: "Temps de repos invalide (0–600s)" }
  }

  const group = await prisma.muscleGroup.findUnique({
    where: { id: data.muscleGroupId },
    select: { slug: true },
  })
  if (!group) return { error: "Groupe musculaire introuvable" }

  await prisma.exercise.create({
    data: {
      name: data.name.trim(),
      description: data.description.trim(),
      muscleGroupId: data.muscleGroupId,
      difficulty: data.difficulty,
      equipment: data.equipment.trim() || null,
      defaultReps: data.defaultReps,
      defaultRestSeconds: data.defaultRestSeconds,
    },
  })

  redirect(`/musculation/${group.slug}`)
}