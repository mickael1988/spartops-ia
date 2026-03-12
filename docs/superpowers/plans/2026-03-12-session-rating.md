# Session Rating Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un système de notation 5 étoiles + commentaire optionnel à la fin d'une séance de musculation, avec affichage et modification sur la page récapitulatif.

**Architecture:** Modale post-séance dans `workout-live.tsx` → Server Action `rateWorkout` → affichage readonly + modification confirmée via `<RatingEdit>` sur la page récap. Le composant `<StarRating>` est réutilisable entre les deux surfaces.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7 (PrismaPg adapter), Tailwind CSS v4, better-auth

---

## Chunk 1: Base de données

### Task 1: Ajouter les champs rating et comment au schéma Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Ouvrir `prisma/schema.prisma` et localiser le modèle `Workout`**

  Le modèle se trouve autour de la ligne 106. Il ressemble à :
  ```prisma
  model Workout {
    id          String        @id @default(cuid())
    userId      String
    ...
    createdAt   DateTime      @default(now())
    exercises WorkoutExercise[]
  }
  ```

- [ ] **Step 2: Ajouter les deux champs optionnels à la fin du modèle, avant la relation**

  Ajouter juste avant la ligne `exercises WorkoutExercise[]` :
  ```prisma
  rating    Int?    // 1 à 5, null si pas noté
  comment   String? // commentaire libre optionnel, max 500 caractères côté app
  ```

  Le modèle doit ressembler à :
  ```prisma
  model Workout {
    id          String        @id @default(cuid())
    userId      String
    user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
    name        String
    isTemplate  Boolean       @default(false)
    status      WorkoutStatus @default(PLANIFIEE)
    scheduledAt DateTime?
    startedAt   DateTime?
    completedAt DateTime?
    createdAt   DateTime      @default(now())
    rating      Int?
    comment     String?

    exercises WorkoutExercise[]
  }
  ```

- [ ] **Step 3: Appliquer la migration**

  ```bash
  pnpm db:push
  ```
  Attendu : `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Vérifier que le type généré inclut les nouveaux champs**

  ```bash
  pnpm db:generate
  ```
  Puis vérifier dans `src/generated/prisma/client/index.d.ts` que le type `Workout` contient `rating: number | null` et `comment: string | null`.

- [ ] **Step 5: Commit**

  ```bash
  git add prisma/schema.prisma src/generated/
  git commit -m "feat: add rating and comment fields to Workout model"
  ```

---

## Chunk 2: Server Action rateWorkout

### Task 2: Ajouter la Server Action `rateWorkout`

**Files:**
- Modify: `src/app/(app)/musculation/seance/actions.ts`

- [ ] **Step 1: Ajouter l'import de `revalidatePath` en haut du fichier**

  Le fichier commence par :
  ```ts
  "use server"

  import { redirect } from "next/navigation"
  import { headers } from "next/headers"
  import { auth } from "@/lib/auth"
  import { prisma } from "@/lib/prisma"
  ```

  Modifier la première ligne d'import pour ajouter `revalidatePath` :
  ```ts
  import { redirect, revalidatePath } from "next/navigation"
  ```

- [ ] **Step 2: Ajouter la fonction `rateWorkout` à la fin du fichier (après `finishWorkout`)**

  ```ts
  export async function rateWorkout(
    workoutId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Non authentifié")

    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId: session.user.id },
      select: { id: true, isTemplate: true },
    })
    if (!workout) throw new Error("Séance introuvable")
    if (workout.isTemplate) throw new Error("Les templates ne peuvent pas être notés")
    if (rating < 1 || rating > 5) throw new Error("Note invalide (1–5)")

    const trimmedComment = comment ? comment.trim().slice(0, 500) : null

    await prisma.workout.update({
      where: { id: workoutId },
      data: { rating, comment: trimmedComment },
    })

    revalidatePath(`/musculation/seance/${workoutId}`)
  }
  ```

- [ ] **Step 3: Vérifier la compilation TypeScript**

  ```bash
  pnpm build
  ```
  Attendu : pas d'erreur TypeScript liée à `actions.ts`.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/(app)/musculation/seance/actions.ts
  git commit -m "feat: add rateWorkout server action"
  ```

