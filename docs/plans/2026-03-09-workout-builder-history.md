# Workout Builder (panier) + Historique — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre de composer une séance multi-exercices via un panier flottant persistant dans le catalogue, et consulter l'historique des séances terminées.

**Architecture:** Un Context React (`CartProvider`) wrappé dans `musculation/layout.tsx` maintient la liste des exercices sélectionnés entre les pages du catalogue. Une barre flottante `CartBar` lit ce context et affiche le bouton Démarrer. La Server Action `buildAndStartWorkout` crée la séance et redirige vers `/live`. L'historique est une simple page Server Component qui lit les séances `TERMINEE` en BDD.

**Tech Stack:** Next.js 16 App Router, React Context, TypeScript, Tailwind CSS v4, shadcn/ui, Prisma 7, better-auth

---

## Task 1 : Cart Context

**Files:**
- Create: `src/app/(app)/musculation/cart-context.tsx`

**Step 1 : Créer le fichier**

```typescript
"use client"

import { createContext, useContext, useState, useCallback } from "react"

type CartItem = {
  id: string
  name: string
  image: string | null
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clear: () => void
  hasItem: (id: string) => boolean
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => prev.some((i) => i.id === item.id) ? prev : [...prev, item])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const hasItem = useCallback((id: string) => items.some((i) => i.id === id), [items])

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, hasItem }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside CartProvider")
  return ctx
}
```

**Step 2 : Commit**

```bash
git add 'src/app/(app)/musculation/cart-context.tsx'
git commit -m "feat: cart context for workout builder"
```

---

## Task 2 : Layout musculation avec CartProvider

**Files:**
- Create: `src/app/(app)/musculation/layout.tsx`

**Step 1 : Créer le fichier**

```typescript
import { CartProvider } from "./cart-context"

export default function MusculationLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  )
}
```

**Step 2 : Commit**

```bash
git add 'src/app/(app)/musculation/layout.tsx'
git commit -m "feat: musculation layout with CartProvider"
```

---

## Task 3 : Server Action buildAndStartWorkout

**Files:**
- Modify: `src/app/(app)/musculation/seance/actions.ts`

**Step 1 : Lire le fichier actuel**

Lire `src/app/(app)/musculation/seance/actions.ts` pour voir le code exact et les imports déjà présents.

**Step 2 : Ajouter la Server Action après `quickStartWorkout`**

```typescript
export async function buildAndStartWorkout(exerciseIds: string[]): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  if (exerciseIds.length === 0) throw new Error("Aucun exercice sélectionné")
  if (exerciseIds.length > 30) throw new Error("Maximum 30 exercices par séance")

  const found = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds } },
    select: { id: true, name: true },
  })
  if (found.length !== exerciseIds.length) throw new Error("Exercice(s) invalide(s)")

  // Nom de la séance : premier exercice ou générique si plusieurs
  const name = found.length === 1
    ? found[0].name
    : `Séance du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`

  // Conserver l'ordre de sélection
  const orderedExercises = exerciseIds.map((id, index) => {
    const ex = found.find((f) => f.id === id)!
    return { exerciseId: ex.id, order: index + 1 }
  })

  let workoutId: string
  try {
    const workout = await prisma.workout.create({
      data: {
        name,
        userId: session.user.id,
        status: "EN_COURS",
        startedAt: new Date(),
        exercises: {
          create: orderedExercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            order: ex.order,
            sets: 3,
            reps: 10,
            weight: null,
            restSeconds: 60,
          })),
        },
      },
    })
    workoutId = workout.id
  } catch (err) {
    console.error("[buildAndStartWorkout]", err)
    throw new Error("Erreur lors de la création de la séance")
  }

  redirect(`/musculation/seance/${workoutId}/live`)
}
```

**Step 3 : Commit**

```bash
git add 'src/app/(app)/musculation/seance/actions.ts'
git commit -m "feat: buildAndStartWorkout server action"
```

---

## Task 4 : CartBar — barre flottante

**Files:**
- Create: `src/app/(app)/musculation/cart-bar.tsx`

**Step 1 : Créer le fichier**

```typescript
"use client"

import { useState } from "react"
import { useCart } from "./cart-context"
import { buildAndStartWorkout } from "./seance/actions"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export function CartBar() {
  const { items, clear } = useCart()
  const [loading, setLoading] = useState(false)

  if (items.length === 0) return null

  async function handleStart() {
    if (loading) return
    setLoading(true)
    try {
      await buildAndStartWorkout(items.map((i) => i.id))
      clear()
    } catch (err) {
      if (isRedirectError(err)) throw err
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <span className="flex-1 text-sm font-medium">
          🏋️ {items.length} exercice{items.length > 1 ? "s" : ""}
        </span>
        <button
          onClick={clear}
          className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border"
        >
          × Vider
        </button>
        <button
          onClick={handleStart}
          disabled={loading}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          {loading ? "Démarrage…" : "▶ Démarrer"}
        </button>
      </div>
    </div>
  )
}
```

**Step 2 : Ajouter `CartBar` dans le layout**

Lire `src/app/(app)/musculation/layout.tsx`, puis le modifier :

```typescript
import { CartProvider } from "./cart-context"
import { CartBar } from "./cart-bar"

export default function MusculationLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartBar />
    </CartProvider>
  )
}
```

**Step 3 : Commit**

```bash
git add 'src/app/(app)/musculation/cart-bar.tsx' \
        'src/app/(app)/musculation/layout.tsx'
git commit -m "feat: floating cart bar for workout builder"
```

---

## Task 5 : ExerciseCard — remplacer quick start par add/remove panier

