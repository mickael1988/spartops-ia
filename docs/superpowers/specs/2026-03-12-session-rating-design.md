# Design — Notation d'une séance

**Date :** 2026-03-12
**Statut :** Approuvé

---

## Résumé

Permettre à l'utilisateur de noter une séance de musculation terminée sur 5 étoiles, avec un commentaire libre optionnel (max 500 caractères). La note s'affiche en permanence sur la page récapitulatif et peut être modifiée avec confirmation.

---

## 1. Base de données

Deux champs optionnels ajoutés au modèle `Workout` dans `prisma/schema.prisma` :

```prisma
model Workout {
  // ... champs existants ...
  rating    Int?    // 1 à 5, null si pas noté
  comment   String? // commentaire libre optionnel, max 500 caractères
}
```

Migration : `pnpm db:push`.

---

## 2. Server Action

Nouvelle fonction `rateWorkout` dans `src/app/(app)/musculation/seance/actions.ts` :

```ts
rateWorkout(workoutId: string, rating: number, comment?: string): Promise<void>
```

**Comportement :**

1. Récupère la session via `auth.api.getSession` — si absente, throw `"Non authentifié"`
2. Cherche le workout via `prisma.workout.findFirst({ where: { id: workoutId, userId } })` — si absent ou mauvais propriétaire, throw `"Séance introuvable"`
3. Si `workout.isTemplate === true`, throw `"Les templates ne peuvent pas être notés"`
4. Valide `rating` : si hors de `[1, 5]`, throw `"Note invalide (1–5)"`
5. Tronque `comment` à 500 caractères si nécessaire
6. Met à jour `rating` et `comment` via `prisma.workout.update`

**Important :** `rateWorkout` ne vérifie PAS `status === "TERMINEE"` — elle est volontairement status-agnostique pour pouvoir être appelée depuis la modale avant que `finishWorkout` soit appelé.

**Revalidation :** `rateWorkout` appelle `revalidatePath(\`/musculation/seance/${workoutId}\`)` en interne avant de retourner, pour invalider le cache côté serveur.

---

## 3. Composants UI

### `<StarRating>` — `src/components/ui/star-rating.tsx`

Composant réutilisable `"use client"`. Interface TypeScript :

```ts
type StarRatingProps =
  | { mode: "readonly"; value: number | null }
  | { mode: "interactive"; value: number | null; onChange: (rating: number) => void }
```

- `maxStars` : toujours 5
- Mode `interactive` : hover effect pour prévisualiser la note, clic pour sélectionner
- Mode `readonly` : affichage statique, pas d'événements
- Styles cohérents avec l'app (couleur primaire pour les étoiles remplies)

### `<RatingModal>` — `src/app/(app)/musculation/seance/[id]/live/rating-modal.tsx`

Composant `"use client"`. Affiché dans `workout-live.tsx` lorsque l'utilisateur clique "Terminer la séance" (le workout est encore `EN_COURS` à ce stade).

**Contenu :**
- Titre : "Comment s'est passée la séance ?"
- `<StarRating mode="interactive" />`
- `<textarea>` optionnel "Commentaire…" (max 500 caractères)
- Bouton "Enregistrer"
- Bouton "Passer"

**Timing et ordre des appels :**

La modale s'ouvre **avant** tout appel serveur. `finishWorkout` n'est appelé qu'une fois l'utilisateur ayant fait son choix :

```
Clic "Terminer la séance"
  → setShowRatingModal(true)   // ouvre la modale, PAS d'appel serveur
  → [Enregistrer]
      → await rateWorkout(id, rating, comment)  // peut échouer
      → await finishWorkout(id)                  // toujours appelé, même si rateWorkout échoue
      → router.push(...)
  → [Passer]
      → await finishWorkout(id)
      → router.push(...)
```

**Gestion des erreurs :** si `rateWorkout` échoue, afficher un message d'erreur inline dans la modale (ex : "Erreur lors de l'enregistrement de la note, la séance sera quand même terminée.") et continuer vers `finishWorkout`.

### Modale de modification inline (récapitulatif)

Composant `"use client"` encapsulé dans un wrapper client à créer :
`src/app/(app)/musculation/seance/[id]/rating-edit.tsx`

Nécessaire car `page.tsx` est un Server Component — la logique interactive doit être isolée dans un composant client séparé.

**Contenu :**
- Bouton "Modifier" (ou "Non notée" si `rating === null`)
- Au clic : ouvre une modale de confirmation avec `<StarRating mode="interactive" />` pré-rempli + textarea pré-rempli
- Bouton "Confirmer" → appelle `rateWorkout` (qui appelle `revalidatePath` côté serveur en interne), puis appelle `router.refresh()` côté client pour rafraîchir la page
- Bouton "Annuler" → ferme sans modifier
- Gestion des erreurs : message d'erreur inline si `rateWorkout` échoue

---

## 4. Page récapitulatif

Dans `/musculation/seance/:id` (`page.tsx`), pour les séances `TERMINEE` uniquement :

- Passer `workout.rating`, `workout.comment` et `workout.id` au composant `<RatingEdit>`
- `<RatingEdit>` affiche :
  - `<StarRating mode="readonly" />` + le commentaire en texte secondaire (si non null) + bouton "Modifier" si `rating !== null`
  - Texte "Non notée" cliquable si `rating === null`
- `<StarRating mode="readonly" value={null}` ne doit jamais être rendu — `<RatingEdit>` gère le branchement null avant de passer la valeur au composant.

Les templates (`isTemplate === true`) n'affichent pas ce composant.

---

## 5. Flux utilisateur

```
Fin de séance (allDone = true)
  → Clic "Terminer la séance"
  → RatingModal s'ouvre (workout encore EN_COURS)
    → [Enregistrer] : rateWorkout() → finishWorkout() → redirect /seance/:id
    → [Passer]      : finishWorkout() → redirect /seance/:id
    → (si rateWorkout échoue : message inline → finishWorkout() → redirect)

Page récap (/seance/:id) — séances TERMINEE uniquement
  → Étoiles (readonly) + "Modifier" si déjà noté
  → "Non notée" si rating === null
  → Clic "Modifier"/"Non notée" → modale confirmation
    → [Confirmer] : rateWorkout() → revalidatePath('/musculation/seance/:id')
    → [Annuler]   : ferme la modale
    → (si rateWorkout échoue : message d'erreur inline)
```

---

## 6. Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `prisma/schema.prisma` | Modifier — ajout `rating Int?` et `comment String?` sur `Workout` |
| `src/app/(app)/musculation/seance/actions.ts` | Modifier — ajout `rateWorkout` |
| `src/components/ui/star-rating.tsx` | Créer — composant `"use client"` réutilisable |
| `src/app/(app)/musculation/seance/[id]/live/rating-modal.tsx` | Créer — modale post-séance `"use client"` |
| `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx` | Modifier — intégrer `<RatingModal>` |
| `src/app/(app)/musculation/seance/[id]/rating-edit.tsx` | Créer — composant client pour modifier la note |
| `src/app/(app)/musculation/seance/[id]/page.tsx` | Modifier — intégrer `<RatingEdit>` pour les séances terminées |