---

## Chunk 3: Composant StarRating

### Task 3: Créer le composant `<StarRating>` réutilisable

**Files:**
- Create: `src/components/ui/star-rating.tsx`

- [ ] **Step 1: Créer le fichier `src/components/ui/star-rating.tsx`**

  ```tsx
  "use client"

  import { useState } from "react"

  type StarRatingProps =
    | { mode: "readonly"; value: number | null }
    | { mode: "interactive"; value: number | null; onChange: (rating: number) => void }

  export function StarRating(props: StarRatingProps) {
    const [hovered, setHovered] = useState<number | null>(null)

    const display = hovered ?? props.value ?? 0

    return (
      <div className="flex gap-1" role={props.mode === "interactive" ? "radiogroup" : undefined}>
        {Array.from({ length: 5 }, (_, i) => {
          const starValue = i + 1
          const filled = starValue <= display

          if (props.mode === "readonly") {
            return (
              <span
                key={i}
                className={`text-2xl select-none ${filled ? "text-yellow-400" : "text-muted-foreground/30"}`}
                aria-hidden="true"
              >
                ★
              </span>
            )
          }

          return (
            <button
              key={i}
              type="button"
              aria-label={`${starValue} étoile${starValue > 1 ? "s" : ""}`}
              className={`text-2xl transition-colors ${filled ? "text-yellow-400" : "text-muted-foreground/30"} hover:text-yellow-400 cursor-pointer`}
              onMouseEnter={() => setHovered(starValue)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => props.onChange(starValue)}
            >
              ★
            </button>
          )
        })}
      </div>
    )
  }
  ```

