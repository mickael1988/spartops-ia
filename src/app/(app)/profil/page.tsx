import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProfilForm } from "./profil-form"
import { ProfilActivityChart, type WeekData } from "./profil-activity-chart"

function buildChartData(
  workouts: { completedAt: Date | null }[],
  now: Date
): WeekData[] {
  const currentMonth  = now.getUTCMonth()
  const currentYear   = now.getUTCFullYear()
  const currentWeekIdx = Math.ceil(now.getUTCDate() / 7)

  const data: WeekData[] = []

  for (const w of workouts) {
    if (!w.completedAt) continue
    const d = w.completedAt
    const m = d.getUTCMonth()
    const y = d.getUTCFullYear()
    const weekIndex = Math.ceil(d.getUTCDate() / 7)

    const isPrecedent =
      y === (currentMonth === 0 ? currentYear - 1 : currentYear) &&
      m === (currentMonth === 0 ? 11 : currentMonth - 1)
    const isCourant = y === currentYear && m === currentMonth

    if (!isPrecedent && !isCourant) continue

    const mois: "precedent" | "courant" = isCourant ? "courant" : "precedent"
    const isCurrent = isCourant && weekIndex === currentWeekIdx

    const existing = data.find(e => e.mois === mois && e.weekIndex === weekIndex)
    if (existing) {
      existing.count++
    } else {
      data.push({ mois, weekIndex, count: 1, isCurrent })
    }
  }

  return data
}

export default async function ProfilPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })

  const now = new Date()

  const debutMoisPrecedent = new Date(Date.UTC(
    now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear(),
    now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1,
    1
  ))
  const debutMoisSuivant = new Date(Date.UTC(
    now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(),
    now.getUTCMonth() === 11 ? 0 : now.getUTCMonth() + 1,
    1
  ))

  const workouts = await prisma.workout.findMany({
    where: {
      userId: user.id,
      status: "TERMINEE",
      isTemplate: false,
      completedAt: { gte: debutMoisPrecedent, lt: debutMoisSuivant },
    },
    select: { completedAt: true },
  })

  const chartData = buildChartData(workouts, now)

  const MOIS_FR    = ["Janvier","Février","Mars","Avril","Mai","Juin",
                      "Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
  const MOIS_COURT = ["Jan","Fév","Mar","Avr","Mai","Juin",
                      "Juil","Août","Sep","Oct","Nov","Déc"]
  const moisCourantIdx   = now.getUTCMonth()
  const moisPrecedentIdx = moisCourantIdx === 0 ? 11 : moisCourantIdx - 1
  const labelCourant   = MOIS_FR[moisCourantIdx]
  const labelPrecedent = MOIS_FR[moisPrecedentIdx]
  const periode = `${MOIS_COURT[moisPrecedentIdx]} — ${MOIS_COURT[moisCourantIdx]} ${now.getUTCFullYear()}`

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const dateInscription = new Date(user.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mon Profil</h1>
        <p className="text-muted-foreground mt-1">Modifier vos informations personnelles</p>
      </div>

      <ProfilForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
          age: user.age ?? null,
          createdAt: new Date(user.createdAt),
        }}
        initials={initials}
        dateInscription={dateInscription}
      />

      <ProfilActivityChart
        data={chartData}
        labelPrecedent={labelPrecedent}
        labelCourant={labelCourant}
        periode={periode}
      />
    </div>
  )
}
