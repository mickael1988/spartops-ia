# Profil Activity Chart Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un graphique SVG sur la page profil montrant le nombre de séances complétées par semaine pour le mois précédent et le mois en cours.

**Architecture:** Le server component `page.tsx` fait la requête Prisma et calcule l'agrégation par semaine, puis passe les données typées au client component `ProfilActivityChart` qui rend un SVG natif. Aucune librairie externe.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui (Card), Prisma 7, SVG natif

**Spec:** `docs/superpowers/specs/2026-03-16-profil-chart-design.md`

---

## Chunk 1 : Composant chart SVG

### Task 1: Créer `ProfilActivityChart`

**Files:**
- Create: `src/app/(app)/profil/profil-activity-chart.tsx`

- [ ] **Step 1 : Créer le composant avec le type `WeekData` et le rendu SVG**

Créer `src/app/(app)/profil/profil-activity-chart.tsx` :

```tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type WeekData = {
  mois: "precedent" | "courant"
  weekIndex: number   // 1 à 5
  count: number
  isCurrent: boolean  // semaine en cours (hachuré)
}

type Props = {
  data: WeekData[]
  labelPrecedent: string  // ex : "Février"
  labelCourant: string    // ex : "Mars"
  periode: string         // ex : "Fév — Mar 2026"
}

const BAR_WIDTH = 18
const BAR_GAP = 4
const GROUP_GAP = 24
const CHART_HEIGHT = 100
const MAX_WEEKS = 5

export function ProfilActivityChart({ data, labelPrecedent, labelCourant, periode }: Props) {
  const precedent = data.filter(d => d.mois === "precedent")
  const courant   = data.filter(d => d.mois === "courant")

  const maxCount = Math.max(1, ...data.map(d => d.count))

  const groupWidth = MAX_WEEKS * (BAR_WIDTH + BAR_GAP) - BAR_GAP
  const svgWidth   = groupWidth * 2 + GROUP_GAP + 1
  const svgHeight  = CHART_HEIGHT + 20  // 20px pour les labels de mois

  function barHeight(count: number) {
    return (count / maxCount) * CHART_HEIGHT
  }

  function renderGroup(weeks: WeekData[], offsetX: number, isCourant: boolean) {
    return Array.from({ length: MAX_WEEKS }, (_, i) => {
      const week  = weeks.find(w => w.weekIndex === i + 1)
      const count = week?.count ?? 0
      const h = barHeight(count)
      const x = offsetX + i * (BAR_WIDTH + BAR_GAP)
      const y = CHART_HEIGHT - h
      const minH = count > 0 ? 4 : 0

      if (week?.isCurrent) {
        return (
          <g key={i}>
            <rect x={x} y={y} width={BAR_WIDTH} height={Math.max(h, minH)}
              fill="url(#hatch)"
              rx={3} ry={3}
              stroke="#f97316" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 2"
            />
            {count > 0 && (
              <text x={x + BAR_WIDTH / 2} y={y - 4} textAnchor="middle"
                fontSize="9" fill="#9ca3af">{count}</text>
            )}
          </g>
        )
      }

      if (isCourant) {
        return (
          <g key={i}>
            <rect x={x} y={y} width={BAR_WIDTH} height={Math.max(h, minH)}
              fill={count > 0 ? "url(#grad-courant)" : "#1f1f1f"}
              rx={3} ry={3}
            />
            {count > 0 && (
              <text x={x + BAR_WIDTH / 2} y={y - 4} textAnchor="middle"
                fontSize="9" fill="#f97316">{count}</text>
            )}
          </g>
        )
      }

      // Mois précédent
      return (
        <g key={i}>
          <rect x={x} y={y} width={BAR_WIDTH} height={Math.max(h, minH)}
            fill={count > 0 ? "#7c3d12" : "#1f1f1f"}
            fillOpacity={count > 0 ? 0.8 : 1}
            rx={3} ry={3}
          />
          {count > 0 && (
            <text x={x + BAR_WIDTH / 2} y={y - 4} textAnchor="middle"
              fontSize="9" fill="#9ca3af">{count}</text>
          )}
        </g>
      )
    })
  }

  const offsetCourant = groupWidth + GROUP_GAP + 1

  return (
    <Card className="bg-background/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Activité</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">{periode}</span>
        </div>
        <p className="text-xs text-muted-foreground">Séances complétées par semaine</p>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            width="100%"
            style={{ minWidth: svgWidth }}
          >
            {/* Defs uniques pour toute la figure */}
            <defs>
              <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.35"/>
              </pattern>
              <linearGradient id="grad-courant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c"/>
                <stop offset="100%" stopColor="#f97316"/>
              </linearGradient>
            </defs>

            {/* Lignes de grille horizontales */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line key={i}
                x1={0} y1={CHART_HEIGHT - ratio * CHART_HEIGHT}
                x2={svgWidth} y2={CHART_HEIGHT - ratio * CHART_HEIGHT}
                stroke="#1f1f1f" strokeWidth="1"
              />
            ))}

            {/* Barres mois précédent */}
            {renderGroup(precedent, 0, false)}

            {/* Séparateur vertical */}
            <line
              x1={groupWidth + GROUP_GAP / 2} y1={0}
              x2={groupWidth + GROUP_GAP / 2} y2={CHART_HEIGHT}
              stroke="#2a2a2a" strokeWidth="1"
            />

            {/* Barres mois en cours */}
            {renderGroup(courant, offsetCourant, true)}

            {/* Label mois précédent */}
            <text
              x={groupWidth / 2} y={CHART_HEIGHT + 14}
              textAnchor="middle" fontSize="10" fill="#6b7280"
            >
              {labelPrecedent}
            </text>

            {/* Label mois en cours */}
            <text
              x={offsetCourant + groupWidth / 2} y={CHART_HEIGHT + 14}
              textAnchor="middle" fontSize="10" fill="#f97316"
            >
              {labelCourant}
            </text>
          </svg>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#7c3d12] opacity-80"/>
            Mois précédent
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-amber-400 to-orange-500"/>
            Mois en cours
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm border border-dashed border-orange-500/50 bg-orange-500/10"/>
            Semaine en cours
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2 : Vérifier que le fichier compile sans erreur TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep profil-activity-chart
```

