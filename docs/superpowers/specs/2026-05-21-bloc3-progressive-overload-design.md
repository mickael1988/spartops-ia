# Bloc 3 — Surcharge progressive (Progressive Overload)

**Date :** 2026-05-21  
**Stack :** Next.js 16 App Router · TypeScript · Tailwind CSS v4 · Prisma 7 · React

---

## Objectif

Afficher dans chaque carte d'exercice du live workout une suggestion de progression basée sur la dernière session et le RPE enregistré (Bloc 2). L'utilisateur sait exactement quoi viser sans avoir à calculer lui-même — comme Strong et Hevy.

**Aucune migration de schéma** : toutes les données nécessaires existent dans `SetLog.rpe`, `SetLog.reps`, `SetLog.weight` et `WorkoutExercise.reps`.

---

## Algorithme de progression

### Double progression (reps puis poids)

Pour chaque exercice, la plage de reps est calculée automatiquement à partir de la valeur cible actuelle :

```
repsMin = workoutExercise.reps - 2
repsMax = workoutExercise.reps + 2
```

Exemple : exercice configuré à 10 reps → plage 8–12.

### Règles selon le RPE de la dernière session

Le RPE utilisé est celui du **dernier set working** (setType ≠ WARMUP) de la dernière session terminée pour cet exercice.

| RPE | Direction | Logique |
|-----|-----------|---------|
| 1 (😌 Facile) | ↑ UP | Si `lastReps < repsMax` → même poids, +1 rep. Si `lastReps >= repsMax` → poids +2.5 kg, retomber à repsMin |
| 2 (😤 Moyen) | = HOLD | Même poids, mêmes reps |
| 3 (🔥 Difficile) | ↓ DOWN | Si `lastReps > repsMin` → même poids, −1 rep. Si `lastReps <= repsMin` → poids −2.5 kg, monter à repsMax |
| null (Passer) | NONE | Afficher uniquement "Dernière fois : X kg × Y reps" sans suggestion directionnelle |

### Cas d'absence d'historique

- Aucune session terminée pour cet exercice → **pas de bannière**
- Historique présent mais RPE null → bannière neutre sans flèche ni couleur directionnelle

---

## Type `Suggestion`

Calculé dans `page.tsx` et passé comme prop :

```ts
type Suggestion = {
  lastWeight: number
  lastReps: number
  lastRpe: number | null        // 1 | 2 | 3 | null
  suggestedWeight: number
  suggestedReps: number
  direction: "up" | "hold" | "down" | "none"
}
```

Prop ajoutée à `WorkoutLive` :

```ts
suggestionByExercise: Record<string, Suggestion>  // clé = workoutExerciseId
```

---

## UI — Bannière de suggestion

Affichée **en haut de la carte d'exercice active**, entre le header et le compteur de série. Absente si aucune suggestion.

### 3 états visuels

| Direction | Couleur | Icône | Exemple |
|-----------|---------|-------|---------|
| UP | Vert `#10b981` | ↑ | "Dernière fois : 80 kg × 9 reps 😌 — Objectif : ↑ 80 kg × 10" |
| HOLD | Bleu `#3F5EFB` | = | "Dernière fois : 80 kg × 8 reps 😤 — Objectif : = 80 kg × 8" |
| DOWN | Ambre `#f59e0b` | ↓ | "Dernière fois : 80 kg × 8 reps 🔥 — Objectif : ↓ 80 kg × 7" |
| NONE | Gris `#64748b` | — | "Dernière fois : 80 kg × 8 reps" |

### Style Tailwind (état UP à titre d'exemple)

```tsx
<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 mb-2 flex items-center justify-between gap-2">
  <p className="text-[10px] text-muted-foreground leading-snug">
    Dernière fois : <strong className="text-foreground">{lastWeight} kg × {lastReps} reps</strong> {rpeEmoji}
    <br />Objectif aujourd'hui
  </p>
  <span className="text-sm font-bold text-emerald-500 whitespace-nowrap">
    ↑ {suggestedWeight} kg × {suggestedReps}
  </span>
</div>
```

Les inputs reps/poids **ne sont pas pré-remplis** — la bannière est informative uniquement. L'utilisateur ajuste librement.

---

## Architecture — Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `seance/[id]/live/page.tsx` | Extraire RPE + dernière session depuis `pastWorkoutExercises`, calculer `Suggestion` par exercice, passer `suggestionByExercise` |
| `seance/[id]/live/workout-live.tsx` | Accepter prop `suggestionByExercise`, afficher la bannière conditionnellement dans la carte active |

### Calcul dans `page.tsx`

La requête `pastWorkoutExercises` (déjà présente depuis Bloc 1) inclut `setLogs`. On étend son traitement :

```ts
const suggestionByExercise: Record<string, Suggestion> = {}

for (const we of workout.exercises) {
  const lastWe = pastWorkoutExercises.find(p => p.exerciseId === we.exerciseId)
  if (!lastWe) continue

  const workingLogs = lastWe.setLogs.filter(l => l.setType !== "WARMUP")
  if (workingLogs.length === 0) continue

  const lastReps = workingLogs[workingLogs.length - 1].reps
  const lastWeight = workingLogs[workingLogs.length - 1].weight ?? 0
  const lastRpe = workingLogs[workingLogs.length - 1].rpe ?? null

  const repsMin = we.reps - 2
  const repsMax = we.reps + 2

  let suggestedReps = lastReps
  let suggestedWeight = lastWeight
  let direction: Suggestion["direction"] = "none"

  if (lastRpe === 1) {
    direction = "up"
    if (lastReps < repsMax) {
      suggestedReps = lastReps + 1
    } else {
      suggestedWeight = lastWeight + 2.5
      suggestedReps = repsMin
    }
  } else if (lastRpe === 2) {
    direction = "hold"
  } else if (lastRpe === 3) {
    direction = "down"
    if (lastReps > repsMin) {
      suggestedReps = lastReps - 1
    } else {
      suggestedWeight = Math.max(0, lastWeight - 2.5)
      suggestedReps = repsMax
    }
  }

  suggestionByExercise[we.id] = { lastWeight, lastReps, lastRpe, suggestedWeight, suggestedReps, direction }
}
```

---

## Contraintes

- Bannière absente si aucun historique ou tous les setLogs sont WARMUP
- Les inputs restent inchangés — la bannière est lecture seule
- Incrément fixe : 2.5 kg (non configurable pour l'instant)
- RPE utilisé : dernier set working de la dernière session (pas une moyenne)
- Respecter le style SpartOps : `rounded-xl`, Tailwind v4, couleurs `#10b981` / `#3F5EFB` / `#f59e0b`
