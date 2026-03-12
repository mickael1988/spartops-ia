# Design — Notation d'une séance

**Date :** 2026-03-12
**Statut :** Approuvé

---

## Résumé

Permettre à l'utilisateur de noter une séance de musculation terminée sur 5 étoiles, avec un commentaire libre optionnel. La note s'affiche en permanence sur la page récapitulatif et peut être modifiée avec confirmation.

---

## 1. Base de données

Deux champs optionnels ajoutés au modèle `Workout` dans `prisma/schema.prisma` :

```prisma
model Workout {
  // ... champs existants ...
  rating    Int?    // 1 à 5, null si pas noté
  comment   String? // commentaire libre optionnel
}
```

Migration : `pnpm db:push`.

---

## 2. Server Action

Nouvelle fonction `rateWorkout` dans `src/app/(app)/musculation/seance/actions.ts` :

```ts
rateWorkout(workoutId: string, rating: number, comment?: string): Promise<void>
```

- Vérifie que l'utilisateur authentifié est bien le propriétaire du workout
- Met à jour `rating` et `comment` via Prisma
- Réutilisable depuis la modale post-séance ET depuis le récapitulatif

---

## 3. Composants UI

### `<StarRating>` — `src/components/ui/star-rating.tsx`

Composant réutilisable avec deux modes :
- `interactive` : étoiles cliquables avec hover effect (prévisualisation)
- `readonly` : affichage statique

Styles cohérents avec l'app (couleur primaire pour les étoiles remplies).

### `<RatingModal>` — `src/app/(app)/musculation/seance/[id]/live/rating-modal.tsx`

Modale post-séance affichée automatiquement après clic sur "Terminer la séance" :
- Titre : "Comment s'est passée la séance ?"
- `<StarRating mode="interactive" />`
- Champ texte optionnel : "Commentaire…"
- Bouton "Enregistrer" → appelle `rateWorkout` + `finishWorkout`, puis redirige vers `/musculation/seance/:id`
- Bouton "Passer" → appelle seulement `finishWorkout`, puis redirige

---

## 4. Page récapitulatif

Dans `/musculation/seance/:id` (`page.tsx`), section en-tête pour les séances `TERMINEE` :

- Si `workout.rating` existe : affiche `<StarRating mode="readonly" />` + bouton "Modifier"
- Si `workout.rating` est null : affiche "Non notée" cliquable
- Le bouton "Modifier" ouvre une modale de confirmation inline :
  - Message : "Voulez-vous modifier votre note ?"
  - `<StarRating mode="interactive" />` pré-rempli + champ commentaire pré-rempli
  - Bouton "Confirmer" → appelle `rateWorkout`, revalide la page (`revalidatePath`)

---

## 5. Flux utilisateur

```
Fin de séance (allDone = true)
  → Clic "Terminer la séance"
  → RatingModal s'ouvre
    → Enregistrer : rateWorkout() + finishWorkout() → redirect /seance/:id
    → Passer : finishWorkout() → redirect /seance/:id

Page récap (/seance/:id)
  → Étoiles visibles (readonly) ou "Non notée"
  → Clic "Modifier" → modale confirmation → rateWorkout() → revalidatePath
```

---

## 6. Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `prisma/schema.prisma` | Modifier — ajout `rating` et `comment` sur `Workout` |
| `src/app/(app)/musculation/seance/actions.ts` | Modifier — ajout `rateWorkout` |
| `src/components/ui/star-rating.tsx` | Créer |
| `src/app/(app)/musculation/seance/[id]/live/rating-modal.tsx` | Créer |
| `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx` | Modifier — intégrer `RatingModal` |
| `src/app/(app)/musculation/seance/[id]/page.tsx` | Modifier — afficher note + modale modification |
