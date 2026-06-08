# Bloc 2 — Journalisation enrichie (Rich Logging)

**Date :** 2026-05-21
**Stack :** Next.js 16 App Router · TypeScript · Tailwind CSS v4 · Prisma 7 · React

---

## Objectif

Ajouter des métadonnées par série et par exercice pour rivaliser avec Hevy et Strong : type de série, ressenti (RPE emoji), et note libre par exercice. Nécessite une migration de schéma Prisma (ajout de champs avec valeurs par défaut — aucune donnée perdue).

---

## Décisions de design

- **4 types de séries** : Normal / Échauffement / Drop set / À l'échec
- **RPE simplifié** : 3 emojis (😌 Facile / 😤 Moyen / 🔥 Difficile), nullable
- **Note par exercice** (pas par série) : une note libre par `WorkoutExercise`
- **Layout B** : type en 4ème colonne inline, RPE en micro-prompt post-validation, note sous les dots
- **Séries d'échauffement exclues du volume** partout (fin de séance + historique)

---

## Schéma Prisma

### Nouvel enum

```prisma
enum SetType {
  NORMAL
  WARMUP
  DROP_SET
  FAILURE
}
```

### Modifications `SetLog`

```prisma
model SetLog {
  id                String          @id @default(cuid())
  workoutExerciseId String
  workoutExercise   WorkoutExercise @relation(fields: [workoutExerciseId], references: [id], onDelete: Cascade)
  setNumber         Int
  reps              Int
  weight            Float?
  completedAt       DateTime        @default(now())
  setType           SetType         @default(NORMAL)   // nouveau
  rpe               Int?                               // nouveau — 1=😌 2=😤 3=🔥
}
```

### Modifications `WorkoutExercise`

```prisma
model WorkoutExercise {
  // champs existants...
  note              String?                            // nouveau — note libre par exercice
}
```

Migration : `pnpm db:push` — les `SetLog` existants héritent de `setType = NORMAL`, `rpe = null`. Les `WorkoutExercise` existants héritent de `note = null`.

---

## Feature 1 — Type de série (inline 4ème colonne)

### Comportement

Dans la carte d'exercice active, la grille inputs passe de 3 à 4 colonnes. La 4ème colonne affiche le type de la série courante en pill compacte :

| Type | Libellé court | Couleur |
|------|--------------|---------|
| NORMAL | NOR | Bleu `#3F5EFB` |
| WARMUP | ECH | Ambre `#f59e0b` |
| DROP_SET | DROP | Violet `#8b5cf6` |
| FAILURE | FAIL | Rouge `#ef4444` |

Un tap sur la pill cycle vers le type suivant : `NORMAL → WARMUP → DROP_SET → FAILURE → NORMAL`.

### State

`typeMap: Record<string, SetType>` dans `WorkoutLive`, indexé par `workoutExerciseId`, initialisé à `NORMAL` pour chaque exercice. Réinitialisé à `NORMAL` après validation de chaque série.

### Transmission

`completeSet` reçoit `setType: SetType` en paramètre supplémentaire.

---

## Feature 2 — RPE emoji (micro-prompt post-validation)

### Comportement

Après le tap sur "✓ Valider la série", avant d'incrémenter le compteur de série :

1. Une bannière compacte apparaît sous le bouton valider :
   ```
   Ressenti série N ?   😌   😤   🔥   [Passer]
   ```
   Style : `bg-muted/50 border border-border rounded-xl px-4 py-2`

2. Un tap sur un emoji enregistre le RPE (1, 2 ou 3) et valide la série.
3. "Passer" valide la série sans RPE (`rpe = null`).
4. La bannière disparaît automatiquement après sélection.

### State

`pendingRpe: { workoutExerciseId: string; setNumber: number } | null` dans `WorkoutLive`. Mis à jour par `completeSet` avant d'incrémenter le compteur de série.

### Transmission

`completeSet` reçoit `rpe: number | null` en paramètre supplémentaire.

---

## Feature 3 — Note par exercice

### Comportement

Sous les dots de progression de chaque exercice actif, au-dessus du toggle historique, un champ texte :

```
[ Note sur cet exercice… (optionnel)              ]
```

Style : `bg-background border border-border rounded-xl px-3 py-2 text-sm text-muted-foreground w-full`

- Sauvegardé via `saveExerciseNote` au `onBlur` (perte de focus), pas à chaque frappe
- Pré-rempli avec la note existante si la séance reprend

### State

`noteMap: Record<string, string>` dans `WorkoutLive`, indexé par `workoutExerciseId`.

---

## Architecture — Actions serveur

**Fichier :** `src/app/(app)/musculation/seance/[id]/actions.ts`

### `completeSet` — signature enrichie

```ts
export async function completeSet(
  workoutExerciseId: string,
  setNumber: number,
  reps: number,
  weight: number | null,
  setType: "NORMAL" | "WARMUP" | "DROP_SET" | "FAILURE",
  rpe: number | null
): Promise<void>
```

Crée le `SetLog` avec `setType` et `rpe`.

### `saveExerciseNote` — nouvelle action

```ts
export async function saveExerciseNote(
  workoutExerciseId: string,
  note: string
): Promise<void>
```

Met à jour `WorkoutExercise.note`. Protégée par vérification de session + ownership.

---

## Volume — Exclusion des échauffements

### Fin de séance (`workout-live.tsx`)

```ts
const totalVolume = workout.exercises.reduce((acc, we) => {
  if ((typeMap[we.id] ?? "NORMAL") === "WARMUP") return acc
  return acc + (weightMap[we.id] ?? 0) * (repsMap[we.id] ?? we.reps) * (completedSetsMap[we.id] ?? 0)
}, 0)
```

### Page historique (`historique/page.tsx`)

```ts
const volume = setLogs
  .filter(log => log.setType !== "WARMUP")
  .reduce((acc, log) => acc + (log.weight ?? 0) * log.reps, 0)
```

---

## Architecture — Fichiers à modifier

| Fichier | Action | Raison |
|---------|--------|--------|
| `prisma/schema.prisma` | Modifier | Enum `SetType` + champs `setType`, `rpe`, `note` |
| `seance/[id]/actions.ts` | Modifier | `completeSet` enrichi + `saveExerciseNote` |
| `seance/[id]/live/workout-live.tsx` | Modifier | Type pill · RPE micro-prompt · Note textarea · Volume filtré |
| `musculation/historique/page.tsx` | Modifier | Filtre WARMUP dans calcul volume |

---

## Contraintes

- Aucune donnée existante perdue (valeurs par défaut sur tous les nouveaux champs)
- Pas de fetch client supplémentaire : `saveExerciseNote` appelée au blur uniquement
- Le type de série est réinitialisé à NORMAL après chaque validation de série
- Les séries WARMUP n'apparaissent pas dans le volume total nulle part
- Respecter le style SpartOps : `#3F5EFB` / `#F50535`, `rounded-2xl`, Tailwind v4
