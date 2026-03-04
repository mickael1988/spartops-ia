import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export default async function MusculationPage() {
  const groups = await prisma.muscleGroup.findMany({
    include: { _count: { select: { exercises: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Musculation</h1>
        <p className="text-muted-foreground mt-1">Choisissez un groupe musculaire</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => (
          <Link key={group.id} href={`/musculation/${group.slug}`}>
            <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-background/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="text-4xl mb-2">{group.image}</div>
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
