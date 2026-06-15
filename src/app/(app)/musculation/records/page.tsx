import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { RecordsClient } from "./records-client"

export type PRRecord = {
  exerciseId: string
  exerciseName: string
  exerciseImage: string | null
  muscleGroupName: string
  weight: number
  reps: number
  date: string
}

export type MuscleGroupRecords = {
  groupName: string
  records: PRRecord[]
}

export default async function RecordsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const setLogs = await prisma.setLog.findMany({
    where: {
      workoutExercise: {
        workout: {
          userId: session.user.id,
          status: "TERMINEE",
          isTemplate: false,
        },
      },
      setType: { not: "WARMUP" },
      weight: { gt: 0 },
    },
    select: {
      weight: true,
      reps: true,
      completedAt: true,
      workoutExercise: {
        select: {
          exercise: {
            select: {
              id: true,
              name: true,
              image: true,
              muscleGroup: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ weight: "desc" }, { completedAt: "desc" }],
  })

  // Garder le meilleur poids par exercice
  const prMap = new Map<string, PRRecord>()

  for (const log of setLogs) {
    const ex = log.workoutExercise.exercise
    const existing = prMap.get(ex.id)
    if (!existing || (log.weight ?? 0) > existing.weight) {
      prMap.set(ex.id, {
        exerciseId: ex.id,
        exerciseName: ex.name,
        exerciseImage: ex.image,
        muscleGroupName: ex.muscleGroup.name,
        weight: log.weight ?? 0,
        reps: log.reps,
        date: log.completedAt.toISOString(),
      })
    }
  }

  // Grouper par muscle et trier par poids desc
  const groupMap = new Map<string, PRRecord[]>()
  for (const record of prMap.values()) {
    const list = groupMap.get(record.muscleGroupName) ?? []
    list.push(record)
    groupMap.set(record.muscleGroupName, list)
  }

  const groups: MuscleGroupRecords[] = Array.from(groupMap.entries())
    .map(([groupName, records]) => ({
      groupName,
      records: records.sort((a, b) => b.weight - a.weight),
    }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName, "fr"))

  const totalPRs = prMap.size

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">Musculation</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Records personnels</span>
      </nav>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mes records</h1>
          <p className="text-muted-foreground mt-1">Meilleur poids soulevé par exercice</p>
        </div>
        {totalPRs > 0 && (
          <span className="text-sm font-semibold text-orange-500 shrink-0">
            🏆 {totalPRs} exercice{totalPRs > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <RecordsClient groups={groups} />
    </div>
  )
}
