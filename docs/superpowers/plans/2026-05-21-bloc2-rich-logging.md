# Bloc 2 — Rich Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le type de série (NORMAL/WARMUP/DROP_SET/FAILURE), le ressenti RPE emoji (😌😤🔥) et une note par exercice dans le live workout, en excluant les séries d'échauffement du volume total.

**Architecture:** Migration Prisma (`SetType` enum + champs `setType`/`rpe` sur `SetLog`, `note` sur `WorkoutExercise`) → extension de `completeSet` + nouvelle action `saveExerciseNote` → UI dans `workout-live.tsx` (type pill 4ᵉ colonne, RPE micro-prompt post-validation, textarea note) → filtre WARMUP dans historique.

**Tech Stack:** Next.js 16 App Router · TypeScript · Prisma 7 · Tailwind CSS v4 · `pnpm`

---

## Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `prisma/schema.prisma` | Enum `SetType` + champs `setType`, `rpe`, `note` |
| `src/app/(app)/musculation/seance/actions.ts` | `completeSet` enrichi + `saveExerciseNote` |
| `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx` | Type pill · RPE prompt · Note textarea · Volume filtré |
| `src/app/(app)/musculation/historique/page.tsx` | Filtre WARMUP dans volume |

---

## Task 1 — Migration Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1 : Ajouter l'enum `SetType` dans `prisma/schema.prisma`**

Ajouter après la ligne `enum WorkoutStatus { ... }` (ligne ~104) :

```prisma
enum SetType {
  NORMAL
  WARMUP
  DROP_SET
  FAILURE
}
```

- [ ] **Step 2 : Ajouter `note` sur `WorkoutExercise`**

Ajouter la ligne `note` dans `model WorkoutExercise`, juste avant `setLogs SetLog[]` :

```prisma
model WorkoutExercise {
  id            String   @id @default(cuid())
  workoutId     String
  workout       Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exerciseId    String
  exercise      Exercise @relation(fields: [exerciseId], references: [id])
  order         Int
  sets          Int
  reps          Int
  weight        Float?
  restSeconds   Int      @default(60)
  completedSets Int      @default(0)
  note          String?

  setLogs SetLog[]
}
```

- [ ] **Step 3 : Ajouter `setType` et `rpe` sur `SetLog`**

```prisma
model SetLog {
  id                String          @id @default(cuid())
  workoutExerciseId String
  workoutExercise   WorkoutExercise @relation(fields: [workoutExerciseId], references: [id], onDelete: Cascade)
  setNumber         Int
  reps              Int
  weight            Float?
  completedAt       DateTime        @default(now())
  setType           SetType         @default(NORMAL)
  rpe               Int?
}
```

- [ ] **Step 4 : Appliquer la migration et régénérer le client Prisma**

```bash
pnpm db:push && pnpm db:generate
```

Résultat attendu : aucune erreur, base de données mise à jour avec les nouveaux champs.

- [ ] **Step 5 : Vérifier que TypeScript est satisfait**

```bash
pnpm tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 6 : Commiter**

```bash
git add prisma/schema.prisma src/generated/prisma
git commit -m "feat: add SetType enum, setType/rpe on SetLog, note on WorkoutExercise"
```

---

## Task 2 — Actions serveur

**Files:**
- Modify: `src/app/(app)/musculation/seance/actions.ts`

**Contexte :** La fonction `completeSet` actuelle (ligne 94) prend `(workoutExerciseId, reps, weight)`. Elle crée un `SetLog` sans `setType` ni `rpe`. La nouvelle signature ajoute ces deux champs en paramètres optionnels.

- [ ] **Step 1 : Modifier la signature et le corps de `completeSet`**

Remplacer la fonction `completeSet` existante (lignes 94–123) par :

```ts
export async function completeSet(
  workoutExerciseId: string,
  reps: number,
  weight: number | null,
  setType: "NORMAL" | "WARMUP" | "DROP_SET" | "FAILURE" = "NORMAL",
  rpe: number | null = null
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const we = await prisma.workoutExercise.findFirst({
    where: { id: workoutExerciseId, workout: { userId: session.user.id } },
    select: { completedSets: true, sets: true },
  })
  if (!we) throw new Error("Exercice introuvable")
  if (we.completedSets >= we.sets) return

  await prisma.$transaction([
    prisma.workoutExercise.update({
      where: { id: workoutExerciseId },
      data: { completedSets: { increment: 1 } },
    }),
    prisma.setLog.create({
      data: {
        workoutExerciseId,
        setNumber: we.completedSets + 1,
        reps,
        weight,
        setType,
        rpe,
      },
    }),
  ])
}
```

- [ ] **Step 2 : Ajouter l'action `saveExerciseNote` à la fin du fichier**

```ts
export async function saveExerciseNote(
  workoutExerciseId: string,
  note: string
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Non authentifié")

  const we = await prisma.workoutExercise.findFirst({
    where: { id: workoutExerciseId, workout: { userId: session.user.id } },
    select: { id: true },
  })
  if (!we) throw new Error("Exercice introuvable")

  await prisma.workoutExercise.update({
    where: { id: workoutExerciseId },
    data: { note: note.trim() || null },
  })
}
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 4 : Commiter**

