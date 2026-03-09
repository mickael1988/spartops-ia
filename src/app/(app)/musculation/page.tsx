import Link from "next/link"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { ArrowRight, PlusCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export default async function MusculationPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const groups = await prisma.muscleGroup.findMany({
    include: { _count: { select: { exercises: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Musculation</h1>
          <p className="text-muted-foreground mt-1">Choisissez un groupe musculaire</p>
        </div>
        <Link
          href="/musculation/historique"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Historique <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Carte Créer une séance */}
        <Link href="/musculation/seance/nouvelle">
          <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-background/80 backdrop-blur-sm border-dashed border-2">
            <CardHeader className="pb-3">
              <div
                className="w-fit rounded-lg p-2.5 mb-2"
                style={{ background: "linear-gradient(135deg, #3F5EFB, #F50535)" }}
              >
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-lg">Créer une séance</CardTitle>
              <p className="text-sm text-muted-foreground">Composez votre entraînement sur mesure</p>
            </CardHeader>
            <CardContent>
              <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "#3F5EFB" }}>
                Commencer <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* Groupes musculaires */}
        {groups.map((group) => (
          <Link key={group.id} href={`/musculation/${group.slug}`}>
            <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-background/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="mb-2" aria-hidden="true">
                  {group.image.startsWith("/")
                    ? <img src={group.image} alt="" className="h-10 w-10 object-contain" />
                    : <span className="text-4xl">{group.image}</span>}
                </div>
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{group._count.exercises} exercices</p>
              </CardHeader>
              <CardContent>
                <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "#3F5EFB" }}>
                  Voir les exercices <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
