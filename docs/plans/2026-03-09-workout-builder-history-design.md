# Workout Builder (panier) + Historique — Design Document

**Date :** 2026-03-09

## Objectif

Permettre de composer une séance multi-exercices / multi-groupes musculaires depuis le catalogue via un panier flottant persistant, puis consulter l'historique des séances terminées.

---

## Flux utilisateur

1. `/musculation/biceps` → clic "+ Ajouter" sur Curl Barre, Chin-Up, Curl Concentré
2. Navigation vers `/musculation/pectoraux` → clic "+ Ajouter" sur 4 exercices
3. Barre flottante affiche **"🏋️ 7 exercices"**
4. Clic **"▶ Démarrer"** → Server Action crée la séance → redirect `/live`
5. Séance terminée → visible dans `/musculation/historique`

---

## Architecture

```
src/app/(app)/musculation/
  layout.tsx             ← NOUVEAU : CartProvider wraps tout /musculation
  cart-context.tsx       ← NOUVEAU : Context + hook useCart()
  cart-bar.tsx           ← NOUVEAU : barre flottante en bas
  [slug]/
    exercise-card.tsx    ← MODIFIÉ : bouton + au lieu de démarrage direct
  historique/
    page.tsx             ← NOUVEAU : liste séances TERMINEE
```

**Persistance :** Context React — vit dans le layout `/musculation`, survive aux navigations intra-musculation, se vide au démarrage de la séance.

---

## Interface

### Cartes exercices (catalogue)

- Exercice absent du panier → bouton "+ Ajouter" (outline)
- Exercice dans le panier → badge "✅ Dans la séance" + bouton "Retirer"

### Barre flottante `CartBar`

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏋️ 7 exercices  [× Vider]  [▶ Démarrer]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
- Visible uniquement si ≥ 1 exercice dans le panier
- Fixée en bas de l'écran (`position: fixed`)

### Historique `/musculation/historique`

```
09 mars · Séance Pec + Biceps
7 exercices · 41 min              [Voir →]

07 mars · Biceps Curl Concentré
1 exercice · 8 min                [Voir →]
```
- Séances `TERMINEE` uniquement, triées par `completedAt` DESC
- Durée = `completedAt - startedAt`
- Lien "Voir" → page de détail existante `/musculation/seance/[id]`

---

## Données

Aucune migration Prisma. On réutilise `Workout` + `WorkoutExercise` existants.

**Server Action `buildAndStartWorkout(exerciseIds: string[])`**
- Vérifie session
- Valide que les exerciseIds existent en BDD
- Crée `Workout` (status `EN_COURS`, `startedAt = now()`)
- Crée `WorkoutExercise` pour chaque id (3 sets × 10 reps, 60s repos, ordre = index)
- `redirect` vers `/musculation/seance/[id]/live`

---

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/app/(app)/musculation/cart-context.tsx` | Créer |
| `src/app/(app)/musculation/layout.tsx` | Créer |
| `src/app/(app)/musculation/cart-bar.tsx` | Créer |
| `src/app/(app)/musculation/[slug]/exercise-card.tsx` | Modifier |
| `src/app/(app)/musculation/seance/actions.ts` | Ajouter `buildAndStartWorkout` |
| `src/app/(app)/musculation/historique/page.tsx` | Créer |
| `src/app/(app)/musculation/page.tsx` | Ajouter lien historique |
