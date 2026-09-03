import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { DayActions } from "./day-actions"

export default async function ProgrammeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { id } = await params

  const program = await prisma.program.findFirst({
    where: { id, userId: session.user.id },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: {
          workout: {
            include: {
              exercises: {
                include: { exercise: { include: { muscleGroup: true } } },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  })
  if (!program) notFound()

  const currentIndex =
    program.days.length > 0 ? program.currentDayIndex % program.days.length : -1

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/musculation/programmes" className="hover:text-foreground transition-colors">
          Programmes
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{program.name}</span>
      </nav>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{program.name}</h1>
          <p className="text-muted-foreground mt-1">
            {program.days.length} jour{program.days.length > 1 ? "s" : ""}
          </p>
        </div>
        {program.isActive && (
          <span className="rounded-full bg-emerald-500/15 text-emerald-600 text-sm font-medium px-3 py-1">
            Programme actif
          </span>
        )}
      </div>

      <div className="space-y-3">
        {program.days.map((day, index) => {
          const muscleGroups = [
            ...new Map(
              day.workout.exercises.map((e) => [e.exercise.muscleGroup.id, e.exercise.muscleGroup.name])
            ).entries(),
          ].map(([, name]) => name)

          return (
            <Card
              key={day.id}
              className={
                index === currentIndex
                  ? "bg-primary/5 border-primary/30"
                  : "bg-background/80 backdrop-blur-sm"
              }
            >
              <CardContent className="py-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    Jour {index + 1} — {day.workout.name}
                    {index === currentIndex && (
                      <span className="ml-2 text-xs font-medium" style={{ color: "#3F5EFB" }}>
                        Prochain
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {day.workout.exercises.length} exercice
                    {day.workout.exercises.length > 1 ? "s" : ""}
                    {muscleGroups.length > 0 && ` · ${muscleGroups.join(", ")}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <DayActions programId={program.id} isActive={program.isActive} currentDayIndex={currentIndex} />
    </div>
  )
}
