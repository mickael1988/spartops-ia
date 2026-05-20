# Bloc 1 — Intelligence d'entraînement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter l'historique par exercice dans le live workout, la détection de PR en temps réel, et le volume total affiché en fin de séance et dans l'historique.

**Architecture:** Toutes les données sont chargées côté serveur dans `page.tsx` et passées en props à `WorkoutLive`. Aucune migration de schéma. Le composant `ExerciseHistory` est un composant client autonome ajouté dans `workout-live.tsx`. Le volume est calculé depuis les states React existants en fin de séance, et depuis les `SetLog` agrégés dans l'historique.

**Tech Stack:** Next.js 16 App Router · TypeScript · Tailwind CSS v4 · Prisma 7 · React useState

---

## Fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `src/app/(app)/musculation/seance/[id]/live/page.tsx` | Modifier | Ajouter requêtes history + PR, passer en props |
| `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx` | Modifier | Nouveaux types, composant ExerciseHistory, bannière PR, stats fin de séance |
| `src/app/(app)/musculation/historique/page.tsx` | Modifier | Inclure SetLogs, calculer + afficher volume |

---

## Chunk 1 — Données serveur

### Task 1 : Charger l'historique et les PRs dans `page.tsx`

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/page.tsx`

- [ ] **Step 1 : Ajouter le type `HistoryEntry` et les requêtes Prisma**

Remplacer le contenu de `page.tsx` par :

```tsx
import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { startFromTemplate } from "../../actions"
import { WorkoutLive } from "./workout-live"

export type HistoryEntry = {
  date: string
  maxWeight: number
  totalReps: number
  sets: number
}

export default async function WorkoutLivePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const workout = await prisma.workout.findFirst({
    where: { id, userId: session.user.id },
    include: {
      exercises: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!workout) notFound()
  if (workout.status === "TERMINEE") redirect(`/musculation/seance/${id}`)
  if (workout.isTemplate) await startFromTemplate(id)

  const exerciseIds = workout.exercises.map((e) => e.exerciseId)

  // Historique : 3 derniers WorkoutExercise TERMINEE par exercice
  const pastWorkoutExercises = await prisma.workoutExercise.findMany({
    where: {
      exerciseId: { in: exerciseIds },
      workout: {
        userId: session.user.id,
        status: "TERMINEE",
        id: { not: workout.id },
      },
    },
    include: {
      setLogs: true,
      workout: { select: { completedAt: true } },
    },
    orderBy: { workout: { completedAt: "desc" } },
  })

  // Grouper par exerciseId, garder les 3 plus récents
  const historyByExercise: Record<string, HistoryEntry[]> = {}
  for (const we of pastWorkoutExercises) {
    const existing = historyByExercise[we.exerciseId] ?? []
    if (existing.length >= 3) continue
    const maxWeight = we.setLogs.reduce((max, log) => Math.max(max, log.weight ?? 0), 0)
    const totalReps = we.setLogs.reduce((acc, log) => acc + log.reps, 0)
    existing.push({
      date: we.workout.completedAt?.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) ?? "",
      maxWeight,
      totalReps,
      sets: we.setLogs.length,
    })
    historyByExercise[we.exerciseId] = existing
  }

  // PRs : meilleur estimatedMax par exercice
  const oneRepMaxes = await prisma.oneRepMax.findMany({
    where: { userId: session.user.id, exerciseId: { in: exerciseIds } },
    orderBy: { estimatedMax: "desc" },
  })
  const prByExercise: Record<string, number> = {}
  for (const orm of oneRepMaxes) {
    if (!prByExercise[orm.exerciseId]) {
      prByExercise[orm.exerciseId] = orm.estimatedMax
    }
  }

  return (
    <WorkoutLive
      workout={workout}
      historyByExercise={historyByExercise}
      prByExercise={prByExercise}
    />
  )
}
```

- [ ] **Step 2 : Vérifier que la page compile sans erreur**

```bash
cd /home/mmallinger/projet-ia/spartops-ia && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Attendu : aucune erreur TypeScript sur `page.tsx` (erreurs sur `workout-live.tsx` acceptables à cette étape car les props ne matchent pas encore).

- [ ] **Step 3 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/\[id\]/live/page.tsx
git commit -m "feat: load exercise history and PR data in live workout page"
```

---

## Chunk 2 — Historique dans le live workout

### Task 2 : Composant `ExerciseHistory` + intégration dans `WorkoutLive`

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

- [ ] **Step 1 : Mettre à jour les types en tête de fichier**

Remplacer le bloc de types actuel (lignes 1-15) par :

```tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { startWorkout, completeSet, finishWorkout } from "../../actions"
import type { Workout, WorkoutExercise, Exercise, MuscleGroup } from "@/generated/prisma/client"
import type { HistoryEntry } from "./page"

type ExerciseWithRelations = WorkoutExercise & {
  exercise: Exercise & { muscleGroup: MuscleGroup }
}

