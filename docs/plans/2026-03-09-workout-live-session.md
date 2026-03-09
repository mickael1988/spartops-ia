# Workout Live Session — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter une page `/musculation/seance/[id]/live` permettant de suivre sa séance en temps réel avec chronomètres, suivi série par série, et persistance immédiate en BDD.

**Architecture:** Server Component wrapper charge les données Prisma et les passe en props à un Client Component `WorkoutLive`. Trois Server Actions (`startWorkout`, `completeSet`, `finishWorkout`) gèrent la persistance. Pas de migration Prisma nécessaire — tous les champs existent déjà.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (PrismaPg), better-auth, TypeScript, Tailwind CSS v4, shadcn/ui, Web Vibration API, AudioContext

---

## Task 1 : Server Actions — startWorkout, completeSet, finishWorkout

**Files:**
- Modify: `src/app/(app)/musculation/seance/actions.ts`

**Step 1 : Lire le fichier actuel**

Lire `src/app/(app)/musculation/seance/actions.ts` pour voir le code exact.

**Step 2 : Ajouter les trois actions à la fin du fichier**

```typescript
export async function startWorkout(workoutId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  await prisma.workout.updateMany({
    where: { id: workoutId, userId: session.user.id, status: "PLANIFIEE" },
    data: { status: "EN_COURS", startedAt: new Date() },
  })
}

export async function completeSet(
  workoutExerciseId: string,
  actualReps: number,
  actualWeight: number | null
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  // Vérifier que l'exercice appartient bien à l'utilisateur
  const we = await prisma.workoutExercise.findFirst({
    where: { id: workoutExerciseId, workout: { userId: session.user.id } },
    select: { completedSets: true, sets: true },
  })
  if (!we) throw new Error("Exercice introuvable")
  if (we.completedSets >= we.sets) return // déjà toutes les séries faites

  await prisma.workoutExercise.update({
    where: { id: workoutExerciseId },
    data: {
      completedSets: { increment: 1 },
      reps: actualReps,
      weight: actualWeight,
    },
  })
}

export async function finishWorkout(workoutId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  await prisma.workout.updateMany({
    where: { id: workoutId, userId: session.user.id },
    data: { status: "TERMINEE", completedAt: new Date() },
  })
}
```

**Step 3 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/actions.ts
git commit -m "feat: add startWorkout, completeSet, finishWorkout server actions"
```

---

## Task 2 : Page Server Component `/live`

**Files:**
- Create: `src/app/(app)/musculation/seance/[id]/live/page.tsx`

**Step 1 : Créer le fichier**

```typescript
import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { WorkoutLive } from "./workout-live"

export default async function WorkoutLivePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
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

  return <WorkoutLive workout={workout} />
}
```

**Step 2 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/[id]/live/page.tsx
git commit -m "feat: add /live server component wrapper"
```

---

## Task 3 : Client Component `WorkoutLive` — squelette + navigation exercices

**Files:**
- Create: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

**Step 1 : Créer le fichier avec les types et la navigation entre exercices**

```typescript
"use client"

import { useState } from "react"
import { startWorkout } from "../../actions"
import type { Workout, WorkoutExercise, Exercise, MuscleGroup } from "@/generated/prisma/client"

type ExerciseWithRelations = WorkoutExercise & {
  exercise: Exercise & { muscleGroup: MuscleGroup }
}

type WorkoutWithExercises = Workout & {
  exercises: ExerciseWithRelations[]
}

export function WorkoutLive({ workout }: { workout: WorkoutWithExercises }) {
  const [started, setStarted] = useState(workout.status === "EN_COURS")
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [completedSetsMap, setCompletedSetsMap] = useState<Record<string, number>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, we.completedSets]))
  )

  const current = workout.exercises[exerciseIndex]
  const totalExercises = workout.exercises.length
  const isLast = exerciseIndex === totalExercises - 1

  async function handleStart() {
    await startWorkout(workout.id)
    setStarted(true)
  }

  function handleNext() {
    if (!isLast) setExerciseIndex((i) => i + 1)
  }

  function handlePrev() {
    if (exerciseIndex > 0) setExerciseIndex((i) => i - 1)
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h1 className="text-2xl font-bold text-center">{workout.name}</h1>
        <p className="text-muted-foreground">{totalExercises} exercices</p>
        <button
          onClick={handleStart}
          className="w-full max-w-sm rounded-2xl py-5 text-xl font-bold text-white"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          Démarrer la séance
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      {/* Header : progression */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
        <span>Exercice {exerciseIndex + 1} / {totalExercises}</span>
      </div>

      {/* Exercice actif — placeholder, enrichi dans Task 4 */}
      <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-6 space-y-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {current.exercise.muscleGroup.name}
        </p>
        <h2 className="text-2xl font-bold">{current.exercise.name}</h2>
        <p className="text-4xl text-center" aria-hidden="true">
          {current.exercise.image ?? "🏋️"}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={handlePrev}
          disabled={exerciseIndex === 0}
          className="flex-1 rounded-xl border py-3 font-medium disabled:opacity-30"
        >
          ← Préc.
        </button>
        <button
          onClick={handleNext}
          disabled={isLast}
          className="flex-1 rounded-xl border py-3 font-medium disabled:opacity-30"
        >
          Suiv. →
        </button>
      </div>
    </div>
  )
}
```

