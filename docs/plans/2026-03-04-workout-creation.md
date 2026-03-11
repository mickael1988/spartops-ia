# Création de Séance Personnalisée — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre à l'utilisateur de créer une séance personnalisée depuis /musculation avec sélection d'exercices, séries, répétitions et poids.

**Architecture:** Carte d'entrée dans /musculation → page `/musculation/seance/nouvelle` (Server Component qui charge les données + Client Component pour le formulaire interactif) → Server Action `createWorkout` → redirect vers `/musculation/seance/[id]`. Pas d'appels API côté client : les groupes/exercices sont passés en props depuis le Server Component.

**Tech Stack:** Next.js 16 App Router, Prisma 7, better-auth, shadcn/ui (Select à installer), TypeScript, Server Actions

---

## Task 1 : Carte "Créer une séance" dans /musculation

**Files:**
- Modify: `src/app/(app)/musculation/page.tsx`

**Step 1 : Lire le fichier actuel**

Lire `src/app/(app)/musculation/page.tsx` pour voir le code exact.

**Step 2 : Ajouter la carte en premier dans la grille**

Ajouter un import `PlusCircle` depuis lucide-react, puis une carte spéciale **avant** le `.map()` des groupes :

```tsx
import Link from "next/link"
import { ArrowRight, PlusCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export default async function MusculationPage() {
  const groups = await prisma.muscleGroup.findMany({
    include: { _count: { select: { exercises: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Musculation</h1>
        <p className="text-muted-foreground mt-1">Choisissez un groupe musculaire</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Carte Créer une séance */}
        <Link href="/musculation/seance/nouvelle">
          <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-background/80 backdrop-blur-sm border-dashed border-2">
            <CardHeader className="pb-3">
              <div
                className="w-fit rounded-lg p-2.5 mb-2"
                style={{ background: "linear-gradient(135deg, #3F5EFB, #F50535)" }}
              >
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-lg">Créer une séance</CardTitle>
              <p className="text-sm text-muted-foreground">Composez votre entraînement sur mesure</p>
            </CardHeader>
            <CardContent>
              <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "#3F5EFB" }}>
                Commencer <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {/* Groupes musculaires */}
        {groups.map((group) => (
          <Link key={group.id} href={`/musculation/${group.slug}`}>
            <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-background/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="text-4xl mb-2" aria-hidden="true">{group.image}</div>
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{group._count.exercises} exercices</p>
              </CardHeader>
              <CardContent>
                <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "#3F5EFB" }}>
                  Voir les exercices <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

**Step 3 : Vérifier le build**

```bash
cd /home/mmallinger/projet-ia/spartops-ia && pnpm build
```
Expected: ✓ Compiled successfully

**Step 4 : Commit**

```bash
git add "src/app/(app)/musculation/page.tsx"
git commit -m "feat: carte Créer une séance dans /musculation"
```

---

## Task 2 : Installer Select shadcn + Server Action createWorkout

**Files:**
- Install: `src/components/ui/select.tsx` (via shadcn)
- Create: `src/app/(app)/musculation/seance/actions.ts`

**Step 1 : Installer le composant Select**

```bash
cd /home/mmallinger/projet-ia/spartops-ia && pnpm dlx shadcn@latest add select
```
Expected: `src/components/ui/select.tsx` créé.

**Step 2 : Créer le fichier actions.ts**

```typescript
"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type WorkoutExerciseInput = {
  exerciseId: string
  order: number
  sets: number
  reps: number
  weight: number | null
  restSeconds: number
}

type CreateWorkoutInput = {
  name: string
  exercises: WorkoutExerciseInput[]
}