```bash
git add src/app/\(app\)/musculation/seance/actions.ts
git commit -m "feat: enrich completeSet with setType/rpe, add saveExerciseNote action"
```

---

## Task 3 — UI live workout

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

**Contexte :** Le fichier fait ~654 lignes. L'import des actions est à la ligne 5 (`completeSet`, `finishWorkout`, `startWorkout`). La section interactive de l'exercice actif commence à la ligne ~504 avec la grille 3 colonnes (Séries/Reps/Poids). Le calcul de `totalVolume` est aux lignes 375–382. Le composant `WorkoutLive` exporte la fonction principale.

**Objectif :** Ajouter 4 éléments :
1. Un type `SetType` local + constantes de style
2. Trois nouveaux états : `typeMap`, `warmupSetsMap`, `noteMap`
3. Un état `pendingRpe` + fonction `handleConfirmSet` (remplace le flux de validation direct)
4. Nouveaux éléments UI dans la carte active : type pill (4ᵉ colonne), RPE micro-prompt, note textarea

### 3a — Types, constantes et imports

- [ ] **Step 1 : Ajouter l'import de `saveExerciseNote`**

À la ligne 5, modifier l'import des actions :

```ts
import { startWorkout, completeSet, finishWorkout, saveExerciseNote } from "../../actions"
```

- [ ] **Step 2 : Ajouter le type `SetType` et les constantes de style après les imports (avant `type ExerciseWithRelations`)**

```ts
type SetType = "NORMAL" | "WARMUP" | "DROP_SET" | "FAILURE"

const SET_TYPE_ORDER: SetType[] = ["NORMAL", "WARMUP", "DROP_SET", "FAILURE"]

const SET_TYPE_LABELS: Record<SetType, string> = {
  NORMAL: "NOR",
  WARMUP: "ECH",
  DROP_SET: "DROP",
  FAILURE: "FAIL",
}

const SET_TYPE_COLORS: Record<SetType, string> = {
  NORMAL: "bg-primary/20 border-primary/40 text-primary",
  WARMUP: "bg-amber-500/20 border-amber-500/40 text-amber-500",
  DROP_SET: "bg-purple-500/20 border-purple-500/40 text-purple-400",
  FAILURE: "bg-red-500/20 border-red-500/40 text-red-400",
}
```

### 3b — Nouveaux états dans `WorkoutLive`

- [ ] **Step 3 : Ajouter les états `typeMap`, `warmupSetsMap`, `noteMap` et `pendingRpe`**

Dans la fonction `WorkoutLive`, après la déclaration de `repsMap` (autour de la ligne 240), ajouter :

```ts
const [typeMap, setTypeMap] = useState<Record<string, SetType>>(
  Object.fromEntries(workout.exercises.map((we) => [we.id, "NORMAL" as SetType]))
)
const [warmupSetsMap, setWarmupSetsMap] = useState<Record<string, number>>(
  Object.fromEntries(workout.exercises.map((we) => [we.id, 0]))
)
const [noteMap, setNoteMap] = useState<Record<string, string>>(
  Object.fromEntries(workout.exercises.map((we) => [we.id, we.note ?? ""]))
)
const [pendingRpe, setPendingRpe] = useState<{
  we: ExerciseWithRelations
  reps: number
  weight: number | null
  setType: SetType
} | null>(null)
```

### 3c — Modifier `handleCompleteSet` et ajouter `handleConfirmSet`

- [ ] **Step 4 : Remplacer `handleCompleteSet` (lignes ~355–370)**

La nouvelle version ne fait plus l'appel serveur directement — elle capture les valeurs et affiche le micro-prompt RPE :

