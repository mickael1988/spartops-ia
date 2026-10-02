import {
  Clock,
  Dumbbell,
  Flame,
  PersonStanding,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Trophy,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CardioLevelKey = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"

export const LEVEL_CONFIG: Record<CardioLevelKey, { label: string; icon: LucideIcon; className: string }> = {
  DEBUTANT: {
    label: "Débutant",
    icon: SignalLow,
    className: "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-300",
  },
  INTERMEDIAIRE: {
    label: "Intermédiaire",
    icon: SignalMedium,
    className: "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300",
  },
  AVANCE: {
    label: "Avancé",
    icon: SignalHigh,
    className: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
  },
}

export const EQUIPMENT_ICONS = { sans: PersonStanding, avec: Dumbbell } as const

const NEUTRAL = "bg-muted/60 text-foreground/80 border-border"

/** Pastille discrète : icône + texte, teinte légère. */
export function MetaChip({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        className ?? NEUTRAL,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  )
}

export function LevelChip({ level }: { level: CardioLevelKey }) {
  const { label, icon, className } = LEVEL_CONFIG[level]
  return <MetaChip icon={icon} className={className}>{label}</MetaChip>
}

export function EquipmentChip({ equipment }: { equipment: string | null }) {
  return equipment ? (
    <MetaChip icon={EQUIPMENT_ICONS.avec}>{equipment}</MetaChip>
  ) : (
    <MetaChip icon={EQUIPMENT_ICONS.sans}>Sans matériel</MetaChip>
  )
}

export function ClassicChip() {
  return (
    <MetaChip icon={Trophy} className="bg-[#F50535]/10 text-[#C7042B] border-[#F50535]/30 dark:text-[#FF5C7A]">
      Classique
    </MetaChip>
  )
}

export function DurationChip({ children }: { children: React.ReactNode }) {
  return <MetaChip icon={Clock}>{children}</MetaChip>
}

export function CaloriesChip({ calories }: { calories: number }) {
  return <MetaChip icon={Flame}>~{calories} kcal</MetaChip>
}
