# Sprint 3 — Musculation : Catalogue d'exercices

## Contexte

Ajout du catalogue de groupes musculaires et exercices. Les données sont pré-remplies via seed (pas de CRUD utilisateur dans ce sprint).

## Données

### Groupes musculaires (8)
| Emoji | Nom | Slug |
|-------|-----|------|
| 💪 | Pectoraux | pectoraux |
| 🔙 | Dos | dos |
| 🏔️ | Épaules | epaules |
| 💪 | Biceps | biceps |
| 🦾 | Triceps | triceps |
| 🎯 | Abdominaux | abdominaux |
| 🦵 | Jambes | jambes |
| 🍑 | Fessiers | fessiers |

### Exercices (~60 au total, ~7-8 par groupe)
Chaque exercice : `name`, `description`, `difficulty` (DEBUTANT/INTERMEDIAIRE/AVANCE), `equipment`, `image` (emoji).

## Pages

### `/musculation`
- Grille de cartes (1 col mobile → 2 col sm → 4 col xl)
- Style identique au dashboard (`bg-background/80 backdrop-blur-sm`)
- Chaque carte : emoji (grand), nom groupe, badge "X exercices", lien "Voir →" en #3F5EFB

### `/musculation/[slug]`
- Breadcrumb : Musculation → [Groupe]
- Grille exercices (1 col → 2 col sm → 3 col lg)
- Chaque carte : emoji, nom, badge difficulté coloré (vert DEBUTANT / orange INTERMEDIAIRE / rouge AVANCE), équipement

## Choix techniques
- Images → emojis stockés dans le champ `image` de la BDD
- Routing par `slug` (ex: `/musculation/pectoraux`)
- Server Components (pas de "use client") — lecture BDD directe
- Seed : `prisma/seed.ts` complété avec `upsert` pour idempotence