**Step 2 : Vérifier que la page s'affiche sans erreur**

Ouvrir `http://localhost:3000/musculation/seance/[un-id]/live` et vérifier que le bouton "Démarrer" s'affiche.

**Step 3 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/[id]/live/workout-live.tsx
git commit -m "feat: workout live skeleton with exercise navigation"
```

---

## Task 4 : Suivi des séries + saisie reps/poids

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

**Step 1 : Ajouter l'état local pour reps/poids par exercice**

Ajouter dans le composant, après `completedSetsMap` :

```typescript
const [repsMap, setRepsMap] = useState<Record<string, number>>(
  Object.fromEntries(workout.exercises.map((we) => [we.id, we.reps]))
)
const [weightMap, setWeightMap] = useState<Record<string, number | null>>(
  Object.fromEntries(workout.exercises.map((we) => [we.id, we.weight]))
)
const [validating, setValidating] = useState(false)
```

**Step 2 : Ajouter la fonction `handleCompleteSet`**

```typescript
import { completeSet } from "../../actions"

async function handleCompleteSet() {
  if (validating) return
  const done = completedSetsMap[current.id] ?? 0
  if (done >= current.sets) return
  setValidating(true)
  try {
    await completeSet(current.id, repsMap[current.id], weightMap[current.id])
    setCompletedSetsMap((prev) => ({ ...prev, [current.id]: done + 1 }))
  } finally {
    setValidating(false)
  }
}
```

**Step 3 : Remplacer le bloc exercice actif par le rendu complet avec séries**

Remplacer le bloc `<div className="rounded-2xl border ...">` par :

```typescript
<div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-6 space-y-5">
  <p className="text-xs text-muted-foreground uppercase tracking-wide">
    {current.exercise.muscleGroup.name}
  </p>
  <h2 className="text-2xl font-bold">{current.exercise.name}</h2>
  <p className="text-5xl text-center py-2" aria-hidden="true">
    {current.exercise.image ?? "🏋️"}
  </p>

  {/* Série en cours */}
  <p className="text-center text-sm font-medium text-muted-foreground">
    Série {Math.min((completedSetsMap[current.id] ?? 0) + 1, current.sets)} / {current.sets}
  </p>

  {/* Inputs reps / poids */}
  <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">Répétitions</label>
      <input
        type="number"
        min={1}
        max={100}
        value={repsMap[current.id]}
        onChange={(e) =>
          setRepsMap((prev) => ({ ...prev, [current.id]: Math.max(1, parseInt(e.target.value) || 1) }))
        }
        className="w-full rounded-xl border bg-background px-3 py-3 text-center text-2xl font-bold"
      />
    </div>
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">Poids (kg)</label>
      <input
        type="number"
        min={0}
        step={0.5}
        value={weightMap[current.id] ?? ""}
        placeholder="—"
        onChange={(e) =>
          setWeightMap((prev) => ({
            ...prev,
            [current.id]: e.target.value === "" ? null : parseFloat(e.target.value),
          }))
        }
        className="w-full rounded-xl border bg-background px-3 py-3 text-center text-2xl font-bold"
      />
    </div>
  </div>

  {/* Bouton valider */}
  {(completedSetsMap[current.id] ?? 0) < current.sets ? (
    <button
      onClick={handleCompleteSet}
      disabled={validating}
      className="w-full rounded-2xl py-5 text-xl font-bold text-white disabled:opacity-60"
      style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
    >
      {validating ? "Enregistrement…" : "✓  Valider la série"}
    </button>
  ) : (
    <div className="w-full rounded-2xl py-4 text-center font-bold text-green-600 bg-green-50 dark:bg-green-900/20">
      ✅ Exercice terminé !
    </div>
  )}

  {/* Dots séries */}
  <div className="flex justify-center gap-2 pt-1">
    {Array.from({ length: current.sets }).map((_, i) => (
      <span
        key={i}
        className={`h-3 w-3 rounded-full ${
          i < (completedSetsMap[current.id] ?? 0)
            ? "bg-primary"
            : "bg-muted"
        }`}
      />
    ))}
  </div>
</div>
```

**Step 4 : Vérifier le fonctionnement**

Aller sur `/live`, démarrer, valider une série → vérifier que `completedSets` s'incrémente en BDD via `pnpm db:studio`.

**Step 5 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/[id]/live/workout-live.tsx
git commit -m "feat: series tracking with reps/weight editing and persistence"
```

---

## Task 5 : Chronomètre total de séance

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

**Step 1 : Ajouter le hook chronomètre**

Ajouter en haut du composant, après les imports :

```typescript
import { useState, useEffect, useRef } from "react"
```

Ajouter dans le composant :

```typescript
const [elapsedSeconds, setElapsedSeconds] = useState(0)
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

useEffect(() => {
  if (!started) return
  timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
  return () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }
}, [started])

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
```