export async function createWorkout(data: CreateWorkoutInput): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  if (!data.name.trim()) throw new Error("Le nom de la séance est requis")
  if (data.exercises.length === 0) throw new Error("Ajoutez au moins un exercice")

  const workout = await prisma.workout.create({
    data: {
      name: data.name.trim(),
      userId: session.user.id,
      status: "PLANIFIEE",
      exercises: {
        create: data.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          order: ex.order,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
        })),
      },
    },
  })

  redirect(`/musculation/seance/${workout.id}`)
}
```

**Step 3 : Vérifier le build TypeScript**

```bash
cd /home/mmallinger/projet-ia/spartops-ia && pnpm build
```
Expected: ✓ Compiled successfully

**Step 4 : Commit**

```bash
git add src/components/ui/select.tsx "src/app/(app)/musculation/seance/actions.ts"
git commit -m "feat: server action createWorkout + composant Select"
```

---

## Task 3 : Client Component WorkoutForm

**Files:**
- Create: `src/app/(app)/musculation/seance/nouvelle/workout-form.tsx`

**Step 1 : Créer le composant**

```tsx
"use client"

import { useState } from "react"
import { Trash2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createWorkout } from "../actions"

type ExerciseOption = { id: string; name: string }
type GroupOption = { id: string; name: string; exercises: ExerciseOption[] }

type WorkoutEntry = {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number
  weight: number | null
  restSeconds: number
}

