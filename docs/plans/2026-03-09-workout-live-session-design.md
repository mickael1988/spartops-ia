# Séance Live — Design Document

**Date :** 2026-03-09
**Objectif :** Permettre à l'utilisateur de suivre sa séance en temps réel depuis `/musculation/seance/[id]/live` avec chronomètres, suivi série par série, et persistance immédiate.

---

## Architecture

```
/musculation/seance/[id]          ← page de détail (lecture)
    └── bouton "Démarrer la séance"
         └── /musculation/seance/[id]/live   ← NOUVEAU
```

- **Server Component wrapper** : charge les données Prisma, passe en props au Client Component
- **Client Component `WorkoutLive`** : gère tout l'état interactif (exercice actif, séries, chronomètres)
- **Server Actions** :
  - `completeSet(workoutExerciseId, actualReps, actualWeight)` → incrémente `completedSets`, persiste reps/poids réels
  - `startWorkout(workoutId)` → status `EN_COURS`, `startedAt = now()`
  - `finishWorkout(workoutId)` → status `TERMINEE`, `completedAt = now()`

## Schéma de données utilisé

Champs Prisma existants, aucune migration nécessaire :
- `Workout.status` : `PLANIFIEE` → `EN_COURS` → `TERMINEE`
- `Workout.startedAt` / `completedAt`
- `WorkoutExercise.completedSets` : incrémenté à chaque série validée

## Interface mobile

```
┌─────────────────────────────────┐
│  ⏱ 00:14:32   [Exercice 2 / 5] │  ← chrono total + progression
├─────────────────────────────────┤
│  🏋️  Ab Wheel                   │  ← exercice actif + image
│  Groupe : Abdominaux            │
│                                 │
│  Série 2 / 4                    │
│  ┌──────────┐  ┌─────────────┐  │
│  │  12 reps │  │   0 kg      │  │  ← champs éditables
│  └──────────┘  └─────────────┘  │
│                                 │
│  [   ✓  VALIDER LA SÉRIE    ]   │  ← gros bouton principal
│                                 │
├─────────────────────────────────┤
│  😴 REPOS : 01:00               │  ← affiché après validation
│  [+15s]  [Reset]  [Passer]      │
├─────────────────────────────────┤
│  Séries : ● ● ○ ○               │  ← dots de progression
├─────────────────────────────────┤
│  [← Préc.]          [Suiv. →]  │
└─────────────────────────────────┘
```

## Comportements clés

| Événement | Action |
|-----------|--------|
| Ouverture `/live` | `startWorkout()`, chrono total démarre |
| Valider une série | `completeSet()`, chrono repos démarre auto |
| Chrono repos à 0 | Vibration (Web Vibration API) + bip (AudioContext) |
| Chrono repos : +15s / Reset / Passer | Contrôle manuel |
| Toutes séries d'un exercice cochées | Bouton "Exercice suivant" s'active |
| Dernier exercice terminé | Bouton "Terminer la séance" |
| Terminer la séance | `finishWorkout()`, redirect vers page de détail avec résumé |

## Fichiers à créer/modifier

- `src/app/(app)/musculation/seance/[id]/live/page.tsx` — Server Component wrapper
- `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx` — Client Component principal
- `src/app/(app)/musculation/seance/actions.ts` — ajouter `startWorkout`, `finishWorkout`, `completeSet`
- `src/app/(app)/musculation/seance/[id]/page.tsx` — ajouter bouton "Démarrer la séance"