**Files:**
- Modify: `src/app/(app)/musculation/[slug]/exercise-card.tsx`

**Step 1 : Lire le fichier actuel**

Lire `src/app/(app)/musculation/[slug]/exercise-card.tsx`.

**Step 2 : Réécrire le fichier entièrement**

```typescript
"use client"

import { useCart } from "../cart-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type DifficultyKey = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"

const difficultyConfig: Record<DifficultyKey, { label: string; className: string }> = {
  DEBUTANT: { label: "Débutant", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  INTERMEDIAIRE: { label: "Intermédiaire", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  AVANCE: { label: "Avancé", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

type Props = {
  exercise: {
    id: string
    name: string
    description: string
    image: string | null
    equipment: string | null
    difficulty: DifficultyKey
  }
}

export function ExerciseCard({ exercise }: Props) {
  const { hasItem, addItem, removeItem } = useCart()
  const inCart = hasItem(exercise.id)
  const diff = difficultyConfig[exercise.difficulty] ?? { label: exercise.difficulty, className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" }

  function handleToggle() {
    if (inCart) {
      removeItem(exercise.id)
    } else {
      addItem({ id: exercise.id, name: exercise.name, image: exercise.image })
    }
  }

  return (
    <Card className={`bg-background/80 backdrop-blur-sm h-full transition-colors ${inCart ? "border-primary" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-2xl" aria-hidden="true">{exercise.image ?? "🏋️"}</div>
          <Badge className={diff.className}>{diff.label}</Badge>
        </div>
        <CardTitle className="text-base mt-2">{exercise.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{exercise.description}</p>
        {exercise.equipment && (
          <p className="text-xs text-muted-foreground"><span aria-hidden="true">🔧</span> {exercise.equipment}</p>
        )}
        <button
          onClick={handleToggle}
          className={`w-full rounded-xl py-2 text-sm font-semibold transition-colors ${
            inCart
              ? "bg-primary/10 text-primary border border-primary"
              : "border hover:border-primary hover:text-primary"
          }`}
        >
          {inCart ? "✅ Dans la séance — Retirer" : "+ Ajouter à la séance"}
        </button>
      </CardContent>
    </Card>
  )
}
```

**Step 3 : Vérifier**

Naviguer sur `/musculation/biceps`, vérifier que les cartes affichent "+ Ajouter à la séance" et que la barre flottante apparaît après ajout.

**Step 4 : Commit**

```bash
git add 'src/app/(app)/musculation/[slug]/exercise-card.tsx'
git commit -m "feat: exercise card with cart add/remove instead of quick start"
```

---

## Task 6 : Page historique

**Files:**
- Create: `src/app/(app)/musculation/historique/page.tsx`

**Step 1 : Créer le fichier**

```typescript
import Link from "next/link"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { ChevronRight, ArrowRight } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"

function formatDuration(startedAt: Date | null, completedAt: Date | null): string {
  if (!startedAt || !completedAt) return ""
  const seconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s > 0 ? `${m} min ${s}s` : `${m} min`
}

export default async function HistoriquePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id, status: "TERMINEE" },
    include: { exercises: { include: { exercise: true } } },
    orderBy: { completedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Historique</span>
      </nav>

      <h1 className="text-3xl font-bold">Historique des séances</h1>

      {workouts.length === 0 ? (
        <p className="text-muted-foreground">Aucune séance terminée pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => {
            const date = workout.completedAt?.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
            const duration = formatDuration(workout.startedAt, workout.completedAt)
            return (
              <Card key={workout.id} className="bg-background/80 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1">
                    <p className="font-medium">{workout.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {date}
                      {" · "}
                      {workout.exercises.length} exercice{workout.exercises.length > 1 ? "s" : ""}
                      {duration ? ` · ${duration}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/musculation/seance/${workout.id}`}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Voir <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 2 : Commit**

```bash
git add 'src/app/(app)/musculation/historique/page.tsx'
git commit -m "feat: workout history page"
```

---

## Task 7 : Lien historique dans /musculation

**Files:**
- Modify: `src/app/(app)/musculation/page.tsx`

**Step 1 : Lire le fichier actuel**

Lire `src/app/(app)/musculation/page.tsx`.

**Step 2 : Ajouter un lien "Historique" à côté du titre**

Remplacer le bloc `<div>` du titre :
```tsx
<div>
  <h1 className="text-3xl font-bold">Musculation</h1>
  <p className="text-muted-foreground mt-1">Choisissez un groupe musculaire</p>
</div>
```
Par :
```tsx
<div className="flex items-center justify-between flex-wrap gap-3">
  <div>
    <h1 className="text-3xl font-bold">Musculation</h1>
    <p className="text-muted-foreground mt-1">Choisissez un groupe musculaire</p>
  </div>
  <Link
    href="/musculation/historique"
    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
  >
    Historique <ArrowRight className="h-4 w-4" />
  </Link>
</div>
```

Vérifier que `ArrowRight` est importé depuis `lucide-react` (il l'est déjà).

**Step 3 : Vérifier le flux complet**

1. `/musculation` → lien "Historique" visible en haut à droite
2. `/musculation/biceps` → cartes avec "+ Ajouter à la séance"
3. Ajouter 2 exercices → barre flottante visible
4. Aller sur `/musculation/pectoraux` → barre toujours présente avec le bon compte
5. Clic "▶ Démarrer" → redirect `/live` avec tous les exercices
6. Terminer la séance → apparaît dans `/musculation/historique`

**Step 4 : Commit**

```bash
git add 'src/app/(app)/musculation/page.tsx'
git commit -m "feat: history link in musculation page"
```
