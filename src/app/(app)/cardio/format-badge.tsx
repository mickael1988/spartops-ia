import { Flag, Infinity as InfinityIcon, Repeat, Timer, type LucideIcon } from "lucide-react"
import { MetaChip } from "./wod-meta"

export type CardioFormatKey = "CIRCUIT" | "AMRAP" | "EMOM" | "FOR_TIME"

export const FORMAT_CONFIG: Record<
  CardioFormatKey,
  { label: string; hint: string; icon: LucideIcon; className: string }
> = {
  CIRCUIT: {
    label: "Circuit",
    hint: "Enchaîne les exercices",
    icon: Repeat,
    className: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
  },
  AMRAP: {
    label: "AMRAP",
    hint: "Max de tours",
    icon: InfinityIcon,
    className: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300",
  },
  EMOM: {
    label: "EMOM",
    hint: "Chaque minute",
    icon: Timer,
    className: "bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300",
  },
  FOR_TIME: {
    label: "For Time",
    hint: "Le plus vite possible",
    icon: Flag,
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
  },
}

/** Pastille du format, même style discret que les autres infos du WOD. */
export function FormatBadge({
  format,
  withHint = false,
  className,
}: {
  format: CardioFormatKey
  withHint?: boolean
  className?: string
}) {
  const { label, hint, icon, className: colors } = FORMAT_CONFIG[format]

  return (
    <MetaChip icon={icon} className={className ? `${colors} ${className}` : colors}>
      {label}
      {withHint && <span className="font-normal opacity-80">· {hint}</span>}
    </MetaChip>
  )
}
