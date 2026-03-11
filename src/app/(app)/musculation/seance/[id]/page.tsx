import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { StartButton } from "../../mes-seances/start-button"

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
        include: {
          exercise: true,
          setLogs: { orderBy: { setNumber: "asc" } },
        },
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

  const backHref = workout.isTemplate ? "/musculation/mes-seances" : "/musculation/historique"
  const backLabel = workout.isTemplate ? "Mes séances" : "Historique"

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={backHref} className="hover:text-foreground transition-colors">
          {backLabel}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">{workout.name}</span>
      </nav>

      {/* En-tête */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">{workout.name}</h1>
        {!workout.isTemplate && (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {statusLabel}
          </Badge>
        )}
        {workout.isTemplate && (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Template
          </Badge>
        )}
      </div>

      <p className="text-muted-foreground">
        {workout.exercises.length} exercice{workout.exercises.length > 1 ? "s" : ""}
      </p>

      {/* Actions */}
      {workout.isTemplate && (
        <StartButton templateId={workout.id} />
      )}

      {!workout.isTemplate && workout.status !== "TERMINEE" && (
        <Link
          href={`/musculation/seance/${workout.id}/live`}
          className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-bold text-white"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          ▶ {workout.status === "EN_COURS" ? "Reprendre la séance" : "Démarrer la séance"}
        </Link>
      )}

      {!workout.isTemplate && workout.status === "TERMINEE" && (
        <Link
          href="/musculation"
          className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-bold text-white"
          style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
        >
          🏠 Retour au menu principal
        </Link>
      )}

      {/* Liste des exercices */}
      <div className="space-y-3">
        {workout.exercises.map((we, index) => (
          <Card key={we.id} className="bg-background/80 backdrop-blur-sm">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-4">
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
              </div>

              {/* Récap détaillé par série (instances terminées uniquement) */}
              {we.setLogs.length > 0 && (
                <div className="ml-10 space-y-1">
                  {we.setLogs.map((log) => (
                    <p key={log.id} className="text-sm text-muted-foreground">
                      Série {log.setNumber} : {log.reps} rép
                      {log.weight ? ` × ${log.weight} kg` : ""}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
