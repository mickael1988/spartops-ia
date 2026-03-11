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
        isTemplate: true,
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
  workoutExerciseId: string,
  reps: number,
  weight: number | null
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const we = await prisma.workoutExercise.findFirst({
    where: { id: workoutExerciseId, workout: { userId: session.user.id } },
    select: { completedSets: true, sets: true },
  })
  if (!we) throw new Error("Exercice introuvable")
  if (we.completedSets >= we.sets) return

  await prisma.$transaction([
    prisma.workoutExercise.update({
      where: { id: workoutExerciseId },
      data: { completedSets: { increment: 1 } },
    }),
    prisma.setLog.create({
      data: {
        workoutExerciseId,
        setNumber: we.completedSets + 1,
        reps,
        weight,
      },
    }),
  ])
}

export async function quickStartWorkout(exerciseId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, name: true, defaultReps: true, defaultRestSeconds: true },
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
            sets: 4,
            reps: exercise.defaultReps ?? 10,
            weight: null,
            restSeconds: exercise.defaultRestSeconds ?? 60,
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

export async function buildAndStartWorkout(exerciseIds: string[]): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  if (exerciseIds.length === 0) throw new Error("Aucun exercice sélectionné")
  if (exerciseIds.length > 30) throw new Error("Maximum 30 exercices par séance")

  const uniqueIds = [...new Set(exerciseIds)]
  if (uniqueIds.length !== exerciseIds.length) throw new Error("Exercices en double détectés")

  const found = await prisma.exercise.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true, defaultReps: true, defaultRestSeconds: true },
  })
  if (found.length !== uniqueIds.length) throw new Error("Exercice(s) invalide(s)")

  const name = found.length === 1
    ? found[0].name
    : `Séance du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`

  const orderedExercises = uniqueIds.map((id, index) => {
    const ex = found.find((f) => f.id === id)!
    return {
      exerciseId: ex.id,
      order: index + 1,
      reps: ex.defaultReps ?? 10,
      restSeconds: ex.defaultRestSeconds ?? 60,
    }
  })

  let workoutId: string
  try {
    const workout = await prisma.workout.create({
      data: {
        name,
        userId: session.user.id,
        status: "EN_COURS",
        startedAt: new Date(),
        exercises: {
          create: orderedExercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            order: ex.order,
            sets: 4,
            reps: ex.reps,
            weight: null,
            restSeconds: ex.restSeconds,
          })),
        },
      },
    })
    workoutId = workout.id
  } catch (err) {
    console.error("[buildAndStartWorkout]", err)
    throw new Error("Erreur lors de la création de la séance")
  }

  redirect(`/musculation/seance/${workoutId}/live`)
}

export async function startFromTemplate(templateId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const template = await prisma.workout.findFirst({
    where: { id: templateId, userId: session.user.id, isTemplate: true },
    include: { exercises: { orderBy: { order: "asc" } } },
  })
  if (!template) throw new Error("Template introuvable")

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
  } catch (err) {
    console.error("[startFromTemplate]", err)
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