```ts
async function handleCompleteSet(we: ExerciseWithRelations) {
  if (validatingId || pendingRpe) return
  const done = completedSetsMap[we.id] ?? 0
  const totalSets = setsMap[we.id] ?? we.sets
  if (done >= totalSets) return

  const reps = repsMap[we.id] ?? we.reps
  const weight = weightMap[we.id] ?? null
  const setType = typeMap[we.id] ?? "NORMAL"

  setPendingRpe({ we, reps, weight, setType })
}
```

- [ ] **Step 5 : Ajouter `handleConfirmSet` juste après `handleCompleteSet`**

```ts
async function handleConfirmSet(rpe: number | null) {
  if (!pendingRpe || validatingId) return
  const { we, reps, weight, setType } = pendingRpe
  const done = completedSetsMap[we.id] ?? 0

  setPendingRpe(null)
  setValidatingId(we.id)
  try {
    await completeSet(we.id, reps, weight, setType, rpe)
    setCompletedSetsMap((prev) => ({ ...prev, [we.id]: done + 1 }))
    if (setType === "WARMUP") {
      setWarmupSetsMap((prev) => ({ ...prev, [we.id]: (prev[we.id] ?? 0) + 1 }))
    }
    setTypeMap((prev) => ({ ...prev, [we.id]: "NORMAL" }))
    startRest(we.restSeconds, we.id)
  } finally {
    setValidatingId(null)
  }
}
```

### 3d — Mettre à jour `totalVolume` pour exclure WARMUP

- [ ] **Step 6 : Remplacer le calcul de `totalVolume` (lignes ~375–382)**

```ts
const totalVolume = Math.round(
  workout.exercises.reduce((acc, we) => {
    const weight = weightMap[we.id] ?? 0
    const reps = repsMap[we.id] ?? we.reps
    const total = completedSetsMap[we.id] ?? 0
    const warmup = warmupSetsMap[we.id] ?? 0
    return acc + weight * reps * (total - warmup)
  }, 0)
)
```

### 3e — Grille 4 colonnes avec type pill

- [ ] **Step 7 : Remplacer la grille 3 colonnes de l'exercice actif (ligne ~513) par une grille 4 colonnes**

Localiser le bloc qui commence par `<div className="grid grid-cols-3 gap-3">` dans la section `{isActive && ... done < totalSets && ...}` et le remplacer par :

```tsx
<div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
  <div className="space-y-1">
    <label className="text-xs text-muted-foreground">Séries</label>
    <input
      type="number"
      min={done + 1}
      max={20}
      value={setsMap[we.id] ?? we.sets}
      onChange={(e) =>
        setSetsMap((prev) => ({ ...prev, [we.id]: Math.max(done + 1, parseInt(e.target.value) || done + 1) }))
      }
      className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold"
    />
  </div>
  <div className="space-y-1">
    <label className="text-xs text-muted-foreground">Répétitions</label>
    <input
      type="number"
      min={1}
      max={200}
      value={repsMap[we.id] ?? we.reps}
      onChange={(e) =>
        setRepsMap((prev) => ({ ...prev, [we.id]: Math.max(1, parseInt(e.target.value) || 1) }))
      }
      className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold"
    />
  </div>
  <div className="space-y-1">
    <label className="text-xs text-muted-foreground">Poids (kg)</label>
    <input
      type="number"
      min={0}
      step={0.5}
      value={weightMap[we.id] ?? ""}
      placeholder="—"
      onChange={(e) =>
        setWeightMap((prev) => ({
          ...prev,
          [we.id]: e.target.value === "" ? null : parseFloat(e.target.value),
        }))
      }
      className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold"
    />
  </div>
  <div className="space-y-1">
    <label className="text-xs text-muted-foreground opacity-0">Type</label>
    <button
      onClick={() =>
        setTypeMap((prev) => {
          const current = prev[we.id] ?? "NORMAL"
          const nextIdx = (SET_TYPE_ORDER.indexOf(current) + 1) % SET_TYPE_ORDER.length
          return { ...prev, [we.id]: SET_TYPE_ORDER[nextIdx] }
        })
      }
      className={`rounded-xl border px-2 py-2 text-[10px] font-bold transition-colors leading-tight ${SET_TYPE_COLORS[typeMap[we.id] ?? "NORMAL"]}`}
    >
      {SET_TYPE_LABELS[typeMap[we.id] ?? "NORMAL"]}
    </button>
  </div>
</div>
```

