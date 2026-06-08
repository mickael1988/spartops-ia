# Création de séance personnalisée — Design

## Contexte

Ajout d'une fonctionnalité de création de séance d'entraînement personnalisée, accessible depuis la page /musculation.

## Point d'entrée

Carte dédiée "Créer une séance" en première position dans la grille de /musculation. Icône PlusCircle, style gradient bleu→rouge, lien vers `/musculation/seance/nouvelle`.

## Pages

### `/musculation/seance/nouvelle` (Client Component)
Formulaire de création de séance :

1. **Champ "Nom de la séance"** — texte libre (ex: "Push Day")

2. **Formulaire "Ajouter un exercice"** :
   - Select Groupe musculaire (filtre dynamique)
   - Select Exercice (filtré par groupe sélectionné)
   - Séries : nombre entier (défaut: 3)
   - Répétitions : nombre entier (défaut: 10)
   - Poids (kg) : nombre décimal, optionnel
   - Repos entre séries (secondes) : nombre entier (défaut: 60)
   - Bouton "Ajouter" → ajoute à la liste locale (state)

3. **Liste des exercices ajoutés** :
   - Chaque ligne : nom exercice, Sx R reps x kg poids, repos Xs
   - Bouton supprimer par exercice

4. **Bouton "Enregistrer la séance"** → Server Action → redirect

### `/musculation/seance/[id]` (Server Component)
Page récapitulatif de la séance créée :
- Breadcrumb : Musculation → Séance → [Nom]
- Nom de la séance + statut badge (PLANIFIEE)
- Liste des exercices avec séries/reps/poids/repos

## Server Action

Fichier : `src/app/(app)/musculation/seance/actions.ts`

```typescript
"use server"
export async function createWorkout(data: CreateWorkoutInput) {
  // Crée Workout + WorkoutExercise[] en transaction Prisma
  // Retourne l'ID pour redirect
}
```

Validation : nom requis, au moins 1 exercice.

## Données

Utilise les modèles Prisma existants :
- `Workout` : userId, name, status (PLANIFIEE par défaut)
- `WorkoutExercise` : exerciseId, order, sets, reps, weight?, restSeconds

Les groupes musculaires + exercices sont chargés côté serveur et passés en props au Client Component (pas d'appel API côté client).
