import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
      <Card className="bg-background/80 backdrop-blur-sm h-full flex flex-col hover:border-primary transition-colors">
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
    </Link>
  )
}
