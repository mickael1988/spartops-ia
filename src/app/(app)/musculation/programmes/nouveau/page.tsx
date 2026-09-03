import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ProgramForm } from "./program-form"

export default async function NouveauProgrammePage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const templates = await prisma.workout.findMany({
    where: { userId: session.user.id, isTemplate: true },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/musculation/programmes" className="hover:text-foreground transition-colors">
          Programmes
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Nouveau</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold">Nouveau programme</h1>
        <p className="text-muted-foreground mt-1">
          Enchaînez vos séances existantes dans l&apos;ordre de votre choix
        </p>
      </div>

      <ProgramForm templates={templates} />
    </div>
  )
}
