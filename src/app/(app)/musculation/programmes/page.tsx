import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, PlusCircle } from "lucide-react"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"

export default async function ProgrammesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [programs, templateCount] = await Promise.all([
    prisma.program.findMany({
      where: { userId: session.user.id },
      include: { days: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workout.count({
      where: { userId: session.user.id, isTemplate: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Programmes</span>
      </nav>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Programmes</h1>
          <p className="text-muted-foreground mt-1">Vos programmes multi-jours</p>
        </div>
        {templateCount > 0 && (
          <Link
            href="/musculation/programmes/nouveau"
            className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted active:bg-muted transition-colors"
          >
            <PlusCircle className="h-4 w-4" /> Nouveau programme
          </Link>
        )}
      </div>

      {programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <p className="text-muted-foreground">Aucun programme enregistré.</p>
          {templateCount > 0 ? (
            <Link
              href="/musculation/programmes/nouveau"
              className="rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
            >
              Créer mon premier programme
            </Link>
          ) : (
            <Link
              href="/musculation/seance/nouvelle"
              className="rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
            >
              Créer une séance d&apos;abord
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((program) => (
            <Link key={program.id} href={`/musculation/programmes/${program.id}`}>
              <Card className="bg-background/80 backdrop-blur-sm hover:bg-muted/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{program.name}</span>
                        {program.isActive && (
                          <span className="rounded-full bg-emerald-500/15 text-emerald-600 text-xs font-medium px-2 py-0.5">
                            Actif
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {program.days.length} jour{program.days.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
