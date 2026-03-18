# 1RM Progression Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un tableau de progression 1RM accessible depuis `/musculation/progression`, avec graphiques SVG natifs, calculateur Epley, saisie directe, et intégration agenda.

**Architecture:** Le server component `page.tsx` charge les 3 exercices fondamentaux (`isFundamental: true`), l'historique 1RM de l'utilisateur et l'état de planification, puis passe tout au client component `ProgressionClient`. Les server actions gèrent la sauvegarde des entrées et la planification dans l'agenda. Le drawer de l'agenda est modifié pour gérer le workout "Test 1RM" de façon spéciale.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui (Card), Prisma 7, SVG natif, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-17-1rm-progression-design.md`

---

## Fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `prisma/schema.prisma` | Modifier | Ajouter `isFundamental` sur `Exercise` + modèle `OneRepMax` |
| `prisma/seed-1rm.ts` | Créer | Marquer les 3 exercices fondamentaux `isFundamental: true` |
| `src/app/(app)/musculation/progression/actions.ts` | Créer | Server actions : `save1RM`, `scheduleTest` |
| `src/app/(app)/musculation/progression/page.tsx` | Créer | Server component : fetch exercices + historique |
| `src/app/(app)/musculation/progression/progression-client.tsx` | Créer | Client : bannière + 3 cartes SVG + formulaires |
| `src/app/(app)/musculation/page.tsx` | Modifier | Ajouter carte "Tester mon 1RM" |
| `src/app/(app)/agenda/agenda-drawer.tsx` | Modifier | Cas spécial pour workout "Test 1RM" |

---

## Chunk 1 : Schéma Prisma + Seed

### Task 1 : Modifier le schéma Prisma et régénérer le client

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1 : Ajouter `isFundamental` sur `Exercise` et le modèle `OneRepMax`**

Dans `prisma/schema.prisma` :

Sur le modèle `Exercise`, ajouter après `defaultRestSeconds` :
```prisma
  isFundamental Boolean  @default(false)
  oneRepMaxes   OneRepMax[]
```

Sur le modèle `User`, ajouter après `cardioSessions` :
```prisma
  oneRepMaxes   OneRepMax[]
```

Ajouter le nouveau modèle après le bloc `// MUSCULATION` (après `SetLog`) :
```prisma
model OneRepMax {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  exerciseId   String
  exercise     Exercise @relation(fields: [exerciseId], references: [id], onDelete: Restrict)
  estimatedMax Float
  recordedAt   DateTime @default(now())
  inputWeight  Float?
  inputReps    Int?
  isManual     Boolean  @default(false)
}
```

- [ ] **Step 2 : Pousser le schéma en base**

```bash
pnpm db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3 : Régénérer le client Prisma (WASM runtime)**

```bash
rm -rf src/generated/prisma && pnpm db:generate
```

Expected: `Prisma Client generated` (pas d'erreur).

- [ ] **Step 4 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "schema|OneRepMax|isFundamental|error TS"
```

Expected: aucune sortie.

- [ ] **Step 5 : Commit**

```bash
git add prisma/schema.prisma src/generated/prisma
git commit -m "feat: add isFundamental to Exercise and OneRepMax model"
```

---

### Task 2 : Créer le script de seed pour marquer les exercices fondamentaux

**Files:**
- Create: `prisma/seed-1rm.ts`

- [ ] **Step 1 : Créer `prisma/seed-1rm.ts`**

