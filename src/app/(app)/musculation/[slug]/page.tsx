import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"

const difficultyConfig = {
  DEBUTANT: { label: "Débutant", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  INTERMEDIAIRE: { label: "Intermédiaire", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  AVANCE: { label: "Avancé", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

export default async function MuscleGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const group = await prisma.muscleGroup.findUnique({
    where: { slug },
    include: { exercises: { orderBy: { name: "asc" } } },
  })

  if (!group) notFound()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{group.name}</span>
      </nav>

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{group.image}</span>
          <h1 className="text-3xl font-bold">{group.name}</h1>
        </div>
        <p className="text-muted-foreground mt-1">{group.exercises.length} exercices disponibles</p>
      </div>

      {/* Grille exercices */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.exercises.map((exercise) => {
          const diff = difficultyConfig[exercise.difficulty]
          return (
            <Card key={exercise.id} className="bg-background/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-2xl">{exercise.image ?? "🏋️"}</div>
                  <Badge className={diff.className}>{diff.label}</Badge>
                </div>
                <CardTitle className="text-base mt-2">{exercise.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{exercise.description}</p>
                {exercise.equipment && (
                  <p className="text-xs text-muted-foreground mt-2">
                    🔧 {exercise.equipment}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
