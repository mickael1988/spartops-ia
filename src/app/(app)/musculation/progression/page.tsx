import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProgressionClient } from "./progression-client"

export type OneRepMaxEntry = {
  id: string
  estimatedMax: number
  recordedAt: string
  inputWeight: number | null
  inputReps: number | null
  isManual: boolean
}

export type ExerciseRecord = {
  id: string
  name: string
  bestMax: number | null
  history: OneRepMaxEntry[]
}

export default async function ProgressionPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const [exercises, allEntries, scheduledTest] = await Promise.all([
    prisma.exercise.findMany({
      where: { isFundamental: true },
      orderBy: { name: "asc" },
    }),
    prisma.oneRepMax.findMany({
      where: { userId: session.user.id },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.workout.findFirst({
      where: {
        userId: session.user.id,
        name: "Test 1RM",
        status: "PLANIFIEE",
        scheduledAt: { gte: new Date() },
      },
    }),
  ])

  const exerciseRecords: ExerciseRecord[] = exercises.map(ex => {
    const exEntries = allEntries.filter(e => e.exerciseId === ex.id)
    return {
      id: ex.id,
      name: ex.name,
      bestMax: exEntries.length > 0 ? Math.max(...exEntries.map(e => e.estimatedMax)) : null,
      history: exEntries
        .slice(0, 6)
        .reverse()
        .map(e => ({
          id: e.id,
          estimatedMax: e.estimatedMax,
          recordedAt: e.recordedAt.toISOString(),
          inputWeight: e.inputWeight,
          inputReps: e.inputReps,
          isManual: e.isManual,
        })),
    }
  })

  const lastEntryDate = allEntries[0]?.recordedAt?.toISOString() ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progression 1RM</h1>
        <p className="text-muted-foreground mt-1">
          Suivez votre force sur les exercices fondamentaux
        </p>
      </div>

      <ProgressionClient
        exercises={exerciseRecords}
        lastEntryDate={lastEntryDate}
        hasScheduled={!!scheduledTest}
      />
    </div>
  )
}