```ts
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function getTcpConnectionString(url: string): string {
  if (!url.startsWith("prisma+postgres://")) return url
  const parsed = new URL(url)
  const apiKey = parsed.searchParams.get("api_key")
  if (!apiKey) throw new Error("api_key manquant dans DATABASE_URL")
  try {
    const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf8"))
    return decoded.databaseUrl
  } catch {
    throw new Error("Impossible de décoder la DATABASE_URL prisma+postgres://")
  }
}

const connectionString = getTcpConnectionString(process.env.DATABASE_URL!)
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const FUNDAMENTAL_NAMES = ["Squat", "Développé couché", "Soulevé de terre"]

async function main() {
  for (const name of FUNDAMENTAL_NAMES) {
    const result = await prisma.exercise.updateMany({
      where: { name },
      data: { isFundamental: true },
    })
    console.log(`${name}: ${result.count} exercice(s) marqué(s)`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2 : Exécuter le script**

```bash
pnpm tsx prisma/seed-1rm.ts
```

Expected :
```
Squat: 1 exercice(s) marqué(s)
Développé couché: 1 exercice(s) marqué(s)
Soulevé de terre: 1 exercice(s) marqué(s)
```

Si un exercice retourne `0`, vérifier son nom exact dans la base avec `pnpm db:studio`.

- [ ] **Step 3 : Commit**

```bash
git add prisma/seed-1rm.ts
git commit -m "feat: seed isFundamental flag on big 3 exercises"
```

---

## Chunk 2 : Server actions + Page serveur

### Task 3 : Créer les server actions

**Files:**
- Create: `src/app/(app)/musculation/progression/actions.ts`

- [ ] **Step 1 : Créer `src/app/(app)/musculation/progression/actions.ts`**

```ts
"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function save1RM(
  exerciseId: string,
  estimatedMax: number,
  inputWeight: number | null,
  inputReps: number | null,
  isManual: boolean
): Promise<{ error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Non authentifié" }

  if (estimatedMax <= 0 || estimatedMax > 500)
    return { error: "1RM invalide (entre 1 et 500 kg)" }

  if (!isManual) {
    if (!inputWeight || inputWeight <= 0) return { error: "Poids invalide" }
    if (!inputReps || inputReps < 1 || inputReps > 30)
      return { error: "Répétitions invalides (entre 1 et 30)" }
  }

  await prisma.oneRepMax.create({
    data: {
      userId: session.user.id,
      exerciseId,
      estimatedMax,
      inputWeight,
      inputReps,
      isManual,
    },
  })

  revalidatePath("/musculation/progression")
  return {}
}

export async function scheduleTest(): Promise<{ error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Non authentifié" }

  const now = new Date()

  const existing = await prisma.workout.findFirst({
    where: {
      userId: session.user.id,
      name: "Test 1RM",
      status: "PLANIFIEE",
      scheduledAt: { gte: now },
    },
  })
  if (existing) return { error: "Un test est déjà planifié" }

  const scheduledAt = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)

  await prisma.workout.create({
    data: {
      userId: session.user.id,
      name: "Test 1RM",
      isTemplate: false,
      status: "PLANIFIEE",
      scheduledAt,
    },
  })

  revalidatePath("/agenda")
  revalidatePath("/musculation/progression")
  return {}
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "progression|error TS"
```

Expected: aucune sortie.

- [ ] **Step 3 : Commit**

```bash
git add 'src/app/(app)/musculation/progression/actions.ts'
git commit -m "feat: add save1RM and scheduleTest server actions"
```

---

### Task 4 : Créer la page serveur

**Files:**
- Create: `src/app/(app)/musculation/progression/page.tsx`

- [ ] **Step 1 : Créer `src/app/(app)/musculation/progression/page.tsx`**

```tsx
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProgressionClient } from "./progression-client"

export type OneRepMaxEntry = {
  id: string
  estimatedMax: number
  recordedAt: string
  inputWeight: number | null
  inputReps: number | null
  isManual: boolean
}

export type ExerciseRecord = {
  id: string
  name: string
  bestMax: number | null  // max sur tout l'historique, calculé côté serveur
  history: OneRepMaxEntry[]
}

