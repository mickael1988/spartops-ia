import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, BarChart2, Trophy } from "lucide-react"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ProfilForm } from "./profil-form"
import { ProfilActivityChart, type WeekData } from "./profil-activity-chart"
import { Profil1RMChart } from "./profil-1rm-chart"
import type { ExerciseRecord } from "@/app/(app)/musculation/progression/page"

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

const MOIS_FR    = ["Janvier","Février","Mars","Avril","Mai","Juin",
                    "Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
const MOIS_COURT = ["Jan","Fév","Mar","Avr","Mai","Juin",
                    "Juil","Août","Sep","Oct","Nov","Déc"]

export default async function ProfilPage() {
  const session = await getSession()
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

  const [workouts, fundamentalExercises, oneRepMaxes] = await Promise.all([
    prisma.workout.findMany({
    where: {
      userId: user.id,
      status: "TERMINEE",
      isTemplate: false,
      completedAt: { gte: debutMoisPrecedent, lt: debutMoisSuivant },
    },
      select: { completedAt: true },
    }),
    prisma.exercise.findMany({
      where: { isFundamental: true },
      orderBy: { name: "asc" },
    }),
    prisma.oneRepMax.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" },
    }),
  ])

  const chartData = buildChartData(workouts, now)

  const exerciseRecords: ExerciseRecord[] = fundamentalExercises.map(ex => {
    const exEntries = oneRepMaxes.filter(e => e.exerciseId === ex.id)
    return {
      id: ex.id,
      name: ex.name,
      bestMax: exEntries.length > 0 ? Math.max(...exEntries.map(e => e.estimatedMax)) : null,
      history: exEntries.slice(0, 6).reverse().map(e => ({
        id: e.id,
        estimatedMax: e.estimatedMax,
        recordedAt: e.recordedAt.toISOString(),
        inputWeight: e.inputWeight,
        inputReps: e.inputReps,
        isManual: e.isManual,
      })),
    }
  })

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

      <Profil1RMChart exercises={exerciseRecords} />

      {/* Liens stats & records */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/musculation/stats"
          className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-fit rounded-xl p-2 shrink-0" style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}>
              <BarChart2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Statistiques</p>
              <p className="text-xs text-muted-foreground">Streak, volume, favori</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>

        <Link
          href="/musculation/records"
          className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-fit rounded-xl p-2 shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Records personnels</p>
              <p className="text-xs text-muted-foreground">Meilleur poids par exercice</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      </div>

      <ProfilActivityChart
        data={chartData}
        labelPrecedent={labelPrecedent}
        labelCourant={labelCourant}
        periode={periode}
      />
    </div>
  )
}