### 3f — Bouton valider + RPE micro-prompt

- [ ] **Step 8 : Remplacer le bouton "Valider la série" par un bloc conditionnel**

Localiser le `<button onClick={() => handleCompleteSet(we)} ...>` (ligne ~558) et remplacer ce bouton seul par :

```tsx
{pendingRpe?.we.id === we.id ? (
  <div className="flex items-center justify-between bg-muted/50 border border-border rounded-xl px-4 py-2.5">
    <span className="text-xs font-medium text-muted-foreground">
      Ressenti série {(completedSetsMap[we.id] ?? 0) + 1} ?
    </span>
    <div className="flex items-center gap-3">
      {([{ emoji: "😌", value: 1 }, { emoji: "😤", value: 2 }, { emoji: "🔥", value: 3 }] as const).map(
        ({ emoji, value }) => (
          <button
            key={value}
            onClick={() => handleConfirmSet(value)}
            disabled={validatingId === we.id}
            className="text-xl active:scale-125 transition-transform disabled:opacity-40"
          >
            {emoji}
          </button>
        )
      )}
      <button
        onClick={() => handleConfirmSet(null)}
        disabled={validatingId === we.id}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1 disabled:opacity-40"
      >
        Passer
      </button>
    </div>
  </div>
) : (
  <button
    onClick={() => handleCompleteSet(we)}
    disabled={!!validatingId || !!pendingRpe}
    className="w-full rounded-2xl py-4 text-lg font-bold text-white disabled:opacity-60"
    style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
  >
    {validatingId === we.id ? "Enregistrement…" : "✓ Valider la série"}
  </button>
)}
```

### 3g — Note textarea

- [ ] **Step 9 : Ajouter le textarea de note après les dots et avant la bannière PR**

Localiser la section `{/* Dots séries */}` (ligne ~573). Juste après le bloc des dots (`</div>` fermant), ajouter :

```tsx
{/* Note exercice */}
<textarea
  value={noteMap[we.id] ?? ""}
  onChange={(e) => setNoteMap((prev) => ({ ...prev, [we.id]: e.target.value }))}
  onBlur={async () => {
    await saveExerciseNote(we.id, noteMap[we.id] ?? "")
  }}
  placeholder="Note sur cet exercice… (optionnel)"
  rows={1}
  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
/>
```

- [ ] **Step 10 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 11 : Commiter**

```bash
git add src/app/\(app\)/musculation/seance/\[id\]/live/workout-live.tsx
git commit -m "feat: add type pill, RPE micro-prompt and note textarea in live workout"
```

---

## Task 4 — Volume filtré dans l'historique

**Files:**
- Modify: `src/app/(app)/musculation/historique/page.tsx`

**Contexte :** La page historique (ligne ~58–63) calcule le volume total en sommant tous les `SetLog`. Après la migration, `SetLog` a un champ `setType` — on filtre pour exclure `WARMUP`.

- [ ] **Step 1 : Remplacer le calcul de `volume` (lignes ~58–63)**

```ts
const volume = Math.round(
  workout.exercises.reduce(
    (acc, we) =>
      acc +
      we.setLogs
        .filter((log) => log.setType !== "WARMUP")
        .reduce((s, log) => s + (log.weight ?? 0) * log.reps, 0),
    0
  )
)
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commiter**

```bash
git add src/app/\(app\)/musculation/historique/page.tsx
git commit -m "feat: exclude WARMUP sets from volume in workout history"
```

---

## Vérification finale

- [ ] Lancer `pnpm dev` et ouvrir une séance live
- [ ] Tapper sur la pill type → vérifier le cycle NOR → ECH → DROP → FAIL → NOR avec les couleurs correspondantes
- [ ] Valider une série → vérifier l'apparition du micro-prompt RPE avec 😌 😤 🔥 + Passer
- [ ] Sélectionner un emoji → vérifier que la série est validée et que le rest timer démarre
- [ ] Saisir une note → sortir du champ → vérifier en base (Prisma Studio : `pnpm db:studio`) que `WorkoutExercise.note` est sauvegardé
- [ ] Valider plusieurs séries WARMUP → vérifier en fin de séance que le volume affiché exclut ces séries
- [ ] Terminer une séance → aller dans l'historique → vérifier que le badge ⚡ exclut les séries WARMUP
