import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { FormatBadge } from "../format-badge"
import { CaloriesChip, ClassicChip, DurationChip, EquipmentChip, LevelChip } from "../wod-meta"
import { ResumeBanner } from "./resume-banner"

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
        <div className="flex flex-wrap gap-2 mt-3">
          <FormatBadge format={wod.format} withHint />
          {wod.isBenchmark && <ClassicChip />}
          <LevelChip level={wod.level} />
          <DurationChip>{DURATION_LABELS[wod.format](wod.durationMin)}</DurationChip>
          <EquipmentChip equipment={wod.equipment} />
          {wod.calories != null && <CaloriesChip calories={wod.calories} />}
        </div>
      </div>

      <ResumeBanner programId={wod.id} />

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

      <Link
        href={`/cardio/${wod.id}/seance`}
        className="block w-full rounded-2xl py-4 text-center text-lg font-bold text-white"
        style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
      >
        Démarrer
      </Link>
    </div>
  )
}
