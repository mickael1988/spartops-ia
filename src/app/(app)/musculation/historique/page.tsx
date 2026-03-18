import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, ArrowRight } from "lucide-react"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"

function formatDuration(startedAt: Date | null, completedAt: Date | null): string {
  if (!startedAt || !completedAt) return ""
  const seconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s > 0 ? `${m} min ${s}s` : `${m} min`
}

export default async function HistoriquePage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id, status: "TERMINEE" },
    include: { exercises: { include: { exercise: true } } },
    orderBy: { completedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Historique</span>
      </nav>

      <h1 className="text-3xl font-bold">Historique des séances</h1>

      {workouts.length === 0 ? (
        <p className="text-muted-foreground">Aucune séance terminée pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => {
            const date = workout.completedAt?.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
            const duration = formatDuration(workout.startedAt, workout.completedAt)
            return (
              <Card key={workout.id} className="bg-background/80 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1">
                    <p className="font-medium">{workout.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {date}
                      {" · "}
                      {workout.exercises.length} exercice{workout.exercises.length > 1 ? "s" : ""}
                      {duration ? ` · ${duration}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/musculation/seance/${workout.id}`}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Voir <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
