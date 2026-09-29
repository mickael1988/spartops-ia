# Cardio — Catalogue & données (étape 1/4)

**Date :** 2026-09-29
**Statut :** Approuvé

---

## Contexte

Le module cardio n'existe pas encore côté données ni UI (le lien "Cardio" de la sidebar pointe vers `/cardio`, qui 404 aujourd'hui). Le schéma Prisma a déjà une ébauche (`CardioProgram`, `CardioStep`, `UserCardioSession`) pensée pour des programmes à intervalles simples, mais elle ne suffit pas pour ce qu'on veut construire.

Objectif final du module cardio (réparti en 4 étapes, dont celle-ci est la première) : une bibliothèque de WOD (Workout Of the Day, façon CrossFit) prêts à l'emploi et personnalisables, sur le modèle des apps de référence du secteur (SugarWOD, Beyond the Whiteboard) — sans pour autant construire un classement social entre utilisateurs, qui reste hors périmètre.

**Cette étape (1/4)** couvre uniquement : le modèle de données du catalogue, son peuplement (seed), et les pages de navigation en lecture seule. Les étapes suivantes (non conçues ici) : 2. séance live (minuteur par format), 3. création de WOD perso, 4. historique & records personnels.

**Hors périmètre (explicitement, tout le module)** :
- Classement entre utilisateurs (leaderboard social) — "compétitif" est compris comme "au niveau des apps concurrentes", pas comme une fonctionnalité sociale.
- Réutilisation du catalogue `Exercise` de la muscu — le cardio a son propre catalogue d'exercices, volontairement séparé (choix explicite de l'utilisateur).

---

## 1. Modèle de données

### Nouveau : `CardioExercise`

Catalogue de mouvements cardio, séparé de `Exercise` (muscu) :

```prisma
model CardioExercise {
  id          String     @id @default(cuid())
  name        String
  description String
  image       String?     // emoji, même convention que Exercise.image
  equipment   String?     // null = poids du corps
  difficulty  Difficulty  // réutilise l'enum existant (DEBUTANT/INTERMEDIAIRE/AVANCE)

  steps CardioStep[]
}
```

### Nouveau : `CardioFormat` (enum)

```prisma
enum CardioFormat {
  CIRCUIT   // enchaînement de phases minutées, avec repos
  AMRAP     // le plus de tours possible dans un temps donné
  EMOM      // un exercice au début de chaque minute, pendant N minutes
  FOR_TIME  // chrono libre jusqu'à la fin de la liste d'exercices
}
```

### Modifié : `CardioProgram`

Un WOD, officiel (catalogue) ou créé par un utilisateur :

```prisma
model CardioProgram {
  id          String        @id @default(cuid())
  userId      String?       // null = WOD officiel du catalogue ; sinon créé par un utilisateur (étape 3)
  user        User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String
  format      CardioFormat  // remplace le champ `type: String` actuel (trop vague, jamais utilisé par du code)
  level       CardioLevel   // enum déjà existant (DEBUTANT/INTERMEDIAIRE/AVANCE)
  durationMin Int           // sens selon le format : durée totale (CIRCUIT), temps limite (AMRAP), nb de minutes (EMOM), temps indicatif (FOR_TIME)
  equipment   String?       // null = sans matériel ; sinon liste courte ("Corde à sauter, Kettlebell")
  calories    Int?
  image       String?

  steps    CardioStep[]
  sessions UserCardioSession[]
}
```

Différence assumée avec `Workout.userId` (jamais `null`, chaque séance de muscu appartient à son créateur) : ici `userId` est **nullable**, seul moyen de faire cohabiter un catalogue officiel et des créations personnelles dans la même table. Les requêtes de la page catalogue filtrent explicitement `userId: null` pour n'afficher que les WOD officiels à cette étape (aucune création utilisateur n'existe encore).

### Modifié : `CardioStep`

Une étape d'un WOD, qui référence désormais un `CardioExercise` et porte soit une durée, soit des répétitions selon le format du programme parent :

```prisma
model CardioStep {
  id               String         @id @default(cuid())
  programId        String
  program          CardioProgram  @relation(fields: [programId], references: [id], onDelete: Cascade)
  order            Int
  cardioExerciseId String
  cardioExercise   CardioExercise @relation(fields: [cardioExerciseId], references: [id], onDelete: Restrict)
  durationSec      Int?           // CIRCUIT / EMOM : durée de la phase
  reps             Int?           // AMRAP / FOR_TIME : nombre de répétitions
  intensity        Intensity      // enum déjà existant (FAIBLE/MOYENNE/HAUTE), conservé tel quel sur toutes les étapes
}
```

