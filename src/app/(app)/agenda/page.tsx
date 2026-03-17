import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AgendaCalendar } from "./agenda-calendar"

export type WorkoutEvent = {
  id: string
  name: string
  scheduledAt: string // ISO string
  exercises: { name: string }[]
}

export type Template = {
  id: string
  name: string
}

export default async function AgendaPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const now = new Date()
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))
  const to   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 1))

  const [workouts, templates] = await Promise.all([
    prisma.workout.findMany({
      where: {
        userId: session.user.id,
        status: "PLANIFIEE",
        isTemplate: false,
        scheduledAt: { gte: from, lt: to },
      },
      select: {
        id: true,
        name: true,
        scheduledAt: true,
        exercises: {
          select: { exercise: { select: { name: true } } },
          orderBy: { order: "asc" },
          take: 4,
        },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.workout.findMany({
      where: {
        userId: session.user.id,
        isTemplate: true,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const events: WorkoutEvent[] = workouts
    .filter(w => w.scheduledAt !== null)
    .map(w => ({
      id: w.id,
      name: w.name,
      scheduledAt: w.scheduledAt!.toISOString(),
      exercises: w.exercises.map(e => ({ name: e.exercise.name })),
    }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agenda</h1>
        <p className="text-muted-foreground mt-1">Planifiez et visualisez vos séances</p>
      </div>

      <AgendaCalendar events={events} templates={templates} />
    </div>
  )
}
