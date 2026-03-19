# Exercise Progression Design Spec

## Goal

Afficher l'évolution du 1RM estimé pour **tous les exercices pratiqués** (pas seulement les 3 fondamentaux), calculé automatiquement depuis les `SetLog` existants. Accessible via une page globale et depuis chaque fiche exercice.

---

## Context

### Données disponibles (aucun changement de schéma)

`SetLog` enregistre chaque série validée : `reps`, `weight (Float?)`, `completedAt`, via `WorkoutExercise.workoutId` → `Workout`. Pour calculer le 1RM estimé d'une séance, on regroupe les SetLog par workout, on prend la série avec le meilleur Epley (`weight × (1 + reps/30)`), et on obtient un point sur le graphique.

### Formule Epley (déjà utilisée dans `progression-client.tsx`)
```
1RM ≈ Math.round(poids × (1 + reps / 30))
```

### Filtre de pertinence
Seuls les exercices avec **≥ 2 workouts TERMINEE distincts** ayant au moins un SetLog avec `weight > 0` sont affichés. Un exercice fait une seule fois ne permet aucune comparaison.

---

## Nouvelles pages et composants

### 1. Page serveur — `src/app/(app)/musculation/progression/exercices/page.tsx`

Page serveur Next.js 16 App Router. Reçoit `searchParams: { exercice?: string }`.

**Extraction du paramètre de filtre :**

```ts
const exerciceId = searchParams?.exercice ?? null
```

**Requête Prisma exacte (userId scopé, status filtré) :**

```ts
const setLogs = await prisma.setLog.findMany({
  where: {
    workoutExercise: {
      workout: {
        userId: session.user.id,
        status: "TERMINEE",
        completedAt: { not: null }, // exclure les workouts sans date
      },
      ...(exerciceId ? { exerciseId: exerciceId } : {}), // filtre si ?exercice présent
    },
    weight: { gt: 0 }, // SetLog sans poids ignorés
  },
  select: {
    reps: true,
    weight: true,
    workoutExercise: {
      select: {
        exerciseId: true,
        workout: {
          select: { id: true, completedAt: true },
        },
        exercise: {
          select: {
            id: true,
            name: true,
            image: true,
            muscleGroup: { select: { name: true } },
          },
        },
      },
    },
  },
})
```

**Groupement côté serveur :**
```
Pour chaque SetLog :
  epley = Math.round(weight × (1 + reps / 30))

Grouper par exerciseId → workoutId → max(epley) par workout
→ pour chaque exercice : liste de { recordedAt: workout.completedAt!.toISOString(), estimatedMax }
  // completedAt! est sûr ici : la requête filtre { completedAt: { not: null } }
→ trier par recordedAt ASC
→ bestMax = max de tous les estimatedMax
→ garder l'exercice uniquement si count(workouts distincts) ≥ 2
→ trier les exercices par recordedAt DESC (le plus récemment entraîné en premier)
```

Note : le champ de date est normalisé en `recordedAt` (string ISO) pour être compatible avec le composant `ProgressionChart` existant.

**Passe les données typées à `ExercicesProgressionClient`.**

Type de sortie :
```ts
type ExerciseProgressionRecord = {
  id: string
  name: string
  image: string | null
  muscleGroupName: string
  bestMax: number
  history: Array<{ recordedAt: string; estimatedMax: number }>
}
```

### 2. Composant client — `src/app/(app)/musculation/progression/exercices/exercices-client.tsx`

Composant client `"use client"`.

**Props :**
```ts
type Props = {
  exercises: ExerciseProgressionRecord[]
  filteredExerciseId: string | null
}
```

**Mode liste (`filteredExerciseId === null`) :**
- Breadcrumb : Musculation → Progression 1RM → Tous les exercices
- Grille de cards (1 col mobile, 2 cols sm, 3 cols lg)
- Chaque card : nom, groupe musculaire, `bestMax` en gras orange, mini `ProgressionChart` SVG (240×80)
- Empty state : "Complète au moins 2 séances d'un même exercice pour voir ta progression ici."

**Mode filtré (`filteredExerciseId !== null`) :**
- Breadcrumb : Musculation → Progression 1RM → Tous les exercices → [Nom exercice]
- Lien "← Retour" vers `/musculation/progression/exercices`
- Titre : nom de l'exercice + groupe musculaire
- Graphique SVG agrandi (viewBox 400×120)
- Tableau historique sous le graphique : colonnes Date | 1RM estimé
- Empty state (0 ou 1 workout) : "Pas encore assez de données pour afficher une progression. Complète au moins 2 séances de cet exercice."

**`ProgressionChart` :** réutiliser le composant SVG existant depuis `progression-client.tsx` en l'extrayant dans un fichier partagé `src/app/(app)/musculation/progression/progression-chart.tsx`, ou le copier localement. Les données passées doivent avoir la shape `{ recordedAt: string; estimatedMax: number }[]` (compatible).

### 3. Modification — `src/app/(app)/musculation/[slug]/exercise-card.tsx`

Ajouter un lien "Ma progression →" sous le bouton "+ Ajouter à la séance". `exercise.id` est déjà dans les props.

```tsx
import Link from "next/link"
// ...
<Link
  href={`/musculation/progression/exercices?exercice=${exercise.id}`}
  className="mt-1 block text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
>
  Ma progression →
</Link>
```

Le lien est toujours visible. Si pas de données, la page de progression affiche l'empty state défini ci-dessus.

### 4. Modification — `src/app/(app)/musculation/progression/progression-client.tsx`

Ajouter un lien "Voir tous mes exercices →" en bas de la page `ProgressionClient`, après les 3 cartes fondamentaux et avant le bouton "Terminer". Style : `text-sm font-medium text-orange-500 hover:underline`.

```tsx
<div className="flex justify-center">
  <Link href="/musculation/progression/exercices" className="text-sm font-medium text-orange-500 hover:underline">
    Voir tous mes exercices →
  </Link>
</div>
```

---

## Navigation

- Sidebar : pas de nouveau item
- Accès : depuis chaque fiche exercice (lien "Ma progression →") + depuis `/musculation/progression` (lien "Voir tous mes exercices →")
- Breadcrumbs définis dans la section composant ci-dessus

---

## Contraintes

- Aucune migration de schéma
- Aucune nouvelle action serveur
- `weight: { gt: 0 }` dans la requête pour exclure les séries sans poids
- `completedAt: { not: null }` pour éviter les erreurs de tri/rendu
- Champ normalisé `recordedAt` (string ISO) dans le DTO pour compatibilité avec `ProgressionChart`