**Step 2 : Afficher le chrono dans le header**

Remplacer la ligne du header par :

```typescript
<div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
  <span>Exercice {exerciseIndex + 1} / {totalExercises}</span>
  <span className="font-mono font-bold text-base text-foreground">⏱ {formatTime(elapsedSeconds)}</span>
</div>
```

**Step 3 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/[id]/live/workout-live.tsx
git commit -m "feat: total workout timer"
```

---

## Task 6 : Chronomètre de repos (auto + contrôles manuels)

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

**Step 1 : Ajouter l'état du chrono repos**

```typescript
const [restActive, setRestActive] = useState(false)
const [restRemaining, setRestRemaining] = useState(0)
const restRef = useRef<ReturnType<typeof setInterval> | null>(null)

function startRest(seconds: number) {
  if (restRef.current) clearInterval(restRef.current)
  setRestRemaining(seconds)
  setRestActive(true)
  restRef.current = setInterval(() => {
    setRestRemaining((prev) => {
      if (prev <= 1) {
        clearInterval(restRef.current!)
        setRestActive(false)
        triggerRestEnd()
        return 0
      }
      return prev - 1
    })
  }, 1000)
}

function stopRest() {
  if (restRef.current) clearInterval(restRef.current)
  setRestActive(false)
  setRestRemaining(0)
}

// Cleanup
useEffect(() => () => { if (restRef.current) clearInterval(restRef.current) }, [])
```

**Step 2 : Ajouter la fonction d'alerte fin de repos**

```typescript
function triggerRestEnd() {
  // Vibration (mobile)
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200])
  }
  // Bip via AudioContext
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // AudioContext non supporté — silencieux
  }
}
```

**Step 3 : Déclencher le repos automatiquement après `handleCompleteSet`**

Dans `handleCompleteSet`, après `setCompletedSetsMap(...)` :

```typescript
startRest(current.restSeconds)
```

**Step 4 : Ajouter le bloc repos dans le JSX**

Ajouter sous le bloc exercice actif et avant la navigation :

```typescript
{restActive && (
  <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20 p-5 space-y-3 text-center">
    <p className="text-sm font-medium text-blue-600 dark:text-blue-300">😴 Temps de repos</p>
    <p className="text-5xl font-mono font-bold text-blue-700 dark:text-blue-200">
      {formatTime(restRemaining)}
    </p>
    <div className="flex gap-2 justify-center">
      <button
        onClick={() => setRestRemaining((r) => r + 15)}
        className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600"
      >
        +15s
      </button>
      <button
        onClick={() => startRest(current.restSeconds)}
        className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600"
      >
        Reset
      </button>
      <button
        onClick={stopRest}
        className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600"
      >
        Passer
      </button>
    </div>
  </div>
)}
```

**Step 5 : Vérifier**

Valider une série → le bloc repos apparaît, compte à rebours, vibre/bipe à 0, disparaît.

**Step 6 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/[id]/live/workout-live.tsx
git commit -m "feat: rest timer with auto-trigger, vibration and audio alert"
```

---

## Task 7 : Fin de séance + bouton "Démarrer" sur la page de détail

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`
- Modify: `src/app/(app)/musculation/seance/[id]/page.tsx`

**Step 1 : Ajouter le bouton "Terminer la séance"**

Ajouter l'import en haut :

```typescript
import { useRouter } from "next/navigation"
import { finishWorkout } from "../../actions"
```

Ajouter dans le composant :

```typescript
const router = useRouter()
const [finishing, setFinishing] = useState(false)

async function handleFinish() {
  setFinishing(true)
  await finishWorkout(workout.id)
  router.push(`/musculation/seance/${workout.id}`)
}
```

Ajouter sous la navigation exercices :

```typescript
{isLast && (completedSetsMap[current.id] ?? 0) >= current.sets && (
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

**Step 2 : Lire la page de détail**

Lire `src/app/(app)/musculation/seance/[id]/page.tsx` pour voir le code exact.

**Step 3 : Ajouter le bouton "Démarrer la séance" sur la page de détail**

Ajouter l'import `Link` s'il n'est pas déjà là, puis ajouter sous `<p className="text-muted-foreground">` :

```typescript
{workout.status !== "TERMINEE" && (
  <Link
    href={`/musculation/seance/${workout.id}/live`}
    className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-bold text-white"
    style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
  >
    ▶ Démarrer la séance
  </Link>
)}
```

**Step 4 : Vérifier le flux complet**

1. Page de détail → clic "Démarrer la séance" → `/live`
2. Compléter tous les exercices → bouton "Terminer" → retour page de détail
3. Vérifier que `status = TERMINEE` et `completedAt` sont en BDD
4. Vérifier que le bouton "Démarrer" n'apparaît plus sur la page de détail

**Step 5 : Commit**

```bash
git add src/app/\(app\)/musculation/seance/[id]/live/workout-live.tsx \
        src/app/\(app\)/musculation/seance/[id]/page.tsx
git commit -m "feat: finish workout flow and start button on detail page"
```
