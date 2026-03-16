# Graphique d'activité — Page Profil

**Date :** 2026-03-16
**Statut :** Approuvé

---

## Objectif

Ajouter un graphique sur la page profil affichant le nombre de séances d'entraînement complétées par semaine, pour le mois précédent et le mois en cours.

---

## Comportement

- Affiche **deux mois** : le mois précédent et le mois en cours
- Chaque mois est décomposé en **semaines** (position 1 à 5 dans le mois)
- Chaque barre représente le **nombre de séances `TERMINEE`** dans cette semaine
- La **semaine en cours** (non encore terminée) est affichée en hachuré pour signifier qu'elle est ouverte
- Si aucune séance n'existe, les barres sont à 0 (graphique vide mais présent)

### Règles de filtrage Prisma

```ts
where: {
  userId,
  status: "TERMINEE",
  isTemplate: false,
  completedAt: { gte: debutMoisPrecedent, lt: debutMoisSuivant }
}
```

- Les workouts avec `completedAt = null` sont exclus implicitement : `null` n'est jamais `>= debutMoisPrecedent`
- Les templates (`isTemplate = true`) sont exclus

### Règle d'assignation semaine → mois

- Toutes les dates sont traitées en **UTC**
- Une séance appartient au mois de son `completedAt` UTC (pas de la semaine ISO globale)
- La position de semaine dans le mois (1 à 5) est calculée ainsi :
  ```ts
  // Jour du mois (1-based) → semaine 1, 2, 3, 4 ou 5
  weekIndex = Math.ceil(completedAt.getUTCDate() / 7)  // 1..5
  ```
- Une séance du 28 février appartient à la semaine 4 de février, même si la semaine calendaire ISO chevauche mars

### Semaine en cours

- La semaine en cours est identifiée par : `weekIndex === Math.ceil(today.getUTCDate() / 7)` **et** le mois est le mois courant

---

## Design visuel

- **Layout :** deux groupes de barres séquentiels (mois précédent à gauche, mois courant à droite), séparés par un trait vertical fin — **pas** un grouped bar chart classique
- **Mois précédent :** barres en marron discret (`#7c3d12`, opacité 0.8)
- **Mois en cours :** barres en dégradé orange (`from-orange-500 to-amber-400`), cohérent avec le label "Matériel nécessaire" existant
- **Semaine en cours :** fond hachuré + bordure en pointillés orange
- **Axe Y :** entiers de 0 au max de séances/semaine sur la période
- **Légende :** sous le graphique (mois précédent / mois en cours / semaine en cours)
- **Label de période :** coin supérieur droit (ex : "Fév — Mar 2026")
- **Rendu :** SVG natif — aucune librairie externe

---

## Architecture

### Données — calcul serveur

Dans `page.tsx` (server component) :

1. Requête Prisma : workouts `TERMINEE`, `isTemplate: false`, `completedAt` non null, dans la fenêtre des deux mois
2. Aggrégation TypeScript : grouper par `(mois: "precedent" | "courant", weekIndex: 1..5)`
3. Passer au composant une structure typée :

```ts
type WeekData = {
  mois: "precedent" | "courant"
  weekIndex: number      // 1 à 5
  count: number
  isCurrent: boolean     // true = semaine en cours (hachuré)
}
```

### Composant

- **`ProfilActivityChart`** (`profil-activity-chart.tsx`) — `"use client"`
- Props : `data: WeekData[]`, `labelPrecedent: string`, `labelCourant: string`
- Rendu SVG natif
- Placé dans une `Card` shadcn/ui sous la card profil existante dans `page.tsx`

---

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `src/app/(app)/profil/page.tsx` | Ajouter import prisma + requête + agrégation + passer props |
| `src/app/(app)/profil/profil-activity-chart.tsx` | Créer composant chart SVG |

---

## Hors scope

- Pas de sélecteur de période navigable
- Pas de librairie chart externe
- Pas de données cardio (uniquement `Workout`)
- Pas d'animation au chargement
- Pas de gestion de timezone utilisateur (UTC fait foi)
