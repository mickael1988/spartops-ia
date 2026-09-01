# Design — Programmes multi-jours

**Date :** 2026-09-01
**Statut :** Approuvé

---

## Résumé

Permettre à l'utilisateur de regrouper plusieurs séances-templates existantes (celles de `/musculation/mes-seances`) dans un **programme multi-jours** ordonné (ex : "Push Pull Legs" = Jour 1 Push, Jour 2 Pull, Jour 3 Legs), qu'il enchaîne en boucle. Un seul programme peut être actif à la fois ; l'application retient automatiquement le prochain jour à faire et propose de le démarrer.

Ne réinvente pas les séances-templates existantes (`Workout.isTemplate`) : le programme les référence uniquement, sans duplication.

---

## 1. Base de données

Deux nouveaux modèles dans `prisma/schema.prisma`, plus une relation inverse ajoutée à `Workout` :

```prisma
model Program {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  isActive        Boolean  @default(false)
  currentDayIndex Int      @default(0)
  createdAt       DateTime @default(now())

  days ProgramDay[]
}

model ProgramDay {
  id        String   @id @default(cuid())
  programId String
  program   Program  @relation(fields: [programId], references: [id], onDelete: Cascade)
  order     Int
  workoutId String
  workout   Workout  @relation(fields: [workoutId], references: [id], onDelete: Restrict)
}
```

Ajout à `model Workout` (relation inverse requise par Prisma) :

```prisma
  programDays ProgramDay[]
```

Ajout à `model User` :

```prisma
  programs Program[]
```

**Règles :**
- `currentDayIndex` est l'index (0-based) du **prochain** jour à démarrer. Il avance et boucle (`% days.length`) après chaque démarrage de jour depuis le programme actif.
- Un seul programme actif par user : géré au niveau applicatif (`activateProgram` désactive les autres dans une transaction), pas de contrainte DB unique — volume trop faible pour le justifier.
- `onDelete: Restrict` sur `ProgramDay.workout` : empêche de supprimer une séance-template tant qu'elle appartient à un programme.

Migration : `pnpm db:push`.

---

## 2. Server Actions

Nouveau fichier `src/app/(app)/musculation/programmes/actions.ts` :

```ts
createProgram(data: { name: string; workoutIds: string[] }): Promise<void>
activateProgram(programId: string): Promise<void>
startProgramDay(programId: string): Promise<void>
deleteProgram(programId: string): Promise<void>
```

### `createProgram`
1. Session requise (`auth.api.getSession`), sinon throw `"Non authentifié"`.
2. `name` non vide, max 100 caractères (cohérent avec `createWorkout`).
3. `workoutIds.length >= 1`, sinon throw `"Ajoutez au moins un jour au programme"`.
4. Vérifie que chaque `workoutId` appartient au user ET a `isTemplate: true` (`prisma.workout.findMany`), sinon throw `"Une ou plusieurs séances sont invalides"`.
5. Crée `Program` + `ProgramDay[]` (order = index dans le tableau + 1) dans une seule requête imbriquée, `isActive: false`.
6. `redirect(\`/musculation/programmes/${program.id}\`)`.

### `activateProgram`
1. Session requise, vérifie que le programme appartient au user (`findFirst`), sinon throw `"Programme introuvable"`.
2. Transaction : `updateMany({ where: { userId, isActive: true } }, { isActive: false })` puis `update(programId, { isActive: true })`. Ne touche pas à `currentDayIndex` (reprend où il en était si déjà activé avant).

### `startProgramDay`
1. Session requise. Charge le programme actif du user avec ses jours triés (`findFirst({ where: { id: programId, userId, isActive: true }, include: { days: { orderBy: { order: "asc" }, include: { workout: { include: { exercises: true } } } } } })`), sinon throw `"Programme introuvable ou inactif"`.
2. Si `days.length === 0`, throw `"Ce programme n'a aucun jour"` (garde-fou, normalement impossible vu la validation à la création).
3. `dayIndex = program.currentDayIndex % program.days.length` ; récupère `template = program.days[dayIndex].workout`.
4. Clone le template en séance réelle — même logique que `startFromTemplate` dans `seance/actions.ts` (`isTemplate: false`, `status: "EN_COURS"`, `startedAt: now()`, copie des `WorkoutExercise`).
5. Met à jour `program.currentDayIndex = (dayIndex + 1) % program.days.length`.
6. `redirect(\`/musculation/seance/${workoutId}/live\`)`.

### `deleteProgram`
1. Session requise, vérifie propriété.
2. `prisma.program.delete({ where: { id } })` — cascade sur `ProgramDay`, les séances-templates elles-mêmes ne sont pas touchées.

---

## 3. Pages

