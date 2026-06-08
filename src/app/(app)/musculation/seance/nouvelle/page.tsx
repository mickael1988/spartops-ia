import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { WorkoutForm } from "./workout-form"

export default async function NouvelleSéancePage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const groups = await prisma.muscleGroup.findMany({
    include: { exercises: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
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
        <span className="text-foreground font-medium" aria-current="page">Nouvelle séance</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold">Créer une séance</h1>
        <p className="text-muted-foreground mt-1">Composez votre entraînement sur mesure</p>
      </div>

      <WorkoutForm groups={groups} />
    </div>
  )
}
