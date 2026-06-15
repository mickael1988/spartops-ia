import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { StatsClient } from "./stats-client"

export type WeeklyVolume = {
  weekLabel: string
  volume: number
}

export type StatsData = {
  streak: number
  totalWorkouts: number
  totalVolume: number
  favoriteExercise: { name: string; count: number } | null
  weeklyVolumes: WeeklyVolume[]
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`
}

function computeStreak(completedAts: Date[]): number {
  if (completedAts.length === 0) return 0

  const toDay = (d: Date) =>
    new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10)

  const uniqueDays = [...new Set(completedAts.map(toDay))].sort().reverse()

  const todayUtc = new Date()
  const today = toDay(todayUtc)
  const yesterday = toDay(new Date(Date.now() - 86400000))

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0

  let streak = 0
  let expected = uniqueDays[0]

  for (const day of uniqueDays) {
    if (day === expected) {
      streak++
      const d = new Date(expected + "T00:00:00Z")
      d.setUTCDate(d.getUTCDate() - 1)
      expected = d.toISOString().slice(0, 10)
    } else {
      break
    }
  }

  return streak
}

export default async function StatsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [workouts, setLogs] = await Promise.all([
    prisma.workout.findMany({
      where: { userId: session.user.id, status: "TERMINEE", isTemplate: false },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.setLog.findMany({
      where: {
        workoutExercise: {
          workout: { userId: session.user.id, status: "TERMINEE", isTemplate: false },
        },
        setType: { not: "WARMUP" },
        weight: { gt: 0 },
      },
      select: {
        reps: true,
        weight: true,
        completedAt: true,
        workoutExercise: {
          select: {
            exerciseId: true,
            exercise: { select: { name: true } },
          },
        },
      },
    }),
  ])

  // Streak
  const completedDates = workouts
    .map((w) => w.completedAt)
    .filter((d): d is Date => d !== null)
  const streak = computeStreak(completedDates)

  // Volume total
  const totalVolume = Math.round(
    setLogs.reduce((acc, log) => acc + (log.weight ?? 0) * log.reps, 0)
  )

  // Exercice favori
  const exerciseCountMap = new Map<string, { name: string; count: number }>()
  for (const log of setLogs) {
    const id = log.workoutExercise.exerciseId
    const name = log.workoutExercise.exercise.name
    const prev = exerciseCountMap.get(id)
    exerciseCountMap.set(id, { name, count: (prev?.count ?? 0) + 1 })
  }
  let favoriteExercise: { name: string; count: number } | null = null
  for (const [, ex] of exerciseCountMap) {
    if (!favoriteExercise || ex.count > favoriteExercise.count) {
      favoriteExercise = ex
    }
  }

  // Volume hebdomadaire — 8 dernières semaines
  const weekVolumeMap = new Map<string, number>()
  for (const log of setLogs) {
    if (!log.completedAt || !log.weight) continue
    const key = isoWeekKey(log.completedAt)
    weekVolumeMap.set(key, (weekVolumeMap.get(key) ?? 0) + log.weight * log.reps)
  }

  const weeklyVolumes: WeeklyVolume[] = []
  for (let i = 7; i >= 0; i--) {
    const ref = new Date(Date.now() - i * 7 * 86400000)
    const key = isoWeekKey(ref)
    const monday = new Date(ref)
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const label = `${monday.getDate()}/${monday.getMonth() + 1}`
    weeklyVolumes.push({ weekLabel: label, volume: Math.round(weekVolumeMap.get(key) ?? 0) })
  }

  const stats: StatsData = {
    streak,
    totalWorkouts: workouts.length,
    totalVolume,
    favoriteExercise,
    weeklyVolumes,
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">Musculation</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Statistiques</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold">Mes statistiques</h1>
        <p className="text-muted-foreground mt-1">Toutes tes séances en chiffres</p>
      </div>

      <StatsClient stats={stats} />
    </div>
  )
}