### `/musculation/programmes` — liste
Server Component. Liste des `Program` du user (`orderBy: createdAt desc`), avec pour chacun : nom, nombre de jours, badge "Actif" si `isActive`. Bouton "Nouveau programme" en haut. État vide : message + CTA vers la création (nécessite d'avoir au moins une séance-template — sinon rediriger le CTA vers `/musculation/seance/nouvelle`).

### `/musculation/programmes/nouveau` — création
Formulaire client (`"use client"`, pattern proche de `workout-form.tsx`) :
- Champ nom du programme.
- Liste des séances-templates du user (fetchées côté serveur, passées en props) à cocher/ordonner — réutiliser un pattern simple : liste de checkboxes + boutons monter/descendre sur les éléments sélectionnés (pas de drag-and-drop, YAGNI).
- Si aucune séance-template disponible : message invitant à en créer une d'abord, formulaire désactivé.
- Soumission → `createProgram`.

### `/musculation/programmes/[id]` — détail
Server Component. Affiche :
- Nom du programme, liste des jours dans l'ordre (nom de la séance + nombre d'exercices, réutilise le même calcul de `muscleGroups` que `mes-seances/page.tsx`).
- Jour courant (`currentDayIndex % days.length`) visuellement surligné.
- Bouton "Activer ce programme" si `!isActive` ; si déjà actif, badge "Programme actif" à la place.
- Bouton "Démarrer le jour X" (composant client, pattern `StartButton`) — visible uniquement si `isActive`. Appelle `startProgramDay`.
- Bouton "Supprimer" avec confirmation.

### `/musculation` (accueil) — bannière programme actif
Dans `page.tsx`, après la bannière "séance en cours" existante et **mutuellement exclusive** avec elle (le programme actif ne s'affiche que si `!inProgressWorkout`) :
- Requête : programme actif du user avec ses jours.
- Si trouvé : bannière "Programme actif : Jour {dayIndex+1} — {nom de la séance du jour}" avec bouton "Démarrer" → appelle `startProgramDay` (composant client dédié, même style que la bannière existante).

---

## 4. Navigation

Ajout d'une entrée dans `src/components/layout/sidebar.tsx`, juste après "Mes séances" :

```ts
{ label: "Programmes", href: "/musculation/programmes", icon: CalendarRange }
```

(icône `lucide-react` à choisir, ex. `CalendarRange` ou `ListOrdered` — cohérence avec les autres icônes de la sidebar à vérifier à l'implémentation.)

---

## 5. Gestion des erreurs

- `createProgram` sans jour sélectionné → message inline dans le formulaire, pas de soumission serveur si évitable côté client (mais la action revalide quand même côté serveur).
- Aucun flux de suppression de séance-template n'existe actuellement dans le code (vérifié : pas de `deleteWorkout`). La contrainte `onDelete: Restrict` sur `ProgramDay.workout` protège l'intégrité si un tel flux est ajouté plus tard, mais aucune gestion d'erreur spécifique n'est nécessaire dans ce scope.
- Toutes les actions filtrent systématiquement par `userId` — pas d'accès cross-user, cohérent avec le reste du code.
- `startProgramDay` appelé sur un programme non actif → throw explicite plutôt qu'un comportement silencieux.

---

## 6. Tests

Aucune suite de tests automatisés n'existe dans le repo à ce jour (pas de `__tests__`, pas de config Jest/Vitest). Validation manuelle dans le navigateur, comme pour les fonctionnalités précédentes :
1. Créer 2-3 séances-templates si besoin.
2. Créer un programme avec ces séances dans un ordre donné.
3. L'activer, vérifier la bannière sur `/musculation`.
4. Démarrer le jour 1, terminer la séance, vérifier que le programme propose le jour 2.
5. Boucler jusqu'au dernier jour et vérifier le retour au jour 1.
6. Vérifier qu'activer un second programme désactive le premier.

---

## 7. Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `prisma/schema.prisma` | Modifier — ajout `Program`, `ProgramDay`, relations inverses sur `Workout` et `User` |
| `src/app/(app)/musculation/programmes/actions.ts` | Créer — `createProgram`, `activateProgram`, `startProgramDay`, `deleteProgram` |
| `src/app/(app)/musculation/programmes/page.tsx` | Créer — liste des programmes |
| `src/app/(app)/musculation/programmes/nouveau/page.tsx` | Créer — page de création (server, fetch des séances-templates) |
| `src/app/(app)/musculation/programmes/nouveau/program-form.tsx` | Créer — formulaire client |
| `src/app/(app)/musculation/programmes/[id]/page.tsx` | Créer — détail du programme |
| `src/app/(app)/musculation/programmes/[id]/day-actions.tsx` | Créer — boutons client "Activer" / "Démarrer le jour X" / "Supprimer" |
| `src/app/(app)/musculation/page.tsx` | Modifier — bannière programme actif (mutuellement exclusive avec la bannière séance en cours) |
| `src/app/(app)/musculation/active-program-banner.tsx` | Créer — composant client de la bannière programme actif |
| `src/components/layout/sidebar.tsx` | Modifier — ajout entrée nav "Programmes" |
