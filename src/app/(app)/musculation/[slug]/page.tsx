import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { ExerciseCard } from "./exercise-card"

export default async function MuscleGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const DIFFICULTY_ORDER = { DEBUTANT: 0, INTERMEDIAIRE: 1, AVANCE: 2 }

  const group = await prisma.muscleGroup.findUnique({
    where: { slug },
    include: { exercises: { orderBy: { name: "asc" } } },
  })

  if (!group) notFound()

  group.exercises.sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">{group.name}</span>
      </nav>

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-3">
          {group.image.startsWith("/")
            ? <img src={group.image} alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
            : <span className="text-4xl" aria-hidden="true">{group.image}</span>}
          <h1 className="text-3xl font-bold">{group.name}</h1>
        </div>
        <p className="text-muted-foreground mt-1">{group.exercises.length} exercices disponibles</p>
      </div>

      {/* Grille exercices */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </div>
  )
}
