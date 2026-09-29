import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"

const LEVEL_LABELS = { DEBUTANT: "Débutant", INTERMEDIAIRE: "Intermédiaire", AVANCE: "Avancé" } as const
const FORMAT_LABELS = { CIRCUIT: "Circuit", AMRAP: "AMRAP", EMOM: "EMOM", FOR_TIME: "For Time" } as const

const DURATION_LABELS = {
  CIRCUIT: (n: number) => `Durée totale : ${n} min`,
  AMRAP: (n: number) => `Temps limite : ${n} min`,
  EMOM: (n: number) => `Une série chaque minute pendant ${n} min`,
  FOR_TIME: (n: number) => `Temps indicatif : ${n} min`,
} as const

function formatStepUnit(step: { durationSec: number | null; reps: number | null; distanceM: number | null }) {
  if (step.durationSec !== null) return `${step.durationSec}s`
  if (step.distanceM !== null) return `${step.distanceM.toLocaleString("fr-FR")} m`
  return `${step.reps} reps`
}

export default async function CardioWodPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const wod = await prisma.cardioProgram.findFirst({
    where: { id, userId: null },
    include: {
      steps: {
        include: { cardioExercise: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!wod) notFound()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href={wod.isBenchmark ? "/cardio?tab=classiques" : "/cardio"}
          className="hover:text-foreground transition-colors"
        >
          Cardio
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">{wod.name}</span>
      </nav>

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">{wod.image ?? "🔥"}</span>
          <h1 className="text-3xl font-bold">{wod.name}</h1>
        </div>
        <p className="text-muted-foreground mt-1">{wod.description}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
          <span className="font-semibold text-primary">{FORMAT_LABELS[wod.format]}</span>
          {wod.isBenchmark && <span className="font-semibold text-[#F50535]">Classique</span>}
          <span>{LEVEL_LABELS[wod.level]}</span>
          <span>{DURATION_LABELS[wod.format](wod.durationMin)}</span>
          <span>{wod.equipment ?? "Sans matériel"}</span>
          {wod.calories != null && <span>~{wod.calories} kcal</span>}
        </div>
      </div>

      {/* Déroulé des étapes */}
      <div className="space-y-2">
        {wod.steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center gap-3 rounded-xl border bg-background/80 backdrop-blur-sm px-4 py-3"
          >
            <span className="text-2xl" aria-hidden="true">{step.cardioExercise.image ?? "🔥"}</span>
            <div className="flex-1">
              <p className="font-medium text-sm">{step.cardioExercise.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatStepUnit(step)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bouton Démarrer — non branché à cette étape */}
      <div className="space-y-2">
        <button
          disabled
          title="Bientôt disponible"
          aria-describedby="start-hint"
          className="w-full rounded-2xl py-4 text-lg font-bold text-white opacity-50 cursor-not-allowed"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          Démarrer
        </button>
        <p id="start-hint" className="text-center text-xs text-muted-foreground">Bientôt disponible</p>
      </div>
    </div>
  )
}
