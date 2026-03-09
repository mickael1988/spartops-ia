import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const workout = await prisma.workout.findFirst({
    where: { id, userId: session.user.id },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!workout) notFound()

  const statusLabel = {
    PLANIFIEE: "Planifiée",
    EN_COURS: "En cours",
    TERMINEE: "Terminée",
  }[workout.status] ?? workout.status

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">{workout.name}</span>
      </nav>

      {/* En-tête */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">{workout.name}</h1>
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {statusLabel}
        </Badge>
      </div>

      <p className="text-muted-foreground">{workout.exercises.length} exercice{workout.exercises.length > 1 ? "s" : ""}</p>

      {workout.status !== "TERMINEE" && (
        <Link
          href={`/musculation/seance/${workout.id}/live`}
          className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-bold text-white"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          ▶ Démarrer la séance
        </Link>
      )}

      {/* Liste des exercices */}
      <div className="space-y-3">
        {workout.exercises.map((we, index) => (
          <Card key={we.id} className="bg-background/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <span className="text-muted-foreground text-sm w-6 text-right">{index + 1}.</span>
              <div className="flex-1">
                <p className="font-medium">{we.exercise.name}</p>
                <p className="text-sm text-muted-foreground">
                  {we.sets} séries × {we.reps} rép
                  {we.weight ? ` · ${we.weight} kg` : ""}
                  {" · "}{we.restSeconds}s de repos
                </p>
              </div>
              <span className="text-xl" aria-hidden="true">{we.exercise.image ?? "🏋️"}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
