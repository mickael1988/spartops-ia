# Cardio — Séance live (étape 2/4)

**Date :** 2026-09-30
**Statut :** Conception approuvée en conversation — relecture du document en attente

---

## Contexte

L'étape 1 (catalogue) est en production : 33 WOD dans `CardioProgram` (4 formats : `CIRCUIT`, `AMRAP`, `EMOM`, `FOR_TIME`), leurs étapes dans `CardioStep` (une seule unité par étape : `durationSec`, `reps` ou `distanceM`), la page liste `/cardio` et la page détail `/cardio/[id]` dont le bouton « Démarrer » est volontairement grisé.

Cette étape construit **l'écran de séance** : dérouler un WOD avec le bon minuteur selon son format, puis enregistrer le résultat. Elle doit **fonctionner sans réseau**, comme la séance de musculation : les minuteurs tournent en local et le résultat est mis dans la file d'attente hors-ligne existante (`src/lib/offline/outbox.ts`).

Étapes restantes du module (hors de ce document) : 3. création de WOD perso, 4. historique et records personnels.

**Hors périmètre de cette étape :**
- Créer ou modifier un WOD (étape 3) ; afficher l'historique, les records, des graphiques (étape 4) : ce document ne fait qu'**écrire** les résultats.
- Enregistrer une séance passée à la main, noter une séance (étoiles/commentaire), saisir des charges, version « scalée » d'un WOD.
- Plusieurs séances cardio en même temps.
- Ouvrir l'écran de séance **à froid sans réseau** : la page est rendue côté serveur (comme pour la musculation, voir `spartops_offline_pwa` en mémoire) ; elle doit avoir été chargée en ligne avant de passer hors-ligne.
- Vibration sur iPhone (l'API n'existe pas sur iOS) : le son reste le signal.

---

## 1. Données

Seules les séances **terminées** sont enregistrées. Quitter en cours de route jette l'état local après confirmation.

