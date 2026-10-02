import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormatBadge, type CardioFormatKey } from "./format-badge"
import { DurationChip, EquipmentChip, LevelChip, type CardioLevelKey } from "./wod-meta"

const BEAM = "conic-gradient(from 0deg, transparent 0%, transparent 30%, #3F5EFB 50%, #F50535 58%, transparent 72%, transparent 100%)"

type Props = {
  wod: {
    id: string
    name: string
    format: CardioFormatKey
    level: CardioLevelKey
    durationMin: number
    equipment: string | null
    image: string | null
  }
}

export function WodCard({ wod }: Props) {
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
              <LevelChip level={wod.level} />
            </div>
            <CardTitle className="text-base mt-2">{wod.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-2">
            <div className="flex flex-wrap gap-1.5">
              <FormatBadge format={wod.format} />
              <DurationChip>{wod.durationMin} min</DurationChip>
              <EquipmentChip equipment={wod.equipment} />
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  )
}
