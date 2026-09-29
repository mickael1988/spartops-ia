import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { WodCard } from "./wod-card"

const FORMATS = [
  { value: "CIRCUIT", label: "Circuit" },
  { value: "AMRAP", label: "AMRAP" },
  { value: "EMOM", label: "EMOM" },
  { value: "FOR_TIME", label: "For Time" },
] as const

const LEVELS = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
] as const

function FilterPill({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </Link>
  )
}

export default async function CardioPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; level?: string; equipment?: string }>
}) {
  const { format, level, equipment } = await searchParams

  const VALID_FORMATS = ["CIRCUIT", "AMRAP", "EMOM", "FOR_TIME"] as const
  const VALID_LEVELS = ["DEBUTANT", "INTERMEDIAIRE", "AVANCE"] as const

  const validFormat = VALID_FORMATS.find((f) => f === format)
  const validLevel = VALID_LEVELS.find((l) => l === level)

  const wods = await prisma.cardioProgram.findMany({
    where: {
      userId: null,
      format: validFormat,
      level: validLevel,
      equipment: equipment === "sans" ? null : equipment === "avec" ? { not: null } : undefined,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, format: true, level: true, durationMin: true, equipment: true, image: true },
  })

  function buildHref(next: Partial<{ format: string; level: string; equipment: string }>) {
    const params = new URLSearchParams()
    const merged = { format, level, equipment, ...next }
    if (merged.format) params.set("format", merged.format)
    if (merged.level) params.set("level", merged.level)
    if (merged.equipment) params.set("equipment", merged.equipment)
    const qs = params.toString()
    return qs ? `/cardio?${qs}` : "/cardio"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cardio</h1>
        <p className="text-muted-foreground mt-1">{wods.length} WOD disponibles</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <FilterPill href={buildHref({ format: undefined })} active={!format}>Tous les formats</FilterPill>
          {FORMATS.map((f) => (
            <FilterPill key={f.value} href={buildHref({ format: f.value })} active={format === f.value}>
              {f.label}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill href={buildHref({ level: undefined })} active={!level}>Tous les niveaux</FilterPill>
          {LEVELS.map((l) => (
            <FilterPill key={l.value} href={buildHref({ level: l.value })} active={level === l.value}>
              {l.label}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill href={buildHref({ equipment: undefined })} active={!equipment}>Tout matériel</FilterPill>
          <FilterPill href={buildHref({ equipment: "sans" })} active={equipment === "sans"}>Sans matériel</FilterPill>
          <FilterPill href={buildHref({ equipment: "avec" })} active={equipment === "avec"}>Avec matériel</FilterPill>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wods.map((wod) => (
          <WodCard key={wod.id} wod={wod} />
        ))}
      </div>
    </div>
  )
}