- [ ] **Step 2: Vérifier la compilation**

  ```bash
  pnpm build
  ```
  Attendu : pas d'erreur TypeScript.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/ui/star-rating.tsx
  git commit -m "feat: add reusable StarRating component"
  ```

---

## Chunk 4: RatingModal + intégration dans workout-live

### Task 4: Créer la modale de notation post-séance

**Files:**
- Create: `src/app/(app)/musculation/seance/[id]/live/rating-modal.tsx`
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

- [ ] **Step 1: Créer `rating-modal.tsx`**

  ```tsx
  "use client"

  import { useState } from "react"
  import { StarRating } from "@/components/ui/star-rating"

  type RatingModalProps = {
    onSubmit: (rating: number, comment: string) => Promise<void>
    onSkip: () => Promise<void>
  }

  export function RatingModal({ onSubmit, onSkip }: RatingModalProps) {
    const [rating, setRating] = useState<number | null>(null)
    const [comment, setComment] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit() {
      if (!rating) return
      setLoading(true)
      setError(null)
      try {
        await onSubmit(rating, comment)
      } catch {
        setError("Erreur lors de l'enregistrement de la note, la séance sera quand même terminée.")
        await onSkip()
      } finally {
        setLoading(false)
      }
    }

    async function handleSkip() {
      setLoading(true)
      await onSkip()
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm rounded-3xl bg-background border shadow-xl p-6 space-y-5">
          <h2 className="text-xl font-bold text-center">Comment s'est passée la séance ?</h2>

          <div className="flex justify-center">
            <StarRating mode="interactive" value={rating} onChange={setRating} />
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Commentaire… (optionnel)"
            maxLength={500}
            rows={3}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleSubmit}
              disabled={!rating || loading}
              className="w-full rounded-2xl py-3 text-base font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
            >
              {loading ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              onClick={handleSkip}
              disabled={loading}
              className="w-full rounded-2xl py-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Passer
            </button>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Modifier `workout-live.tsx` — ajouter l'import et l'état de la modale**

  En haut du fichier, après la ligne `import { startWorkout, completeSet, finishWorkout } from "../../actions"`, modifier l'import pour ajouter `rateWorkout` :
  ```ts
  import { startWorkout, completeSet, finishWorkout, rateWorkout } from "../../actions"
  ```

  Ajouter également l'import du composant `RatingModal` :
  ```ts
  import { RatingModal } from "./rating-modal"
  ```

  Dans la fonction `WorkoutLive`, ajouter cet état après `const [finishing, setFinishing] = useState(false)` :
  ```ts
  const [showRatingModal, setShowRatingModal] = useState(false)
  ```

- [ ] **Step 3: Remplacer `handleFinish` et ajouter les deux handlers de la modale**

  **Flux d'erreur important :** `handleRatingSubmit` laisse remonter les erreurs de `rateWorkout` vers `RatingModal` qui les affiche et appelle `onSkip`. `handleRatingSkip` est le seul chemin vers `finishWorkout` — il est appelé soit directement ("Passer"), soit par `RatingModal` après une erreur de `rateWorkout`. Cela garantit que `finishWorkout` est appelé exactement une fois.

  Remplacer la fonction `handleFinish` existante par :
  ```ts
  async function handleFinish() {
    setShowRatingModal(true)
  }

  // appelé par RatingModal quand l'utilisateur clique "Enregistrer"
  // lance rateWorkout — si ça throw, RatingModal affiche l'erreur et appelle onSkip
  async function handleRatingSubmit(rating: number, comment: string) {
    await rateWorkout(workout.id, rating, comment) // peut throw intentionnellement
    setFinishing(true)
    try {
      await finishWorkout(workout.id)
      router.push(`/musculation/seance/${workout.id}`)
    } catch {
      setFinishing(false)
    }
  }

  // appelé par RatingModal quand l'utilisateur clique "Passer" OU après une erreur rateWorkout
  async function handleRatingSkip() {
    setFinishing(true)
    try {
      await finishWorkout(workout.id)
      router.push(`/musculation/seance/${workout.id}`)
    } catch {
      setFinishing(false)
    }
  }
  ```

- [ ] **Step 4: Ajouter le rendu de la modale dans le JSX**

  Le second `return` du composant commence actuellement par :
  ```tsx
  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24">
  ```

  Remplacer exactement cette ligne d'ouverture `return (` par :
  ```tsx
  return (
    <>
      {showRatingModal && (
        <RatingModal
          onSubmit={handleRatingSubmit}
          onSkip={handleRatingSkip}
        />
      )}
      <div className="space-y-4 max-w-lg mx-auto pb-24">
  ```

  Et ajouter `</>` juste avant la parenthèse fermante finale `)` du return (après le `</div>` de clôture du `<div className="space-y-4 ...">`).

- [ ] **Step 5: Vérifier la compilation**

  ```bash
  pnpm build
  ```
  Attendu : pas d'erreur TypeScript.

- [ ] **Step 6: Test manuel**

  Démarrer le serveur de développement :
  ```bash
  pnpm dev
  ```
  - Ouvrir une séance live → compléter tous les exercices
  - Cliquer "Terminer la séance" → la modale doit s'afficher
  - Tester "Passer" → redirige vers le récap sans note
  - Recommencer, noter 4 étoiles + commentaire "Super séance" → cliquer "Enregistrer" → redirige vers le récap
  - Vérifier en base (ou `pnpm db:studio`) que `rating=4` et `comment="Super séance"` sont bien enregistrés

- [ ] **Step 7: Commit**

  ```bash
  git add src/app/(app)/musculation/seance/\[id\]/live/rating-modal.tsx
  git add src/app/(app)/musculation/seance/\[id\]/live/workout-live.tsx
  git commit -m "feat: add post-workout rating modal"
  ```

---

## Chunk 5: RatingEdit + intégration dans la page récapitulatif

### Task 5: Créer le composant `<RatingEdit>` et l'intégrer dans la page récap

**Files:**
- Create: `src/app/(app)/musculation/seance/[id]/rating-edit.tsx`
- Modify: `src/app/(app)/musculation/seance/[id]/page.tsx`

- [ ] **Step 1: Créer `rating-edit.tsx`**

  ```tsx
  "use client"

  import { useState } from "react"
  import { useRouter } from "next/navigation"
  import { StarRating } from "@/components/ui/star-rating"
  import { rateWorkout } from "../actions"

  type RatingEditProps = {
    workoutId: string
    initialRating: number | null
    initialComment: string | null
  }

  export function RatingEdit({ workoutId, initialRating, initialComment }: RatingEditProps) {
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)
    const [rating, setRating] = useState<number | null>(initialRating)
    const [comment, setComment] = useState(initialComment ?? "")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleConfirm() {
      if (!rating) return
      setLoading(true)
      setError(null)
      try {
        await rateWorkout(workoutId, rating, comment)
        setShowModal(false)
        router.refresh()
      } catch {
        setError("Erreur lors de l'enregistrement. Réessaie.")
      } finally {
        setLoading(false)
      }
    }

    return (
      <>
        {/* Affichage de la note actuelle */}
        <div className="flex items-center gap-3 flex-wrap">
          {initialRating !== null ? (
            <>
              <StarRating mode="readonly" value={initialRating} />
              {initialComment && (
                <p className="text-sm text-muted-foreground italic">"{initialComment}"</p>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
              >
                Modifier
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
            >
              Non notée — cliquer pour noter
            </button>
          )}
        </div>

        {/* Modale de modification */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-background border shadow-xl p-6 space-y-5">
              <h2 className="text-xl font-bold text-center">
                {initialRating !== null ? "Modifier la note" : "Noter la séance"}
              </h2>

              <div className="flex justify-center">
                <StarRating mode="interactive" value={rating} onChange={setRating} />
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Commentaire… (optionnel)"
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="flex-1 rounded-2xl py-3 text-base font-medium border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!rating || loading}
                  className="flex-1 rounded-2xl py-3 text-base font-bold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
                >
                  {loading ? "…" : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }
  ```

- [ ] **Step 2: Ajouter l'import de `<RatingEdit>` dans `page.tsx`**

  En haut du fichier, après la ligne `import { StartButton } from "../../mes-seances/start-button"`, ajouter :
  ```ts
  import { RatingEdit } from "./rating-edit"
  ```

  Les champs `rating` et `comment` sont des scalaires du modèle `Workout` — Prisma les inclut automatiquement dans le résultat de `findFirst` sans modification de la requête. Après `pnpm build`, TypeScript confirmera que `workout.rating` et `workout.comment` sont disponibles avec les types `number | null` et `string | null`.

- [ ] **Step 3: Insérer `<RatingEdit>` dans le JSX de `page.tsx`**

  Dans le JSX, localiser le dernier bloc conditionnel du groupe "Actions" (autour de la ligne 93–101 dans le fichier actuel) :
  ```tsx
  {!workout.isTemplate && workout.status === "TERMINEE" && (
    <Link
      href="/musculation"
      className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-bold text-white"
      style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
    >
      🏠 Retour au menu principal
    </Link>
  )}
  ```

  Ajouter le bloc `<RatingEdit>` **immédiatement après** la fermeture `)}` de ce bloc, et **avant** le commentaire `{/* Liste des exercices */}` :
  ```tsx
  {/* Note de la séance */}
  {!workout.isTemplate && workout.status === "TERMINEE" && (
    <RatingEdit
      workoutId={workout.id}
      initialRating={workout.rating}
      initialComment={workout.comment}
    />
  )}
  ```

- [ ] **Step 4: Vérifier la compilation**

  ```bash
  pnpm build
  ```
  Attendu : pas d'erreur TypeScript.

- [ ] **Step 5: Test manuel**

  ```bash
  pnpm dev
  ```
  - Naviguer vers une séance `TERMINEE` déjà notée → vérifier que les étoiles et le commentaire s'affichent
  - Cliquer "Modifier" → vérifier que la modale s'ouvre avec les valeurs pré-remplies
  - Changer la note → "Confirmer" → vérifier que la page se rafraîchit avec la nouvelle note
  - Naviguer vers une séance `TERMINEE` non notée → vérifier "Non notée — cliquer pour noter"
  - Naviguer vers un template → vérifier que `<RatingEdit>` n'apparaît pas

- [ ] **Step 6: Vérifier le lint**

  ```bash
  pnpm lint
  ```
  Attendu : pas d'erreur.

- [ ] **Step 7: Commit final**

  ```bash
  git add src/app/(app)/musculation/seance/\[id\]/rating-edit.tsx
  git add src/app/(app)/musculation/seance/\[id\]/page.tsx
  git commit -m "feat: display and edit workout rating on recap page"
  ```
