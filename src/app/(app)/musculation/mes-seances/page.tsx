import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, PlusCircle } from "lucide-react"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { StartButton } from "./start-button"

export default async function MesSeancesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const templates = await prisma.workout.findMany({
    where: { userId: session.user.id, isTemplate: true },
    include: {
      exercises: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Mes séances</span>
      </nav>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Mes séances</h1>
          <p className="text-muted-foreground mt-1">Vos programmes enregistrés</p>
        </div>
        <Link
          href="/musculation/seance/nouvelle"
          className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted active:bg-muted transition-colors"
        >
          <PlusCircle className="h-4 w-4" /> Nouvelle séance
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <p className="text-muted-foreground">Aucune séance enregistrée.</p>
          <Link
            href="/musculation/seance/nouvelle"
            className="rounded-xl px-6 py-3 text-sm font-bold text-white"
            style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
          >
            Créer ma première séance
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            // Groupes musculaires uniques
            const muscleGroups = [...new Map(
              template.exercises.map((e) => [e.exercise.muscleGroup.id, e.exercise.muscleGroup.name])
            ).entries()].map(([, name]) => name)

            return (
              <Card key={template.id} className="bg-background/80 backdrop-blur-sm">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/musculation/seance/${template.id}`}
                        className="font-semibold hover:underline"
                      >
                        {template.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {template.exercises.length} exercice{template.exercises.length > 1 ? "s" : ""}
                        {muscleGroups.length > 0 && ` · ${muscleGroups.join(", ")}`}
                      </p>
                    </div>
                    <StartButton templateId={template.id} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
