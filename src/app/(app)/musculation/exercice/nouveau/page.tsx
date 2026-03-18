import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ExerciseForm } from "./exercise-form"

export default async function NouvelExercicePage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const muscleGroups = await prisma.muscleGroup.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Nouvel exercice</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold">Créer un exercice</h1>
        <p className="text-muted-foreground mt-1">Il sera ajouté au catalogue du groupe musculaire choisi</p>
      </div>

      <ExerciseForm muscleGroups={muscleGroups} />
    </div>
  )
}
