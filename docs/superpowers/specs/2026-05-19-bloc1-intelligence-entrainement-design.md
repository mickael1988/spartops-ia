# Bloc 1 — Intelligence d'entraînement

**Date :** 2026-05-19  
**Stack :** Next.js 16 App Router · TypeScript · Tailwind CSS v4 · Prisma 7 · React

---

## Objectif

Ajouter une couche d'intelligence à la section musculation pour rivaliser avec les apps comme Hevy et Strong. Trois features sans migration de schéma : toutes les données nécessaires existent déjà dans `SetLog`, `OneRepMax` et `WorkoutExercise`.

---

## Feature 1 — Historique par exercice dans le live workout

### Comportement

Dans chaque carte d'exercice active (`WorkoutLive`), un toggle replié s'affiche en bas de la carte, sous les dots de progression.

**État replié (par défaut) :**
```
[bande bleue accent] 📋 Voir mes sessions précédentes  ∨
```
Style : `border-left: 3px solid #3F5EFB`, fond `#3F5EFB18`, texte bleuté, chevron `∨`.

**État déplié (après tap) :**
- Liste des **3 dernières sessions terminées** pour cet exercice (filtrées par `userId`, `status: TERMINEE`, triées par `completedAt desc`)
- Chaque ligne affiche : `date courte · poids × reps × séries` + delta vs session précédente (`+2.5 kg` en vert, `−2.5 kg` en rouge)
- La session avec le meilleur poids max porte un badge `🏆 PR` doré inline
- Le chevron passe à `∧`

### Données requises

Dans `seance/[id]/live/page.tsx`, pour chaque `workoutExercise` du workout courant, requêter les 3 derniers workouts TERMINEE qui contiennent cet exercice, avec leurs SetLogs agrégés :

```ts
// Pour chaque exercice du workout en cours, récupérer l'historique
const exerciseIds = workout.exercises.map(e => e.exerciseId)

const pastWorkoutExercises = await prisma.workoutExercise.findMany({
  where: {
    exerciseId: { in: exerciseIds },
    workout: {
      userId: session.user.id,
      status: "TERMINEE",
      id: { not: workoutId }, // exclure la séance courante
    },
  },
  include: {
    setLogs: { orderBy: { setNumber: "asc" } },
    workout: { select: { completedAt: true } },
  },
  orderBy: { workout: { completedAt: "desc" } },
})

// Grouper par exerciseId → garder les 3 workouts les plus récents par exercice
// Construire un Map<exerciseId, HistoryEntry[]> passé en props à WorkoutLive
```

Chaque `HistoryEntry` : `{ date: string; maxWeight: number; totalReps: number; sets: number }` où `maxWeight = max(setLog.weight)` et `totalReps = sum(setLog.reps)` pour ce workoutExercise.

### Composant

Nouveau composant client `ExerciseHistory` dans `workout-live.tsx` :
- Props : `history: { date: string; weight: number; reps: number; sets: number }[]`, `currentPR: number`
- Gère le state `open` en local (`useState`)
- Calcule les deltas entre lignes consécutives

---

## Feature 2 — Détection PR en temps réel

### Comportement

Dans la carte d'exercice active, dès que le champ **Poids (kg)** contient une valeur **strictement supérieure au PR actuel** de cet exercice (champ `estimatedMax` de `OneRepMax`), une bannière dorée s'affiche **au-dessus du toggle historique** :

```
🏆  Nouveau record personnel !
    85 kg dépasse votre PR de 80 kg
```

Style : `border-left: 3px solid #f59e0b`, fond `#f59e0b18`, texte `#f59e0b`.

La bannière disparaît si le poids repasse en dessous du PR.

### Données requises

Dans `seance/[id]/live/page.tsx`, ajouter une requête `OneRepMax` pour récupérer le meilleur `estimatedMax` par exercice :

```ts
const oneRepMaxes = await prisma.oneRepMax.findMany({
  where: {
    userId: session.user.id,
    exerciseId: { in: exerciseIds },
  },
  orderBy: { estimatedMax: "desc" },
})
// Construire un Map<exerciseId, number> → prCurrentByExercise
```

Ce `Map` est passé en props à `WorkoutLive`.

### Implémentation

Logique pure dans `WorkoutLive` : comparer `weightMap[we.id] ?? 0` avec `prByExercise.get(we.exerciseId) ?? 0`. Si supérieur → afficher la bannière. Aucun appel serveur supplémentaire, recalcul à chaque frappe dans l'input via le state React existant.

---

## Feature 3 — Volume total de séance

### 3a — Écran de fin de séance

Modifier l'écran de fin (état `allDone` dans `WorkoutLive`) pour afficher un bloc stats **3 colonnes** :

| Durée | Séries | kg soulevés |
|-------|--------|-------------|
| 42 min | 9 | **4 820** |

- Durée : `elapsedSeconds` formaté
- Séries : somme de `completedSetsMap`
- Volume : calculé côté client depuis les states React existants — `Σ (weightMap[we.id] ?? 0) × (repsMap[we.id] ?? we.reps) × (completedSetsMap[we.id] ?? 0)` sur tous les exercices, arrondi à l'entier

La colonne volume est mise en surbrillance bleue (`bg-primary/10`, `text-primary`, `border-primary/30`).

### 3b — Page historique

Dans `src/app/(app)/musculation/historique/page.tsx`, ajouter pour chaque séance terminée un badge `⚡ X kg soulevés` calculé depuis les `SetLog` agrégés :

```ts
const volume = setLogs.reduce((acc, log) => acc + (log.weight ?? 0) * log.reps, 0)
```

Badge : `bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 text-xs font-bold`.

---

## Architecture — Fichiers à modifier

| Fichier | Action | Raison |
|---------|--------|--------|
| `seance/[id]/live/page.tsx` | Modifier | Ajouter requête historique + PR par exercice en props |
| `seance/[id]/live/workout-live.tsx` | Modifier | `ExerciseHistory` + bannière PR + bloc stats fin de séance |
| `musculation/historique/page.tsx` | Modifier | Ajouter calcul volume + badge dans chaque card |

---

## Contraintes

- Aucune migration de schéma Prisma
- Respecter le style SpartOps : couleurs `#3F5EFB` / `#F50535`, `rounded-2xl`, `backdrop-blur-sm`, Tailwind v4
- L'historique n'est chargé qu'une fois au rendu de la page live (pas de fetch client)
- Le calcul PR est purement client (comparaison dans `weightMap`)
- Volume calculé côté client en fin de séance depuis l'état local, et côté serveur pour l'historique
