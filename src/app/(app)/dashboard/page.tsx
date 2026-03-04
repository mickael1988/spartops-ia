import Link from "next/link"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { Dumbbell, Activity, Apple, User, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
              <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-background/80 backdrop-blur-sm">
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
            </Link>
          )
        })}
      </div>
    </div>
  )
}