Expected: aucune sortie (0 erreur)

- [ ] **Step 3 : Commit**

```bash
git add src/app/(app)/profil/profil-activity-chart.tsx
git commit -m "feat: add ProfilActivityChart SVG component"
```

---

## Chunk 2 : Données et intégration dans la page

### Task 2: Requête + agrégation dans `page.tsx`

**Files:**
- Modify: `src/app/(app)/profil/page.tsx`

- [ ] **Step 1 : Ajouter la fonction d'agrégation et la requête Prisma**

Dans `src/app/(app)/profil/page.tsx`, ajouter l'import du composant et de son type, puis la logique de calcul avant le `return` :

```tsx
import { ProfilActivityChart, type WeekData } from "./profil-activity-chart"
```

Ajouter cette fonction utilitaire dans le fichier (avant `ProfilPage`) :

```ts
function buildChartData(
  workouts: { completedAt: Date | null }[],
  now: Date
): WeekData[] {
  const currentMonth  = now.getUTCMonth()
  const currentYear   = now.getUTCFullYear()
  const currentWeekIdx = Math.ceil(now.getUTCDate() / 7)

  const data: WeekData[] = []

  for (const w of workouts) {
    if (!w.completedAt) continue
    const d = w.completedAt
    const m = d.getUTCMonth()
    const y = d.getUTCFullYear()
    const weekIndex = Math.ceil(d.getUTCDate() / 7)

    const isPrecedent =
      y === (currentMonth === 0 ? currentYear - 1 : currentYear) &&
      m === (currentMonth === 0 ? 11 : currentMonth - 1)
    const isCourant = y === currentYear && m === currentMonth

    if (!isPrecedent && !isCourant) continue

    const mois: "precedent" | "courant" = isCourant ? "courant" : "precedent"
    const isCurrent = isCourant && weekIndex === currentWeekIdx

    const existing = data.find(e => e.mois === mois && e.weekIndex === weekIndex)
    if (existing) {
      existing.count++
    } else {
      data.push({ mois, weekIndex, count: 1, isCurrent })
    }
  }

  return data
}
```

- [ ] **Step 2 : Ajouter la requête Prisma et les labels dans `ProfilPage`**

Dans la fonction `ProfilPage`, après la ligne `const user = await prisma.user...`, ajouter :

```ts
  const now = new Date()

  // Fenêtre : 1er du mois précédent → 1er du mois suivant
  const debutMoisPrecedent = new Date(Date.UTC(
    now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear(),
    now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1,
    1
  ))
  const debutMoisSuivant = new Date(Date.UTC(
    now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(),
    now.getUTCMonth() === 11 ? 0 : now.getUTCMonth() + 1,
    1
  ))

  const workouts = await prisma.workout.findMany({
    where: {
      userId: user.id,
      status: "TERMINEE",
      isTemplate: false,
      completedAt: { gte: debutMoisPrecedent, lt: debutMoisSuivant },
    },
    select: { completedAt: true },
  })

  const chartData = buildChartData(workouts, now)

  const MOIS_FR    = ["Janvier","Février","Mars","Avril","Mai","Juin",
                      "Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
  const MOIS_COURT = ["Jan","Fév","Mar","Avr","Mai","Juin",
                      "Juil","Août","Sep","Oct","Nov","Déc"]
  const moisCourantIdx   = now.getUTCMonth()
  const moisPrecedentIdx = moisCourantIdx === 0 ? 11 : moisCourantIdx - 1
  const labelCourant   = MOIS_FR[moisCourantIdx]
  const labelPrecedent = MOIS_FR[moisPrecedentIdx]
  const periode = `${MOIS_COURT[moisPrecedentIdx]} — ${MOIS_COURT[moisCourantIdx]} ${now.getUTCFullYear()}`
```

- [ ] **Step 3 : Insérer le composant dans le JSX**

Dans le `return` de `ProfilPage`, après `<ProfilForm ... />`, ajouter :

```tsx
      <ProfilActivityChart
        data={chartData}
        labelPrecedent={labelPrecedent}
        labelCourant={labelCourant}
        periode={periode}
      />
```

- [ ] **Step 4 : Vérifier la compilation TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "profil|error"
```

Expected: aucune erreur

- [ ] **Step 5 : Vérifier visuellement dans le navigateur**

Ouvrir `/profil` — le graphique doit apparaître sous la card profil avec :
- Barres marron pour le mois précédent
- Barres orange pour le mois en cours
- Barre hachurée pour la semaine en cours
- Labels de mois en dessous
- Légende en bas

- [ ] **Step 6 : Commit**

```bash
git add src/app/(app)/profil/page.tsx
git commit -m "feat: integrate activity chart on profile page with weekly workout data"
```
