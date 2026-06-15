import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, PlusCircle, Dumbbell, TrendingUp, PlayCircle, BarChart2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"

const BEAM = "conic-gradient(from 0deg, transparent 0%, transparent 30%, #3F5EFB 50%, #F50535 58%, transparent 72%, transparent 100%)"

export default async function MusculationPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const groups = await prisma.muscleGroup.findMany({
    include: { _count: { select: { exercises: true } } },
    orderBy: { name: "asc" },
  })

  const inProgressWorkout = await prisma.workout.findFirst({
    where: { userId: session.user.id, status: "EN_COURS", isTemplate: false },
    select: {
      id: true,
      name: true,
      exercises: {
        select: { completedSets: true, sets: true },
      },
    },
    orderBy: { startedAt: "desc" },
  })

  const inProgressStats = inProgressWorkout
    ? {
        completedExercises: inProgressWorkout.exercises.filter(
          (e) => e.completedSets >= e.sets
        ).length,
        totalExercises: inProgressWorkout.exercises.length,
      }
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Musculation</h1>
        <p className="text-muted-foreground mt-1">Choisissez un groupe musculaire</p>
      </div>

      {/* Bannière séance en cours — placée après le titre, avant les cartes d'action */}
      {inProgressWorkout && inProgressStats && (
        <Link
          href={`/musculation/seance/${inProgressWorkout.id}/live`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 hover:bg-primary/10 active:bg-primary/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-fit rounded-xl p-2 shrink-0"
              style={{ background: "linear-gradient(135deg, #3F5EFB, #F50535)" }}
            >
              <PlayCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">{inProgressWorkout.name}</p>
              <p className="text-xs text-muted-foreground">
                {inProgressStats.completedExercises} / {inProgressStats.totalExercises} exercice
                {inProgressStats.totalExercises > 1 ? "s" : ""} terminé
                {inProgressStats.totalExercises > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold shrink-0" style={{ color: "#3F5EFB" }}>
            Reprendre <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      {/* Cartes d'action — centrées, côte à côte */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">

        {/* Créer une séance */}
        <Link href="/musculation/seance/nouvelle" className="w-full sm:max-w-xs">
          <div className="relative rounded-lg p-[2px] overflow-hidden group/create transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.97] active:shadow-none h-full">
            <div className="absolute inset-[-200%] animate-border-beam pointer-events-none" style={{ background: BEAM }} />
            <Card className="relative z-10 bg-card border-0 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-fit rounded-xl p-2.5 shrink-0" style={{ background: "linear-gradient(135deg, #3F5EFB, #F50535)" }}>
                    <PlusCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Créer une séance</CardTitle>
                    <p className="text-xs text-muted-foreground">Composez votre entraînement</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "#3F5EFB" }}>
                  Commencer <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </div>
        </Link>

        {/* Créer un exercice */}
        <Link href="/musculation/exercice/nouveau" className="w-full sm:max-w-xs">
          <div className="relative rounded-lg p-[2px] overflow-hidden group/exercise transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.97] active:shadow-none h-full">
            <div className="absolute inset-[-200%] opacity-0 group-hover/exercise:opacity-100 transition-opacity duration-300 animate-border-beam pointer-events-none" style={{ background: BEAM }} />
            <div className="absolute inset-0 rounded-lg border border-border group-hover/exercise:border-transparent transition-colors pointer-events-none" />
            <Card className="relative z-10 bg-card border-0 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-fit rounded-xl p-2.5 shrink-0" style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}>
                    <Dumbbell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Créer un exercice</CardTitle>
                    <p className="text-xs text-muted-foreground">Ajoutez-le au catalogue</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                  Créer <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </div>
        </Link>

        {/* Tester mon 1RM */}
        <Link href="/musculation/progression" className="w-full sm:max-w-xs">
          <div className="relative rounded-lg p-[2px] overflow-hidden group/1rm transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.97] active:shadow-none h-full">
            <div className="absolute inset-[-200%] opacity-0 group-hover/1rm:opacity-100 transition-opacity duration-300 animate-border-beam pointer-events-none" style={{ background: BEAM }} />
            <div className="absolute inset-0 rounded-lg border border-border group-hover/1rm:border-transparent transition-colors pointer-events-none" />
            <Card className="relative z-10 bg-card border-0 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-fit rounded-xl p-2.5 shrink-0" style={{ background: "linear-gradient(135deg, #7C3AED, #F97316)" }}>
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Tester mon 1RM</CardTitle>
                    <p className="text-xs text-muted-foreground">Suivez votre progression</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "#7C3AED" }}>
                  Progression <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </div>
        </Link>

        {/* Mes statistiques */}
        <Link href="/musculation/stats" className="w-full sm:max-w-xs">
          <div className="relative rounded-lg p-[2px] overflow-hidden group/stats transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.97] active:shadow-none h-full">
            <div className="absolute inset-[-200%] opacity-0 group-hover/stats:opacity-100 transition-opacity duration-300 animate-border-beam pointer-events-none" style={{ background: BEAM }} />
            <div className="absolute inset-0 rounded-lg border border-border group-hover/stats:border-transparent transition-colors pointer-events-none" />
            <Card className="relative z-10 bg-card border-0 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-fit rounded-xl p-2.5 shrink-0" style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}>
                    <BarChart2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Mes statistiques</CardTitle>
                    <p className="text-xs text-muted-foreground">Streak, volume, records</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <span className="flex items-center gap-1 text-sm font-semibold text-sky-500">
                  Voir <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </div>
        </Link>

      </div>

      {/* Groupes musculaires — border beam au survol uniquement */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">Ou choisissez un groupe musculaire</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {groups.map((group) => (
            <Link key={group.id} href={`/musculation/${group.slug}`}>
              <div className="relative rounded-lg p-[2px] overflow-hidden group/card h-full transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] active:shadow-none">
                {/* Gradient animé visible seulement au hover */}
                <div
                  className="absolute inset-[-200%] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 animate-border-beam pointer-events-none"
                  style={{ background: BEAM }}
                />
                {/* Bordure par défaut (invisible mais garde l'espace) */}
                <div className="absolute inset-0 rounded-lg border border-border group-hover/card:border-transparent transition-colors pointer-events-none" />
                <Card className="relative z-10 h-full bg-card border-0">
                  <CardHeader className="pb-3">
                    <div className="mb-2" aria-hidden="true">
                      {group.image.startsWith("/")
                        ? <img src={group.image} alt="" className="h-10 w-10 object-contain" />
                        : <span className="text-4xl">{group.image}</span>}
                    </div>
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{group._count.exercises} exercices</p>
                  </CardHeader>
                  <CardContent>
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#3F5EFB" }}>
                      Voir <ArrowRight className="h-3 w-3" />
                    </span>
                  </CardContent>
                </Card>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