`durationSec` et `reps` sont tous deux nullables — exactement un des deux est renseigné selon le format du `CardioProgram` parent (validé au niveau du seed/de la création, pas d'une contrainte SQL — même logique que le reste du schéma, qui ne modélise pas ce genre de règle métier en contrainte DB).

### Inchangé à cette étape : `UserCardioSession`

La façon d'enregistrer un score (temps pour FOR_TIME, tours+reps pour AMRAP, etc.) sera conçue à l'étape 2 (séance live), en même temps que l'écran qui produit ce score. Le modèle actuel (`userId`, `programId`, `completedAt`, `durationMin`) reste tel quel pour l'instant et n'est pas utilisé par cette étape.

---

## 2. Contenu (seed)

- **~20-25 `CardioExercise`** : mouvements cardio/fonctionnels classiques (burpees, corde à sauter, mountain climbers, jumping jacks, wall balls, kettlebell swings, box jumps, etc.), mélange avec/sans matériel, difficulté variée.
- **~20-25 `CardioProgram`** (`userId: null`), répartis sur les 4 formats et les 3 niveaux, mélange avec/sans matériel. Contenu original inspiré des formats CrossFit classiques — pas de reprise à l'identique de WOD "de marque" (noms et structures propres à SpartOps, pour éviter toute confusion avec du contenu tiers).
- Ajouté dans `prisma/seed.ts` (même fichier que le seed muscu existant), avec `upsert` (idempotent), même style que le seed muscu.

---

## 3. Pages

### `/cardio` — liste des WOD

- Grille de cartes, même composant visuel que `/musculation` (`Card`/`CardHeader`/`CardContent` de `@/components/ui/card`, bordure "beam" animée au survol via le gradient `BEAM` déjà défini dans `musculation/page.tsx` — à extraire ou dupliquer selon ce qui est le plus simple au moment de l'implémentation).
- Filtres en pills au-dessus de la grille : format (4 valeurs + "Tous"), niveau (3 valeurs + "Tous"), matériel ("Avec" / "Sans" / "Tous") — filtrage côté serveur via les search params de l'URL, pas de state client (cohérent avec le reste de l'app, Server Components uniquement).
- Chaque carte : nom du WOD, badge format, badge niveau coloré (vert/orange/rouge, comme les badges de difficulté muscu), durée/temps limite, pictogramme matériel oui/non.

### `/cardio/[id]` — détail d'un WOD

- Breadcrumb : Cardio → [nom du WOD] (même composant que `/musculation/[slug]`).
- En-tête : nom, format, niveau, durée, matériel, calories estimées si renseignées.
- Déroulé complet des étapes dans l'ordre : icône/emoji de l'exercice, nom, durée ou reps selon le format.
- Bouton "Démarrer" visible mais désactivé (avec info-bulle "Bientôt disponible") — pas de lien mort, le branchement vers l'écran de séance live se fera à l'étape 2.

Pas de page dédiée pour parcourir `CardioExercise` seul à cette étape — ce catalogue ne sert que de brique pour les WOD ; il sera exposé comme sélecteur à l'étape 3 (création de WOD perso).

---

## 4. Choix techniques

- Server Components uniquement pour ces pages (pas de `"use client"`), lecture Prisma directe — même convention que `/musculation` et `/musculation/[slug]`.
- Routing par `id` (cuid) pour `/cardio/[id]`, pas de `slug` — contrairement aux groupes musculaires, les WOD n'ont pas de regroupement naturel en catégories nommées ; un `slug` par WOD individuel n'apporterait rien par rapport à l'id.
- Aucune Server Action nécessaire à cette étape (lecture seule) — `actions.ts` arrivera à l'étape 3 avec la création de WOD.

---

## 5. Vérification

Pas de suite de tests automatisée dans ce projet (convention établie). Vérification par `pnpm build` (type-check) + parcours manuel dans le navigateur : liste `/cardio` (avec chaque combinaison de filtres), détail `/cardio/[id]` pour un WOD de chaque format.