`UserCardioSession` est remplacée dans son contenu (la table est vide en production : aucune interface ne l'a jamais écrite) :

```prisma
model UserCardioSession {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  programId       String
  program         CardioProgram @relation(fields: [programId], references: [id])
  startedAt       DateTime
  completedAt     DateTime      // heure réelle de fin, prise sur le téléphone
  elapsedSeconds  Int           // temps réellement écoulé, pauses exclues
  roundsCompleted Int?          // AMRAP uniquement : tours terminés
  extraReps       Int?          // AMRAP uniquement : répétitions dans le tour entamé
  clientRequestId String?       @unique   // clé d'idempotence (id de l'entrée de file d'attente)
}
```

Le champ `durationMin` disparaît (trop grossier pour un chrono). Le score dépend du format :

| Format | Score enregistré |
|---|---|
| `CIRCUIT`, `EMOM` | `elapsedSeconds` (égal à la durée prévue si la séance va au bout) |
| `AMRAP` | `roundsCompleted` + `extraReps` (et `elapsedSeconds` = temps limite) |
| `FOR_TIME` | `elapsedSeconds` = le chrono final |

`roundsCompleted` et `extraReps` restent `null` pour tout format autre qu'`AMRAP`.

### Action serveur `saveCardioSession`

Dans `src/app/(app)/cardio/actions.ts` (fichier `"use server"`). Signature : `saveCardioSession(input: SaveCardioSessionInput, clientRequestId: string): Promise<void>` avec `input = { programId, startedAt: string (ISO), completedAt: string (ISO), elapsedSeconds: number, roundsCompleted: number | null, extraReps: number | null }`.

Règles, dans cet ordre :
1. Session better-auth obligatoire (`auth.api.getSession`), sinon erreur « Non authentifié ».
2. Si une `UserCardioSession` porte déjà ce `clientRequestId`, retour immédiat (renvoi déjà traité).
3. Le WOD doit exister et être accessible : `findFirst({ id: programId, OR: [{ userId: null }, { userId: session.user.id }] })` (la seconde branche sert à l'étape 3 ; à cette étape seuls des WOD officiels existent).
4. Validation : `elapsedSeconds` entier de 1 à 21 600 ; `startedAt` ≤ `completedAt`, les deux entre « maintenant − 30 jours » et « maintenant + 5 minutes » ; `roundsCompleted` (0 à 500) et `extraReps` (0 à 1 000) autorisés uniquement si le format du WOD est `AMRAP`, `null` sinon.
5. Création avec `userId` = `session.user.id`.

---

## 2. Moteur de minuteur

Module de fonctions pures, sans React, `src/lib/cardio/timeline.ts`.

**Entrée :** `WodForTimeline = { format, durationMin, steps: { order, name, image, durationSec, reps, distanceM }[] }`.

**`buildTimeline(wod)`** retourne un objet selon le format :
- `CIRCUIT` → `{ kind: "phased", phases, totalMs }` : une phase par étape, dans l'ordre, avec `startMs`, `durationMs`, `stepIndex`. `totalMs` = somme des durées.
- `EMOM` → `{ kind: "phased", phases, totalMs, minutes }` : les étapes forment **une minute** ; elles sont répétées `durationMin` fois (`minutes = durationMin`). Chaque phase porte son numéro de minute. Une « minute » dure la somme réelle des étapes (60 s dans tout le catalogue actuel) ; `totalMs` = `durationMin` × cette somme.
- `AMRAP` → `{ kind: "countdown", totalMs: durationMin × 60 000, roundTemplate: steps }`.
- `FOR_TIME` → `{ kind: "stopwatch", steps }` (pas de durée).

**`getState(timeline, elapsedMs)`** retourne :
- phased → `{ phaseIndex, phaseRemainingMs, totalRemainingMs, minuteIndex (EMOM), next (phase suivante ou null), finished }` ;
- countdown → `{ totalRemainingMs, finished }` ;
- stopwatch → `{ elapsedMs }`.

**Temps écoulé :** `elapsedMs = maintenant − startedAtMs − pausedTotalMs − (pause en cours)`. Rien n'est compté seconde par seconde : un écran verrouillé ou une app en arrière-plan ne fausse donc rien, le minuteur se recale au retour. Le décompte 3-2-1 précède le départ : `startedAtMs` est posé à la fin du décompte.

**Signaux sonores** (module `src/lib/cardio/cues.ts`, hors moteur) : à chaque tick d'affichage (~250 ms), on compare l'état précédent et le nouveau — changement de phase → bip ; passage à 3, 2, 1 s restantes d'une phase → bip court ; fin → bip long. Le même fichier contient la vibration (quand elle existe) et la demande d'écran maintenu allumé (`navigator.wakeLock`, ignorée si non disponible).

---

## 3. Écran de séance

**Route :** `src/app/(app)/cardio/[id]/seance/page.tsx` — Server Component qui charge le WOD (`findFirst` avec `OR userId null / userId courant`, étapes et exercices inclus, `notFound()` sinon) et passe les données au composant client `CardioLive`. Le bouton « Démarrer » de `/cardio/[id]` (aujourd'hui `disabled`) devient un lien vers cette route ; la mention « Bientôt disponible » est retirée.

**Phases de l'écran :**
1. **Prêt** — aperçu du WOD, gros bouton « Démarrer » (le geste débloque le son sur iPhone).
2. **Décompte 3-2-1**, avec bip.
3. **En cours** — vue selon le format (ci-dessous).
4. **Terminé** — récapitulatif ; pour `AMRAP`, ajustement des tours et saisie des répétitions en plus ; bouton « Enregistrer ».
5. **Enregistré** — message indiquant si le score est déjà sur le serveur ou en attente de synchronisation, et lien de retour vers le WOD.

**Vues « en cours » :**
- **Circuit et EMOM :** grand anneau de compte à rebours (même style que le minuteur de repos de `workout-live.tsx`), exercice en cours en grand avec son emoji, ligne « Ensuite : … », barre de progression globale ; EMOM ajoute « Minute 3 / 10 ». Le passage d'une étape à la suivante est automatique.
- **AMRAP :** compte à rebours global en grand, tour type affiché en liste (répétitions ou distance par exercice), gros bouton **+1 tour** et compteur de tours. Le compte à rebours à zéro termine la séance.
- **For Time :** chrono qui monte, liste des étapes à cocher, bouton « Terminé » (actif à tout moment ; cocher toutes les étapes ne termine pas automatiquement).

**Communs :** pause/reprise ; « Quitter » avec confirmation (l'état local est alors supprimé, rien n'est enregistré) ; signaux sonores ; écran maintenu allumé.

**Reprise après fermeture :** l'état de séance est conservé dans le téléphone (`localStorage`, clé `cardio-live:v1:<programId>`) : `{ localSessionId, startedAtMs, pausedAtMs | null, pausedTotalMs, roundsCompleted, checkedSteps: number[], finished: { atMs: number, elapsedMs: number } | null }`. `finished` est renseigné dès que la séance se termine (fin automatique du minuteur, ou clic sur « Terminé » en For Time) : si l'app est rouverte avant l'enregistrement, l'écran reprend directement à « Terminé » avec le temps figé, le chrono ne continue pas de tourner. Sur `/cardio/[id]`, un composant client lit cette clé et affiche « Séance en cours — Reprendre » s'il y en a une. La clé est supprimée dès que le résultat est mis en file d'attente ou que la séance est abandonnée. L'écran de séance lit aussi cette clé au chargement : si une séance est en cours pour ce WOD, il reprend directement à la bonne étape sans repasser par « Prêt ».

---

## 4. Hors-ligne et sauvegarde

- **Fin de séance :** le résultat est ajouté à la file d'attente hors-ligne existante avec une nouvelle action `saveCardioSession`. `src/lib/offline/db.ts` (union `OutboxActionType`) et `src/lib/offline/outbox.ts` (fonction `queueSaveCardioSession`, cas dans `syncEntry`) sont étendus. Payload : `{ programId, startedAt, completedAt, elapsedSeconds, roundsCompleted, extraReps }`. La clé de groupement `workoutId` de l'entrée reçoit l'identifiant local de la séance (`localSessionId`), ce qui n'interfère pas avec le nettoyage existant.
- **Idempotence :** `clientRequestId` = `outboxId` de l'entrée, transmis à `saveCardioSession` (comme pour `completeSet`).
- **Envoi :** `drainOutbox()` est appelé à l'enregistrement, au chargement de l'écran de séance et au chargement du composant de reprise de `/cardio/[id]`, afin qu'une séance terminée hors-ligne parte dès que l'app est rouverte avec du réseau. L'écouteur `online` est armé par l'import du module.
- **Fermer l'app avant l'envoi :** rien n'est perdu (IndexedDB), l'envoi reprend à la réouverture.
- **Échec d'envoi persistant** (session expirée, par exemple) : l'entrée passe à `failed` et reste en file ; le message de l'étape « Enregistré » ne prétend alors jamais que tout est synchronisé.

---

## 5. Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `prisma/schema.prisma` | Modifier — `UserCardioSession` (voir §1) |
| `src/lib/cardio/timeline.ts` | Créer — moteur de minuteur pur |
| `src/lib/cardio/live-state.ts` | Créer — lecture/écriture/suppression de l'état de séance en `localStorage` |
| `src/lib/cardio/cues.ts` | Créer — bips, vibration, écran maintenu allumé |
| `src/app/(app)/cardio/actions.ts` | Créer — `saveCardioSession` |
| `src/lib/offline/db.ts`, `src/lib/offline/outbox.ts` | Modifier — action `saveCardioSession` |
| `src/app/(app)/cardio/[id]/seance/page.tsx` | Créer — page serveur |
| `src/app/(app)/cardio/[id]/seance/cardio-live.tsx` | Créer — composant client (état, pause, phases de l'écran) |
| `src/app/(app)/cardio/[id]/seance/*-view.tsx` | Créer — vues Circuit/EMOM, AMRAP, For Time |
| `src/app/(app)/cardio/[id]/resume-banner.tsx` | Créer — bandeau « Reprendre » (client) |
| `src/app/(app)/cardio/[id]/page.tsx` | Modifier — bouton « Démarrer » actif, bandeau de reprise |

Le Service Worker (`src/app/sw.ts`) n'est pas modifié : les pages restent `NetworkOnly`, les scripts sont déjà précachés.

---

## 6. Mise en production

La colonne `durationMin` disparaît et des colonnes obligatoires (`startedAt`, `elapsedSeconds`, `completedAt` sans défaut utile) apparaissent : le `db push` n'est sûr que parce que `UserCardioSession` est vide en production. Même procédure que l'étape 1 (commande de build temporaire `npx prisma db push && next build --webpack`, puis retour à la normale) ; **jamais** `--accept-data-loss` — si une ligne existait, le build doit échouer plutôt que supprimer des données. Aucun nouveau seed.

---

## 7. Vérification

Pas de suite de tests automatisée dans ce projet (convention établie).
1. `pnpm build` (type-check).
2. Moteur de minuteur : script jetable (non commité) qui, pour un WOD de chaque format du catalogue, affiche l'étape courante, le temps restant et l'état « terminé » à des instants précis (début, milieu d'une étape, frontière entre deux étapes, fin, après une pause simulée).
3. Action serveur : appels HTTP avec un utilisateur jetable — enregistrement valide, renvoi avec le même `clientRequestId` (un seul enregistrement), refus de `roundsCompleted` sur un WOD non-AMRAP, refus d'une durée hors bornes, refus sans session.
4. Pages : `/cardio/[id]` contient un lien « Démarrer » vers `/cardio/[id]/seance` ; cette page répond 200 pour un WOD de chaque format et 404 pour un identifiant inconnu.
5. **À faire par toi, sur ton téléphone** (non vérifiable par l'assistant) : bips, vibration sous Android, écran maintenu allumé, verrouillage/déverrouillage en cours de séance, fermeture et réouverture avec reprise, fin de séance en mode avion puis retour du réseau.
