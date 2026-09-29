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
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "text-white border-transparent"
          : "text-muted-foreground hover:border-primary hover:text-primary"
      }`}
      style={active ? { background: "linear-gradient(to right, #3F5EFB, #F50535)" } : undefined}
    >
      {children}
    </Link>
  )
}

function TabLink({
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
      aria-current={active ? "page" : undefined}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "text-white border-transparent"
          : "text-muted-foreground hover:border-primary hover:text-primary"
      }`}
      style={active ? { background: "linear-gradient(to right, #3F5EFB, #F50535)" } : undefined}
    >
      {children}
    </Link>
  )
}

export default async function CardioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; format?: string; level?: string; equipment?: string }>
}) {
  const { tab: rawTab, format, level, equipment } = await searchParams

  const tab = rawTab === "classiques" ? "classiques" : "catalogue"
  const validFormat = FORMATS.find((f) => f.value === format)?.value
  const validLevel = LEVELS.find((l) => l.value === level)?.value
  const validEquipment = equipment === "avec" || equipment === "sans" ? equipment : undefined

  const wods = await prisma.cardioProgram.findMany({
    where: {
      userId: null,
      isBenchmark: tab === "classiques",
      format: validFormat,
      level: validLevel,
      equipment: validEquipment === "sans" ? null : validEquipment === "avec" ? { not: null } : undefined,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, format: true, level: true, durationMin: true, equipment: true, image: true },
  })

  function buildHref(next: Partial<{ format: string; level: string; equipment: string }>) {
    const params = new URLSearchParams()
    const merged = { format: validFormat, level: validLevel, equipment: validEquipment, ...next }
    if (tab === "classiques") params.set("tab", "classiques")
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
        {tab === "classiques" && (
          <p className="text-muted-foreground mt-1">
            Les benchmarks historiques du CrossFit, à refaire régulièrement pour mesurer ta progression.
          </p>
        )}
        <p className="text-muted-foreground mt-1">{wods.length} WOD disponible{wods.length > 1 ? "s" : ""}</p>
      </div>

      <nav aria-label="Catalogue" className="flex gap-2">
        <TabLink href="/cardio" active={tab === "catalogue"}>Nos WOD</TabLink>
        <TabLink href="/cardio?tab=classiques" active={tab === "classiques"}>Classiques</TabLink>
      </nav>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <FilterPill href={buildHref({ format: undefined })} active={!validFormat}>Tous les formats</FilterPill>
          {FORMATS.map((f) => (
            <FilterPill key={f.value} href={buildHref({ format: f.value })} active={validFormat === f.value}>
              {f.label}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill href={buildHref({ level: undefined })} active={!validLevel}>Tous les niveaux</FilterPill>
          {LEVELS.map((l) => (
            <FilterPill key={l.value} href={buildHref({ level: l.value })} active={validLevel === l.value}>
              {l.label}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill href={buildHref({ equipment: undefined })} active={!validEquipment}>Tout matériel</FilterPill>
          <FilterPill href={buildHref({ equipment: "sans" })} active={validEquipment === "sans"}>Sans matériel</FilterPill>
          <FilterPill href={buildHref({ equipment: "avec" })} active={validEquipment === "avec"}>Avec matériel</FilterPill>
        </div>
      </div>

      {wods.length === 0 ? (
        <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Aucun WOD ne correspond à ces filtres.</p>
          <Link
            href={buildHref({ format: undefined, level: undefined, equipment: undefined })}
            className="text-sm font-medium text-primary hover:underline"
          >
            Réinitialiser les filtres
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wods.map((wod) => (
            <WodCard key={wod.id} wod={wod} />
          ))}
        </div>
      )}
    </div>
  )
}