export function WorkoutForm({ groups }: { groups: GroupOption[] }) {
  const [workoutName, setWorkoutName] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "")
  const [selectedExerciseId, setSelectedExerciseId] = useState("")
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState("")
  const [restSeconds, setRestSeconds] = useState(60)
  const [entries, setEntries] = useState<WorkoutEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const filteredExercises =
    groups.find((g) => g.id === selectedGroupId)?.exercises ?? []

  function handleGroupChange(groupId: string) {
    setSelectedGroupId(groupId)
    setSelectedExerciseId("")
  }

  function handleAddExercise() {
    const exercise = filteredExercises.find((e) => e.id === selectedExerciseId)
    if (!exercise) return
    setEntries((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets,
        reps,
        weight: weight !== "" ? parseFloat(weight) : null,
        restSeconds,
      },
    ])
    setSelectedExerciseId("")
    setWeight("")
  }

  function handleRemove(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setError("")
    if (!workoutName.trim()) { setError("Le nom de la séance est requis."); return }
    if (entries.length === 0) { setError("Ajoutez au moins un exercice."); return }
    setLoading(true)
    try {
      await createWorkout({
        name: workoutName,
        exercises: entries.map((e, i) => ({ ...e, order: i + 1 })),
      })
    } catch {
      setError("Une erreur est survenue. Réessayez.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Nom de la séance */}
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Nom de la séance</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Ex : Push Day, Full Body, Jambes…"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Ajouter un exercice */}
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Ajouter un exercice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Groupe musculaire */}
          <div className="space-y-1.5">
            <Label>Groupe musculaire</Label>
            <Select value={selectedGroupId} onValueChange={handleGroupChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un groupe" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exercice */}
          <div className="space-y-1.5">
            <Label>Exercice</Label>
            <Select
              value={selectedExerciseId}
              onValueChange={setSelectedExerciseId}
              disabled={filteredExercises.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un exercice" />
              </SelectTrigger>
              <SelectContent>
                {filteredExercises.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Séries / Reps / Poids / Repos */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Séries</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={sets}
                onChange={(e) => setSets(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Répétitions</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={reps}
                onChange={(e) => setReps(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Poids (kg)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                placeholder="Optionnel"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Repos (sec)</Label>
              <Input
                type="number"
                min={0}
                max={600}
                value={restSeconds}
                onChange={(e) => setRestSeconds(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddExercise}
            disabled={!selectedExerciseId}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Ajouter l&apos;exercice
          </Button>
        </CardContent>
      </Card>

      {/* Liste des exercices ajoutés */}
      {entries.length > 0 && (
        <Card className="bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Exercices de la séance ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{entry.exerciseName}</span>
                  <span className="text-muted-foreground ml-2">
                    {entry.sets} × {entry.reps} rép
                    {entry.weight ? ` · ${entry.weight} kg` : ""}
                    {" · "}{entry.restSeconds}s repos
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(index)}
                  aria-label={`Supprimer ${entry.exerciseName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Erreur + Submit */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full border-0 text-white"
        style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        onClick={handleSubmit}
        disabled={loading || entries.length === 0 || !workoutName.trim()}
      >
        {loading ? "Enregistrement…" : "Enregistrer la séance"}
      </Button>
    </div>
  )
}
```

**Step 2 : Vérifier TypeScript (build)**

```bash
cd /home/mmallinger/projet-ia/spartops-ia && pnpm build
```
Expected: ✓ Compiled successfully

**Step 3 : Commit**

```bash
git add "src/app/(app)/musculation/seance/nouvelle/workout-form.tsx"
git commit -m "feat: WorkoutForm client component avec select exercices"
```

---

## Task 4 : Page /musculation/seance/nouvelle

**Files:**
- Create: `src/app/(app)/musculation/seance/nouvelle/page.tsx`

**Step 1 : Créer la page**

```tsx
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { WorkoutForm } from "./workout-form"

export default async function NouvelleSéancePage() {
  const groups = await prisma.muscleGroup.findMany({
    include: { exercises: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">Nouvelle séance</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold">Créer une séance</h1>
        <p className="text-muted-foreground mt-1">Composez votre entraînement sur mesure</p>
      </div>

      <WorkoutForm groups={groups} />
    </div>
  )
}
```

**Step 2 : Vérifier le build**

```bash
cd /home/mmallinger/projet-ia/spartops-ia && pnpm build
```
Expected: ✓ Compiled successfully — la route `/musculation/seance/nouvelle` apparaît dans le build output.

**Step 3 : Commit**

```bash
git add "src/app/(app)/musculation/seance/nouvelle/page.tsx"
git commit -m "feat: page /musculation/seance/nouvelle — création de séance"
```

---

## Task 5 : Page de détail /musculation/seance/[id]

**Files:**
- Create: `src/app/(app)/musculation/seance/[id]/page.tsx`

**Step 1 : Créer la page**

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  const workout = await prisma.workout.findFirst({
    where: { id, userId: session!.user.id },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!workout) notFound()

  const statusLabel = {
    PLANIFIEE: "Planifiée",
    EN_COURS: "En cours",
    TERMINEE: "Terminée",
  }[workout.status]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium" aria-current="page">{workout.name}</span>
      </nav>

      {/* En-tête */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">{workout.name}</h1>
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {statusLabel}
        </Badge>
      </div>

      <p className="text-muted-foreground">{workout.exercises.length} exercice{workout.exercises.length > 1 ? "s" : ""}</p>

      {/* Liste des exercices */}
      <div className="space-y-3">
        {workout.exercises.map((we, index) => (
          <Card key={we.id} className="bg-background/80 backdrop-blur-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <span className="text-muted-foreground text-sm w-6 text-right">{index + 1}.</span>
              <div className="flex-1">
                <p className="font-medium">{we.exercise.name}</p>
                <p className="text-sm text-muted-foreground">
                  {we.sets} séries × {we.reps} rép
                  {we.weight ? ` · ${we.weight} kg` : ""}
                  {" · "}{we.restSeconds}s de repos
                </p>
              </div>
              <span className="text-xl" aria-hidden="true">{we.exercise.image ?? "🏋️"}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

**Step 2 : Vérifier le build**

```bash
cd /home/mmallinger/projet-ia/spartops-ia && pnpm build
```
Expected: ✓ Compiled successfully

**Step 3 : Test bout en bout manuel**
1. `pnpm dev`
2. Aller sur `/musculation` → carte "Créer une séance" visible
3. Clic → `/musculation/seance/nouvelle` → formulaire visible
4. Remplir nom, ajouter 2 exercices, cliquer "Enregistrer la séance"
5. Redirect vers `/musculation/seance/[id]` → récapitulatif visible

**Step 4 : Commit**

```bash
git add "src/app/(app)/musculation/seance/"
git commit -m "feat: page détail /musculation/seance/[id] — récapitulatif de séance"
```

---

## Vérification finale

1. `pnpm build` → 0 erreur TypeScript
2. `/musculation` → carte "Créer une séance" avec bordure pointillée
3. `/musculation/seance/nouvelle` → formulaire complet avec selects groupe + exercice
4. Enregistrement → redirect vers `/musculation/seance/[id]`
5. `/musculation/seance/inexistant` → 404
6. Un utilisateur ne peut pas voir la séance d'un autre (filtre `userId`)
