"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function createProgram(data: {
  name: string
  workoutIds: string[]
}): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const name = data.name.trim()
  if (!name) throw new Error("Le nom du programme est requis")
  if (name.length > 100) throw new Error("Nom trop long (max 100 caractères)")
  if (data.workoutIds.length === 0) throw new Error("Ajoutez au moins un jour au programme")

  const templates = await prisma.workout.findMany({
    where: { id: { in: data.workoutIds }, userId: session.user.id, isTemplate: true },
    select: { id: true },
  })
  if (templates.length !== data.workoutIds.length) {
    throw new Error("Une ou plusieurs séances sont invalides")
  }

  let programId: string
  try {
    const program = await prisma.program.create({
      data: {
        userId: session.user.id,
        name,
        days: {
          create: data.workoutIds.map((workoutId, index) => ({
            order: index + 1,
            workoutId,
          })),
        },
      },
    })
    programId = program.id
  } catch (err) {
    console.error("[createProgram]", err)
    throw new Error("Erreur lors de la création du programme")
  }

  redirect(`/musculation/programmes/${programId}`)
}

export async function activateProgram(programId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const program = await prisma.program.findFirst({
    where: { id: programId, userId: session.user.id },
    select: { id: true },
  })
  if (!program) throw new Error("Programme introuvable")

  await prisma.$transaction([
    prisma.program.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: { isActive: false },
    }),
    prisma.program.update({
      where: { id: programId },
      data: { isActive: true },
    }),
  ])

  revalidatePath(`/musculation/programmes/${programId}`)
  revalidatePath("/musculation/programmes")
}

export async function startProgramDay(programId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const program = await prisma.program.findFirst({
    where: { id: programId, userId: session.user.id, isActive: true },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: {
          workout: { include: { exercises: { orderBy: { order: "asc" } } } },
        },
      },
    },
  })
  if (!program) throw new Error("Programme introuvable ou inactif")
  if (program.days.length === 0) throw new Error("Ce programme n'a aucun jour")

  const dayIndex = program.currentDayIndex % program.days.length
  const template = program.days[dayIndex].workout

  let workoutId: string
  try {
    const copy = await prisma.workout.create({
      data: {
        name: template.name,
        userId: session.user.id,
        isTemplate: false,
        status: "EN_COURS",
        startedAt: new Date(),
        exercises: {
          create: template.exercises.map((ex) => ({
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
    workoutId = copy.id

    await prisma.program.update({
      where: { id: programId },
      data: { currentDayIndex: (dayIndex + 1) % program.days.length },
    })
  } catch (err) {
    console.error("[startProgramDay]", err)
    throw new Error("Erreur lors du démarrage du jour")
  }

  redirect(`/musculation/seance/${workoutId}/live`)
}

export async function deleteProgram(programId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const program = await prisma.program.findFirst({
    where: { id: programId, userId: session.user.id },
    select: { id: true },
  })
  if (!program) throw new Error("Programme introuvable")

  await prisma.program.delete({ where: { id: programId } })

  revalidatePath("/musculation/programmes")
}
