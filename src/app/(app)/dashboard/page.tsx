import Link from "next/link"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { Dumbbell, Activity, Apple, User, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const BEAM = "conic-gradient(from 0deg, transparent 0%, transparent 30%, #3F5EFB 50%, #F50535 58%, transparent 72%, transparent 100%)"

const sections = [
  {
    title: "Musculation",
    description: "Parcourez les exercices, créez et suivez vos séances d'entraînement.",
    href: "/musculation",
    icon: Dumbbell,
  },
  {
    title: "Cardio",
    description: "Découvrez les programmes cardio adaptés à votre niveau.",
    href: "/cardio",
    icon: Activity,
  },
  {
    title: "Nutrition",
    description: "Consultez les plans alimentaires et les listes de courses.",
    href: "/nutrition",
    icon: Apple,
  },
  {
    title: "Profil",
    description: "Gérez vos informations personnelles et vos préférences.",
    href: "/profil",
    icon: User,
  },
]

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold">
          Bonjour, {session?.user.name} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Que faisons-nous aujourd&apos;hui ?
        </p>
      </div>

      {/* 4 cartes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <div className="relative rounded-lg p-[2px] overflow-hidden group/card h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div
                  className="absolute inset-[-200%] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 animate-border-beam pointer-events-none"
                  style={{ background: BEAM }}
                />
                <div className="absolute inset-0 rounded-lg border border-border group-hover/card:border-transparent transition-colors pointer-events-none" />
                <Card className="relative z-10 h-full bg-card border-0">
                  <CardHeader className="pb-3">
                    <div
                      className="w-fit rounded-lg p-2.5"
                      style={{ background: "linear-gradient(135deg, #3F5EFB, #F50535)" }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span
                      className="flex items-center gap-1 text-sm font-medium"
                      style={{ color: "#3F5EFB" }}
                    >
                      Accéder <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
