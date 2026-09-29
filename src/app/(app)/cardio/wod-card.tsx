import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const BEAM = "conic-gradient(from 0deg, transparent 0%, transparent 30%, #3F5EFB 50%, #F50535 58%, transparent 72%, transparent 100%)"

type LevelKey = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"
type FormatKey = "CIRCUIT" | "AMRAP" | "EMOM" | "FOR_TIME"

const levelConfig: Record<LevelKey, { label: string; className: string }> = {
  DEBUTANT: { label: "Débutant", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  INTERMEDIAIRE: { label: "Intermédiaire", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  AVANCE: { label: "Avancé", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

const formatLabels: Record<FormatKey, string> = {
  CIRCUIT: "Circuit",
  AMRAP: "AMRAP",
  EMOM: "EMOM",
  FOR_TIME: "For Time",
}

type Props = {
  wod: {
    id: string
    name: string
    format: FormatKey
    level: LevelKey
    durationMin: number
    equipment: string | null
    image: string | null
  }
}

export function WodCard({ wod }: Props) {
  const level = levelConfig[wod.level]

  return (
    <Link href={`/cardio/${wod.id}`}>
      <div className="relative rounded-lg p-[2px] overflow-hidden group/card h-full transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] active:shadow-none">
        {/* Gradient animé visible seulement au hover */}
        <div
          className="absolute inset-[-200%] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 animate-border-beam pointer-events-none"
          style={{ background: BEAM }}
        />
        {/* Bordure par défaut */}
        <div className="absolute inset-0 rounded-lg border border-border group-hover/card:border-transparent transition-colors pointer-events-none" />
        <Card className="relative z-10 h-full flex flex-col bg-card border-0">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-2xl" aria-hidden="true">{wod.image ?? "🔥"}</div>
              <Badge className={level.className}>{level.label}</Badge>
            </div>
            <CardTitle className="text-base mt-2">{wod.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-2">
            <span className="text-xs font-semibold text-primary">{formatLabels[wod.format]}</span>
            <p className="text-xs text-muted-foreground">{wod.durationMin} min</p>
            <p className="text-xs text-muted-foreground">
              {wod.equipment ? wod.equipment : "Sans matériel"}
            </p>
          </CardContent>
        </Card>
      </div>
    </Link>
  )
}