type WorkoutWithExercises = Workout & {
  exercises: ExerciseWithRelations[]
}

type WorkoutLiveProps = {
  workout: WorkoutWithExercises
  historyByExercise: Record<string, HistoryEntry[]>
  prByExercise: Record<string, number>
}
```

- [ ] **Step 2 : Ajouter le composant `ExerciseHistory` avant `RestTimerOverlay`**

Insérer ce composant juste après les déclarations de types (avant la ligne `// ─── Rest Timer Overlay`) :

```tsx
// ─── Exercise History ──────────────────────────────────────────────────────────

function ExerciseHistory({ history }: { history: HistoryEntry[] }) {
  const [open, setOpen] = useState(false)

  if (history.length === 0) return null

  const maxWeight = Math.max(...history.map((e) => e.maxWeight))

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full cursor-pointer bg-gradient-to-r from-primary/10 to-primary/5 border-l-[3px] border-primary rounded-r-lg px-3 py-2 flex items-center justify-between transition-colors active:from-primary/20"
      >
        <span className="text-xs font-semibold text-primary/80">📋 Voir mes sessions précédentes</span>
        <span className="text-primary text-sm">{open ? "∧" : "∨"}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {history.map((entry, i) => {
            const isPR = entry.maxWeight === maxWeight && entry.maxWeight > 0
            const delta = i < history.length - 1 ? entry.maxWeight - history[i + 1].maxWeight : null
            return (
              <div
                key={i}
                className="flex items-center justify-between bg-background rounded-lg px-3 py-2 text-xs border border-border"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">
                    {entry.maxWeight > 0 ? `${entry.maxWeight} kg` : "—"} × {entry.totalReps} reps × {entry.sets} séries
                  </span>
                  <span className="text-muted-foreground">{entry.date}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isPR && (
                    <span className="bg-amber-500/20 border border-amber-500/40 text-amber-500 rounded px-1.5 py-0.5 text-[9px] font-bold">
                      🏆 PR
                    </span>
                  )}
                  {delta !== null && delta !== 0 && (
                    <span className={delta > 0 ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
                      {delta > 0 ? `+${delta}` : `${delta}`} kg
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3 : Mettre à jour la signature de `WorkoutLive`**

Remplacer :
```tsx
export function WorkoutLive({ workout }: { workout: WorkoutWithExercises }) {
```
Par :
```tsx
export function WorkoutLive({ workout, historyByExercise, prByExercise }: WorkoutLiveProps) {
```

- [ ] **Step 4 : Intégrer `ExerciseHistory` dans la carte d'exercice active**

Dans le bloc `{isActive && ( ... )}`, juste après les dots de progression (après `</div>` des dots, avant `</>`) ajouter :

```tsx
<ExerciseHistory history={historyByExercise[we.exerciseId] ?? []} />
```

La section dots ressemble à :
```tsx
<div className="flex justify-center gap-2">
  {Array.from({ length: setsMap[we.id] ?? we.sets }).map((_, i) => (
    <span key={i} className={`h-3 w-3 rounded-full ${i < done ? "bg-primary" : "bg-muted"}`} />
  ))}
</div>
```

Ajouter `<ExerciseHistory ... />` juste après ce `</div>`.

- [ ] **Step 5 : Vérifier visuellement**

Lancer `pnpm dev`, ouvrir une séance live, vérifier que le toggle "📋 Voir mes sessions précédentes" apparaît sous les dots de chaque exercice actif. Taper dessus doit déplier les lignes d'historique.

- [ ] **Step 6 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/\[id\]/live/workout-live.tsx
git commit -m "feat: add ExerciseHistory component with collapsible past sessions in live workout"
```

---

## Chunk 3 — Bannière PR en temps réel

### Task 3 : Afficher la bannière dorée quand le poids bat le PR

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

- [ ] **Step 1 : Ajouter la bannière PR dans le bloc `isActive`**

Dans le bloc `{isActive && ( ... )}`, après les dots de progression et **avant** `<ExerciseHistory ... />`, ajouter :

```tsx
{(weightMap[we.id] ?? 0) > 0 &&
  (weightMap[we.id] ?? 0) > (prByExercise[we.exerciseId] ?? 0) && (
  <div className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-l-[3px] border-amber-500 rounded-r-lg px-3 py-2 flex items-center gap-3">
    <span className="text-xl shrink-0">🏆</span>
    <div>
      <p className="text-xs font-bold text-amber-500">Nouveau record personnel !</p>
      <p className="text-[10px] text-amber-700 dark:text-amber-400">
        {weightMap[we.id]} kg dépasse votre PR de {prByExercise[we.exerciseId]} kg
      </p>
    </div>
  </div>
)}
```

- [ ] **Step 2 : Vérifier visuellement**

Dans une séance live, saisir un poids supérieur au PR de l'exercice dans le champ Poids → la bannière dorée doit apparaître immédiatement. Repasser sous le PR → elle disparaît.

Si aucun PR n'existe pour l'exercice (`prByExercise[we.exerciseId]` = undefined → 0), la bannière n'apparaît pas (car `0 > 0` est faux).

- [ ] **Step 3 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/\[id\]/live/workout-live.tsx
git commit -m "feat: show PR banner in real-time when weight exceeds personal record"
```

---

## Chunk 4 — Volume total

### Task 4 : Bloc stats en fin de séance

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

- [ ] **Step 1 : Calculer le volume total et le nombre de séries total**

Dans `WorkoutLive`, ajouter ces deux variables dérivées juste avant le `return` principal (après les hooks) :

```tsx
const totalSets = Object.values(completedSetsMap).reduce((a, b) => a + b, 0)

const totalVolume = Math.round(
  workout.exercises.reduce((acc, we) => {
    const weight = weightMap[we.id] ?? 0
    const reps = repsMap[we.id] ?? we.reps
    const sets = completedSetsMap[we.id] ?? 0
    return acc + weight * reps * sets
  }, 0)
)
```

- [ ] **Step 2 : Remplacer le bouton "Terminer" seul par le bloc stats + bouton**

Remplacer le bloc actuel :
```tsx
{/* Bouton terminer — visible quand tout est fait */}
{allDone && (
  <button
    onClick={handleFinish}
    disabled={finishing}
    className="w-full rounded-2xl py-5 text-xl font-bold text-white disabled:opacity-60"
    style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
  >
    {finishing ? "Enregistrement…" : "🏁 Terminer la séance"}
  </button>
)}
```

Par :
```tsx
{/* Bloc fin de séance — visible quand tout est fait */}
{allDone && (
  <div className="rounded-2xl border p-5 space-y-4 bg-background/80 backdrop-blur-sm">
    <p className="text-center text-xl font-bold">🎉 Séance terminée !</p>

    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border p-3 text-center space-y-1">
        <p className="text-lg font-bold font-mono">{formatTime(elapsedSeconds)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Durée</p>
      </div>
      <div className="rounded-xl border p-3 text-center space-y-1">
        <p className="text-lg font-bold">{totalSets}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Séries</p>
      </div>
      <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-center space-y-1">
        <p className="text-lg font-bold text-primary">{totalVolume.toLocaleString("fr-FR")}</p>
        <p className="text-[10px] text-primary/60 uppercase tracking-wide">kg soulevés</p>
      </div>
    </div>

    <button
      onClick={handleFinish}
      disabled={finishing}
      className="w-full rounded-2xl py-4 text-lg font-bold text-white disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
    >
      {finishing ? "Enregistrement…" : "🏁 Terminer la séance"}
    </button>
  </div>
)}
```

- [ ] **Step 3 : Vérifier visuellement**

Terminer tous les exercices d'une séance → le bloc stats doit apparaître avec Durée, Séries et kg soulevés (bleuté). Le bouton Terminer reste fonctionnel.

- [ ] **Step 4 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/\[id\]/live/workout-live.tsx
git commit -m "feat: show workout stats (duration, sets, volume) at end of session"
```

---

### Task 5 : Badge volume dans la page historique

**Files:**
- Modify: `src/app/(app)/musculation/historique/page.tsx`

- [ ] **Step 1 : Inclure les SetLogs dans la requête Prisma**

Remplacer :
```ts
const workouts = await prisma.workout.findMany({
  where: { userId: session.user.id, status: "TERMINEE" },
  include: { exercises: { include: { exercise: true } } },
  orderBy: { completedAt: "desc" },
})
```

Par :
```ts
const workouts = await prisma.workout.findMany({
  where: { userId: session.user.id, status: "TERMINEE" },
  include: {
    exercises: {
      include: {
        exercise: true,
        setLogs: true,
      },
    },
  },
  orderBy: { completedAt: "desc" },
})
```

- [ ] **Step 2 : Calculer le volume et ajouter le badge dans la card**

Dans le `.map((workout) => { ... })`, ajouter le calcul du volume avant le `return` :

```tsx
const volume = Math.round(
  workout.exercises.reduce(
    (acc, we) => acc + we.setLogs.reduce((s, log) => s + (log.weight ?? 0) * log.reps, 0),
    0
  )
)
```

Puis dans le JSX, sous la ligne `<p className="text-sm text-muted-foreground">`, ajouter le badge si volume > 0 :

```tsx
{volume > 0 && (
  <span className="inline-flex items-center gap-1 mt-1 bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 text-xs font-bold">
    ⚡ {volume.toLocaleString("fr-FR")} kg soulevés
  </span>
)}
```

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `/musculation/historique` → chaque séance terminée avec des sets loggés doit afficher le badge ⚡. Les séances sans poids enregistré n'affichent pas le badge.

- [ ] **Step 4 : Commit final**

```bash
git add src/app/\(app\)/musculation/historique/page.tsx
git commit -m "feat: display total volume badge on completed workout history cards"
```