export default async function ProgressionPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const [exercises, allEntries, scheduledTest] = await Promise.all([
    prisma.exercise.findMany({
      where: { isFundamental: true },
      orderBy: { name: "asc" },
    }),
    prisma.oneRepMax.findMany({
      where: { userId: session.user.id },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.workout.findFirst({
      where: {
        userId: session.user.id,
        name: "Test 1RM",
        status: "PLANIFIEE",
        scheduledAt: { gte: new Date() },
      },
    }),
  ])

  // Build per-exercise history: bestMax sur tout l'historique, 6 entrées les plus récentes pour le graphique
  const exerciseRecords: ExerciseRecord[] = exercises.map(ex => {
    const exEntries = allEntries.filter(e => e.exerciseId === ex.id)
    return {
      id: ex.id,
      name: ex.name,
      bestMax: exEntries.length > 0 ? Math.max(...exEntries.map(e => e.estimatedMax)) : null,
      history: exEntries
        .slice(0, 6)
        .reverse()
        .map(e => ({
          id: e.id,
          estimatedMax: e.estimatedMax,
          recordedAt: e.recordedAt.toISOString(),
          inputWeight: e.inputWeight,
          inputReps: e.inputReps,
          isManual: e.isManual,
        })),
    }
  })

  // Most recent entry across all exercises for banner
  const lastEntryDate = allEntries[0]?.recordedAt?.toISOString() ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progression 1RM</h1>
        <p className="text-muted-foreground mt-1">
          Suivez votre force sur les exercices fondamentaux
        </p>
      </div>

      <ProgressionClient
        exercises={exerciseRecords}
        lastEntryDate={lastEntryDate}
        hasScheduled={!!scheduledTest}
      />
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "progression|error TS"
```

Expected: erreur sur `ProgressionClient` uniquement (pas encore créé) — aucune autre erreur.

- [ ] **Step 3 : Commit**

```bash
git add 'src/app/(app)/musculation/progression/page.tsx'
git commit -m "feat: add progression server page with 1RM history fetch"
```

---

## Chunk 3 : Composant client

### Task 5 : Créer `ProgressionClient` avec graphiques SVG et formulaires

**Files:**
- Create: `src/app/(app)/musculation/progression/progression-client.tsx`

- [ ] **Step 1 : Créer `src/app/(app)/musculation/progression/progression-client.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, CalendarDays, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { save1RM, scheduleTest } from "./actions"
import type { ExerciseRecord, OneRepMaxEntry } from "./page"

type Props = {
  exercises: ExerciseRecord[]
  lastEntryDate: string | null
  hasScheduled: boolean
}

// Formule d'Epley : 1RM ≈ poids × (1 + reps / 30)
function calcEpley(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30))
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

// ─── SVG Line Chart ────────────────────────────────────────────────────────────

function ProgressionChart({ history }: { history: OneRepMaxEntry[] }) {
  const W = 240
  const H = 80
  const PAD = { top: 14, right: 8, bottom: 20, left: 30 }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
        Aucune donnée
      </div>
    )
  }

  const values = history.map(e => e.estimatedMax)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  function xPos(i: number) {
    return PAD.left + (history.length === 1 ? chartW / 2 : (i / (history.length - 1)) * chartW)
  }
  function yPos(v: number) {
    return PAD.top + chartH - ((v - minVal) / range) * chartH
  }

  const points = history.map((e, i) => ({ x: xPos(i), y: yPos(e.estimatedMax) }))
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")

  function shortDate(iso: string) {
    const d = new Date(iso)
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      {/* Y axis labels */}
      <text x={PAD.left - 4} y={PAD.top + 4} fontSize="9" fill="#6b7280" textAnchor="end">
        {maxVal}
      </text>
      {minVal !== maxVal && (
        <text x={PAD.left - 4} y={PAD.top + chartH} fontSize="9" fill="#6b7280" textAnchor="end">
          {minVal}
        </text>
      )}

      {/* Line */}
      {history.length > 1 && (
        <path d={linePath} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
      )}

      {/* Points + value labels + date labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#f97316" />
          <text
            x={p.x}
            y={Math.max(p.y - 5, PAD.top + 4)}
            fontSize="8"
            fill="#f97316"
            textAnchor="middle"
          >
            {history[i].estimatedMax}
          </text>
          <text x={p.x} y={H - 2} fontSize="8" fill="#6b7280" textAnchor="middle">
            {shortDate(history[i].recordedAt)}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── Exercise Card ─────────────────────────────────────────────────────────────

function ExerciseCard({ exercise }: { exercise: ExerciseRecord }) {
  const [mode, setMode] = useState<"calculator" | "direct">("calculator")
  const [weight, setWeight] = useState("")
  const [reps, setReps] = useState("")
  const [directMax, setDirectMax] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const bestMax = exercise.bestMax  // calculé côté serveur sur tout l'historique

  const epleyResult =
    mode === "calculator" && weight && reps
      ? calcEpley(parseFloat(weight), parseInt(reps))
      : null

  function handleSave() {
    setError(null)
    let estimatedMax: number
    let inputWeight: number | null = null
    let inputReps: number | null = null

    if (mode === "calculator") {
      const w = parseFloat(weight)
      const r = parseInt(reps)
      if (!weight || !reps || isNaN(w) || isNaN(r)) {
        setError("Renseignez le poids et les répétitions")
        return
      }
      inputWeight = w
      inputReps = r
      estimatedMax = calcEpley(w, r)
    } else {
      const v = parseFloat(directMax)
      if (!directMax || isNaN(v)) {
        setError("Renseignez le 1RM")
        return
      }
      estimatedMax = v
    }

    startTransition(async () => {
      const res = await save1RM(exercise.id, estimatedMax, inputWeight, inputReps, mode === "direct")
      if (res.error) {
        setError(res.error)
      } else {
        setWeight("")
        setReps("")
        setDirectMax("")
      }
    })
  }

  return (
    <Card className="bg-background/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{exercise.name}</CardTitle>
          <span className="text-xl font-bold text-orange-500 shrink-0">
            {bestMax !== null ? `${bestMax} kg` : "— kg"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Graphique */}
        <ProgressionChart history={exercise.history} />

        {/* Toggle mode */}
        <div className="flex gap-3 text-xs border-b pb-2">
          <button
            onClick={() => setMode("calculator")}
            className={`font-medium transition-colors ${
              mode === "calculator" ? "text-orange-500" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Calculateur Epley
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            onClick={() => setMode("direct")}
            className={`font-medium transition-colors ${
              mode === "direct" ? "text-orange-500" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Saisie directe
          </button>
        </div>

        {/* Formulaire */}
        {mode === "calculator" ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Poids (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="100"
                  min="1"
                  className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Répétitions</label>
                <input
                  type="number"
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                  placeholder="5"
                  min="1"
                  max="30"
                  className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {epleyResult !== null && (
              <p className="text-xs text-muted-foreground">
                1RM estimé :{" "}
                <span className="font-semibold text-orange-500">{epleyResult} kg</span>
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">1RM (kg)</label>
            <input
              type="number"
              value={directMax}
              onChange={e => setDirectMax(e.target.value)}
              placeholder="120"
              min="1"
              className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(to right, #ea580c, #f97316)" }}
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Enregistrer
        </button>
      </CardContent>
    </Card>
  )
}

// ─── Main client component ─────────────────────────────────────────────────────

export function ProgressionClient({ exercises, lastEntryDate, hasScheduled }: Props) {
  const router = useRouter()
  const [isScheduling, startSchedule] = useTransition()
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const daysSinceLast = lastEntryDate ? daysSince(lastEntryDate) : null
  const needsTest = daysSinceLast === null || daysSinceLast > 30

  function handleSchedule() {
    setScheduleError(null)
    startSchedule(async () => {
      const res = await scheduleTest()
      if (res.error) {
        setScheduleError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Bannière de rappel */}
      <div
        className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${
          needsTest
            ? "bg-orange-500/10 border-orange-500/30"
            : "bg-muted/50 border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <TrendingUp
            className={`h-4 w-4 shrink-0 ${needsTest ? "text-orange-500" : "text-muted-foreground"}`}
          />
          <p className={`text-sm ${needsTest ? "text-orange-500 font-medium" : "text-muted-foreground"}`}>
            {daysSinceLast === null
              ? "Aucun test enregistré — commencez dès maintenant !"
              : `Dernier test il y a ${daysSinceLast} jour${daysSinceLast > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {scheduleError && (
            <p className="text-xs text-destructive">{scheduleError}</p>
          )}
          {hasScheduled ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Déjà planifié
            </div>
          ) : (
            <button
              onClick={handleSchedule}
              disabled={isScheduling}
              className="flex items-center gap-1.5 text-xs font-medium rounded-lg border border-orange-500/40 px-3 py-1.5 text-orange-500 hover:bg-orange-500/10 transition-colors disabled:opacity-50"
            >
              {isScheduling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CalendarDays className="h-3 w-3" />
              )}
              Planifier dans l'agenda
            </button>
          )}
        </div>
      </div>

      {/* 3 cartes exercices */}
      <div className="grid gap-4 md:grid-cols-3">
        {exercises.map(ex => (
          <ExerciseCard key={ex.id} exercise={ex} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript complet**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "progression|error TS"
```

Expected: aucune erreur.

- [ ] **Step 3 : Vérifier le build**

```bash
pnpm build 2>&1 | grep -E "progression|error|Error"
```

Expected: `/musculation/progression` apparaît dans la liste des routes, 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add 'src/app/(app)/musculation/progression/progression-client.tsx'
git commit -m "feat: add ProgressionClient with SVG charts, Epley calculator and direct input"
```

---

## Chunk 4 : Intégration

### Task 6 : Ajouter la carte "Tester mon 1RM" sur la page musculation

**Files:**
- Modify: `src/app/(app)/musculation/page.tsx`

- [ ] **Step 1 : Ajouter `TrendingUp` à l'import lucide-react**

Dans `src/app/(app)/musculation/page.tsx`, ligne 4, modifier l'import :

```tsx
import { ArrowRight, PlusCircle, Dumbbell, TrendingUp } from "lucide-react"
```

- [ ] **Step 2 : Ajouter la carte après "Créer un exercice"**

Après le bloc `{/* Créer un exercice */}` (qui se termine avec `</Link>` avant le `</div>` fermant de la row de cartes), ajouter :

```tsx
        {/* Tester mon 1RM */}
        <Link href="/musculation/progression" className="w-full sm:max-w-xs">
          <div className="relative rounded-lg p-[2px] overflow-hidden group/1rm transition-all hover:-translate-y-1 hover:shadow-lg h-full">
            <div className="absolute inset-[-200%] opacity-0 group-hover/1rm:opacity-100 transition-opacity duration-300 animate-border-beam pointer-events-none" style={{ background: BEAM }} />
            <div className="absolute inset-0 rounded-lg border border-border group-hover/1rm:border-transparent transition-colors pointer-events-none" />
            <Card className="relative z-10 bg-card border-0 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-fit rounded-xl p-2.5 shrink-0" style={{ background: "linear-gradient(135deg, #7C3AED, #F97316)" }}>
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Tester mon 1RM</CardTitle>
                    <p className="text-xs text-muted-foreground">Suivez votre progression</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "#7C3AED" }}>
                  Progression <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </div>
        </Link>
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "musculation/page|error TS"
```

Expected: aucune sortie.

- [ ] **Step 4 : Commit**

```bash
git add 'src/app/(app)/musculation/page.tsx'
git commit -m "feat: add Tester mon 1RM card on musculation page"
```

---

### Task 7 : Modifier le drawer agenda pour le workout "Test 1RM"

**Files:**
- Modify: `src/app/(app)/agenda/agenda-drawer.tsx`

**Contexte :** Le workout "Test 1RM" créé par `scheduleTest` n'a aucun exercice. Dans le drawer, il faut l'identifier par `event.name === "Test 1RM"` et le traiter spécialement : afficher "Test de force — 1RM" à la place d'exercices, bouton "Démarrer" → `/musculation/progression`, pas de bouton "Modifier".

- [ ] **Step 1 : Modifier le bloc séances dans `src/app/(app)/agenda/agenda-drawer.tsx`**

Remplacer **entièrement** le bloc `{/* Séances du jour */}` (lignes 121-187 du fichier actuel). Voici le bloc exact à remplacer (copier-coller exact pour trouver la correspondance) :

```tsx
          {/* Séances du jour */}
          {hasEvents && events.map(event => (
            <div key={event.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div>
                <p className="font-semibold">{event.name}</p>
                {event.exercises.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.exercises.slice(0, 3).map(e => e.name).join(" · ")}
                    {event.exercises.length > 3 && " · …"}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { onClose(); router.push(`/musculation/seance/${event.id}/live`) }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
                >
                  <Play className="h-3.5 w-3.5" /> Démarrer
                </button>
                <button
                  onClick={() => { onClose(); router.push(`/musculation/seance/${event.id}`) }}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </button>
              </div>

              {/* Reprogrammer */}
              {reschedulingId === event.id ? (
                <div className="flex gap-2 pt-1">
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => handleReschedule(event.id)}
                    disabled={!newDate || isPending}
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    OK
                  </button>
                  <button
                    onClick={() => { setReschedulingId(null); setNewDate("") }}
                    className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setReschedulingId(event.id)
                    setNewDate(toInputDate(new Date(event.scheduledAt)))
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Changer la date
                </button>
              )}
            </div>
          ))}
```

Remplacer par (bloc complet incluant Reprogrammer, section inchangée) :

```tsx
          {/* Séances du jour */}
          {hasEvents && events.map(event => {
            const isTestEvent = event.name === "Test 1RM"
            return (
              <div key={event.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div>
                  <p className="font-semibold">{event.name}</p>
                  {isTestEvent ? (
                    <p className="text-xs text-muted-foreground mt-1">Test de force — 1RM</p>
                  ) : event.exercises.length > 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.exercises.slice(0, 3).map(e => e.name).join(" · ")}
                      {event.exercises.length > 3 && " · …"}
                    </p>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onClose()
                      router.push(isTestEvent ? "/musculation/progression" : `/musculation/seance/${event.id}/live`)
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
                  >
                    <Play className="h-3.5 w-3.5" /> Démarrer
                  </button>
                  {!isTestEvent && (
                    <button
                      onClick={() => { onClose(); router.push(`/musculation/seance/${event.id}`) }}
                      className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </button>
                  )}
                </div>

                {/* Reprogrammer — inchangé */}
                {reschedulingId === event.id ? (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleReschedule(event.id)}
                      disabled={!newDate || isPending}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                      {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      OK
                    </button>
                    <button
                      onClick={() => { setReschedulingId(null); setNewDate("") }}
                      className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setReschedulingId(event.id)
                      setNewDate(toInputDate(new Date(event.scheduledAt)))
                    }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CalendarDays className="h-3.5 w-3.5" /> Changer la date
                  </button>
                )}
              </div>
            )
          })}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "agenda-drawer|error TS"
```

Expected: aucune sortie.

- [ ] **Step 3 : Vérifier le build complet**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build réussi, `/musculation/progression` et `/agenda` présents, 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add 'src/app/(app)/agenda/agenda-drawer.tsx'
git commit -m "feat: handle Test 1RM event specially in agenda drawer"
```
