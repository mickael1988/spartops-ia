# Tableau de progression 1RM — Design Spec

**Date :** 2026-03-17
**Statut :** Approuvé

---

## Objectif

Ajouter un tableau de progression personnelle sur les exercices fondamentaux (squat, développé couché, soulevé de terre), accessible depuis la page musculation. L'utilisateur peut enregistrer son 1RM estimé (via calculateur Epley ou saisie directe) une fois par mois et visualiser sa progression dans le temps.

---

## Comportement

### Accès

- Une nouvelle carte **"Tester mon 1RM"** s'ajoute à côté des cartes "Créer une séance" et "Créer un exercice" sur la page `/musculation`
- Elle redirige vers `/musculation/progression`

### Page de progression `/musculation/progression`

**Bannière de rappel (en haut de page) :**
- Affiche : "Dernier test il y a X jours" (basé sur l'entrée `OneRepMax` la plus récente, tous exercices confondus)
- Si aucun test ou dernier test > 30 jours : bannière mise en avant (orange)
- Bouton **"Planifier dans l'agenda"** → crée un événement `PLANIFIEE` dans `Workout` avec le nom "Test 1RM" et `scheduledAt = maintenant + 28 jours`
- Si un test est déjà planifié dans l'agenda (Workout "Test 1RM" à venir) : le bouton affiche "Déjà planifié" (désactivé)

**3 cartes d'exercice (une par exercice `isFundamental: true`) :**

Chaque carte contient :
1. **Nom de l'exercice** + meilleur 1RM actuel affiché en grand (`— kg` si aucune entrée) — le "meilleur" est le maximum de toutes les entrées `estimatedMax` pour cet exercice et cet utilisateur (pas la plus récente)
2. **Graphique SVG natif en ligne** — affiche au maximum les 6 entrées les plus récentes (par `recordedAt` desc, limit 6), points reliés, axe X = dates, axe Y = kg. Si aucune entrée n'existe pour cet exercice, le graphique affiche un texte "Aucune donnée" et aucune ligne SVG n'est rendue.
3. **Formulaire de saisie** avec deux modes toggleables :
   - **Calculateur (défaut)** : champs `Poids (kg)` + `Répétitions` → 1RM estimé affiché en temps réel sous la formule `1RM = poids × (1 + reps / 30)` (formule d'Epley)
   - **Saisie directe** : un seul champ `1RM (kg)`
4. Bouton **"Enregistrer"** → sauvegarde l'entrée

### Contrainte mensuelle

- On peut enregistrer plusieurs entrées dans le même mois (on conserve toutes les entrées)
- Le graphique affiche toujours la progression chronologique
- Pas de blocage ou de validation forcée — l'utilisateur est libre

---

## Modèle de données

### Modification `Exercise`

```prisma
model Exercise {
  // ... champs existants ...
  isFundamental Boolean @default(false)
}
```

Les 3 exercices fondamentaux sont marqués `isFundamental: true` via un script de seed dédié. Les noms exacts dans la base sont :

| Nom canonique       | Slug groupe |
|---------------------|-------------|
| `"Squat"`           | `jambes`    |
| `"Développé couché"`| `pectoraux` |
| `"Soulevé de terre"`| `dos`       |

### Nouveau modèle `OneRepMax`

```prisma
model OneRepMax {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  exerciseId   String
  exercise     Exercise @relation(fields: [exerciseId], references: [id], onDelete: Restrict)
  estimatedMax Float    // 1RM en kg (calculé ou saisi directement)
  recordedAt   DateTime @default(now())
  inputWeight  Float?   // poids utilisé si mode calculateur
  inputReps    Int?     // reps utilisées si mode calculateur
  isManual     Boolean  @default(false) // true = saisie directe
}
```

Relation ajoutée sur `User` : `oneRepMaxes OneRepMax[]`
Relation ajoutée sur `Exercise` : `oneRepMaxes OneRepMax[]`

### Formule Epley

```ts
estimatedMax = Math.round(inputWeight * (1 + inputReps / 30))
```

Appliquée côté client pour affichage en temps réel, et côté serveur pour persistance.

---

## Architecture

### Fichiers à créer / modifier

| Fichier | Action | Rôle |
|---|---|---|
| `prisma/schema.prisma` | Modifier | Ajouter `isFundamental` sur `Exercise` + modèle `OneRepMax` |
| `prisma/seed-1rm.ts` | Créer | Marquer les 3 exercices fondamentaux `isFundamental: true` |
| `src/app/(app)/musculation/page.tsx` | Modifier | Ajouter carte "Tester mon 1RM" |
| `src/app/(app)/musculation/progression/page.tsx` | Créer | Server component : fetch exercices + historique 1RM |
| `src/app/(app)/musculation/progression/progression-client.tsx` | Créer | Client : bannière + 3 cartes avec graphiques + formulaires |
| `src/app/(app)/musculation/progression/actions.ts` | Créer | Server actions : save1RM, scheduleTest |

### Flux de données

```
page.tsx (server)
  ├── prisma.exercise.findMany({ where: { isFundamental: true } })
  ├── prisma.oneRepMax.findMany({ where: { userId }, orderBy: recordedAt desc, take: 6 par exercice }) — réordonné asc côté client pour le rendu du graphique
  └── prisma.workout.findFirst({ where: { name "Test 1RM", status PLANIFIEE, scheduledAt gte now } })
      → ProgressionClient (props: exercises, history, hasScheduled)
          ├── Bannière rappel + bouton Planifier
          └── 3 × ExerciseProgressionCard
                ├── SVG chart (historique)
                └── Formulaire (calculateur / direct)
```

### Server actions

**`save1RM(exerciseId, estimatedMax, inputWeight?, inputReps?, isManual)`**
- Vérifie session
- Valide : `estimatedMax > 0`, `estimatedMax ≤ 500`
- En mode calculateur : `inputWeight > 0`, `inputReps >= 1`, `inputReps <= 30` (au-delà, Epley est peu fiable)
- `recordedAt` est toujours la date de soumission (`@default(now())`) — la saisie rétroactive est hors scope
- Insère `OneRepMax`
- `revalidatePath("/musculation/progression")`

**`scheduleTest()`**
- Vérifie session (`userId = session.user.id`)
- Vérifie qu'aucun workout `{ userId, name: "Test 1RM", status: PLANIFIEE, scheduledAt: { gte: now } }` n'existe déjà pour cet utilisateur
- Crée `Workout { userId, name: "Test 1RM", isTemplate: false, status: PLANIFIEE, scheduledAt: now + 28 jours }` — sans exercices (intentionnel, voir note agenda ci-dessous)
- `revalidatePath("/agenda")` + `revalidatePath("/musculation/progression")`

### Note agenda — Workout "Test 1RM" sans exercices

Le workout créé par `scheduleTest` n'a intentionnellement aucun exercice. Dans le drawer de l'agenda, il s'affiche comme les autres workouts planifiés (nom + date), mais :
- La liste d'exercices affiche "Test de force — 1RM" à la place d'exercices
- Le bouton "Démarrer" navigue vers `/musculation/progression` au lieu de `/musculation/seance/{id}/live`
- Le bouton "Modifier" est absent (pas pertinent pour un événement memo)

---

## Design visuel

- Carte "Tester mon 1RM" sur musculation : icône `TrendingUp`, dégradé violet→orange (`#7C3AED` → `#F97316`)
- Bannière : fond `bg-orange-500/10`, bordure `border-orange-500/30`, texte orange si > 30 jours
- Graphique SVG : line chart fin, points circulaires, couleur orange (`#f97316`), fond transparent, axe Y avec valeurs min/max
- Formulaire : toggle discret "Calculateur / Saisie directe" (deux boutons texte), calcul Epley affiché en temps réel sous les champs

---

## Hors scope

- Pas de sélection d'exercices personnalisée (fixé aux 3 fondamentaux via `isFundamental`)
- Pas de suppression d'entrées 1RM
- Pas de comparaison avec d'autres utilisateurs
- Pas de calcul de pourcentages pour la programmation (ex : 80% du 1RM)
- Pas de notification push ou email
