# Design — Séance musculation hors-ligne (PWA)

**Date :** 2026-09-07
**Statut :** Approuvé

---

## Résumé

Permettre de démarrer et dérouler une séance de musculation (depuis une séance-template ou depuis un programme actif) **sans connexion réseau**, avec synchronisation automatique vers le serveur dès que la connexion revient. L'app devient installable comme une PWA (icône, plein écran).

**Hors périmètre volontairement (V1)** :
- Création/édition de séances-templates, programmes, exercices hors-ligne — reste en ligne uniquement.
- Cardio, nutrition, agenda, profil/stats hors-ligne — restent en ligne uniquement.
- Utilisation simultanée hors-ligne sur deux appareils différents — un seul appareil actif à la fois est supposé (cohérent avec l'invariant "un seul programme actif").

**Pourquoi ce périmètre** : le besoin réel est de pouvoir dérouler un entraînement à la salle sans réseau/4G. La création de contenu se fait généralement avec réseau disponible ; l'étendre à tout de suite multiplierait la complexité du moteur de synchro sans répondre à un besoin exprimé.

---

## 1. Vue d'ensemble de l'architecture

Aujourd'hui, chaque interaction de la séance live (`workout-live.tsx`) appelle directement une Server Action qui parle à Postgres — un aller-retour réseau par clic. Cette architecture est incompatible avec le hors-ligne telle quelle.

Quatre briques nouvelles, ajoutées uniquement au flux "séance en cours" :

1. **Stockage local (IndexedDB via Dexie.js)** — miroir local de la séance en cours, des séries loguées, et d'un cache des templates/programme actif.
2. **File d'attente ("outbox")** — la liste ordonnée des actions en attente de synchronisation.
3. **Moteur de synchro** — rejoue la file dans l'ordre vers les Server Actions existantes dès que le réseau revient.
4. **Service Worker + manifest PWA** (via Serwist) — cache l'app pour un chargement instantané hors-ligne, déclenche la synchro, et rend l'app installable.

Principe directeur : pendant une séance live, l'écran ne parle **jamais** directement au serveur — il ne parle qu'au stockage local. La synchro est un processus d'arrière-plan totalement découplé de l'interaction utilisateur.

---

## 2. Stockage local (Dexie.js)

Base IndexedDB `spartops-offline`, avec ces tables :

**`cachedTemplates`** — rafraîchie silencieusement à chaque chargement de l'app avec réseau disponible :
```
{ id: string (id serveur du Workout template), name: string,
  exercises: { exerciseId, order, sets, reps, weight, restSeconds }[] }
```

**`cachedActiveProgram`** — idem, rafraîchie en même temps :
```
{ id: string, name: string, currentDayIndex: number,
  days: { order, workoutId, workoutName,
           exercises: { exerciseId, order, sets, reps, weight, restSeconds }[] }[] }
```

**`localWorkouts`** — une entrée par séance démarrée (en ligne ou non) tant qu'elle n'est pas synchronisée :
```
{ localId: uuid (clé primaire), serverId: string | null,
  name, status: "EN_COURS" | "TERMINEE",
  startedAt, completedAt, rating, comment,
  exercises: { localExerciseId: uuid, exerciseId, order, sets, reps, weight, restSeconds,
               serverWorkoutExerciseId: string | null }[] }
```
`localExerciseId` est généré localement pour adresser chaque exercice avant même de connaître son identifiant serveur (voir §4, résolution des identifiants).

**`localSetLogs`** :
```
{ localLogId: uuid, localWorkoutId: uuid, localExerciseId: uuid,
  setNumber, reps, weight, setType, rpe, completedAt }
```

**`outbox`** — la file d'attente, traitée strictement dans l'ordre d'insertion (FIFO) :
```
{ outboxId: uuid (clé d'idempotence), localWorkoutId: uuid,
  actionType: "startWorkout" | "completeSet" | "finishWorkout" | "rateAndFinishWorkout",
  payload: JSON, status: "pending" | "syncing" | "failed", createdAt }
```

Une fois une séance entièrement synchronisée, sa ou ses lignes dans `localWorkouts`/`localSetLogs`/`outbox` sont supprimées — pas d'accumulation.

---

## 3. Déroulé (les 3 scénarios)

**A. Démarrage en ligne, perte de réseau en cours de séance** — cas le plus courant. `localWorkouts` + première entrée `outbox` (`startWorkout`) créés immédiatement. Si le réseau est là, elle part tout de suite ; sinon elle patiente. Chaque série cochée s'écrit en local instantanément et s'ajoute à la file, réseau ou non. Aucune interruption visible.

**B. Démarrage complètement hors-ligne** — fonctionne à condition que `cachedTemplates`/`cachedActiveProgram` aient été peuplés lors d'une précédente session en ligne (automatique, silencieux).

**C. Retour du réseau** — le moteur de synchro vide la file dans l'ordre exact de création. Le premier `startWorkout` d'une séance donnée reçoit le `serverId` réel, utilisé pour résoudre les `completeSet` suivants de la même séance (voir §4). Une fois la file d'une séance vidée avec succès, ses données locales sont nettoyées et l'historique/stats serveur redevient la source de vérité affichée.

Fermer l'app avant le retour du réseau ne perd rien : IndexedDB survit à la fermeture, la synchro reprend à la prochaine ouverture.

---

## 4. Résolution des identifiants locaux → serveur

Problème : en créant une séance hors-ligne, on ne connaît ni l'id serveur du `Workout`, ni ceux des `WorkoutExercise` associés (créés uniquement au moment où `startFromTemplate`/`startProgramDay` s'exécutent réellement côté serveur).

Solution, rendue possible par le traitement strictement FIFO de la file :
1. L'entrée `startWorkout` d'une séance est toujours la première de sa file. Elle ne référence aucun id serveur — seulement `templateId`/`programId` (déjà connus, car issus du cache).
2. Quand cette entrée se synchronise avec succès, la Server Action retourne le `Workout.id` créé **et** la liste ordonnée des `WorkoutExercise.id` créés. Le moteur de synchro met alors à jour `localWorkouts.serverId` et remplit `exercises[].serverWorkoutExerciseId` pour cette séance, en associant par position (`order`).
3. Les entrées `completeSet` suivantes de la même séance, traitées après dans la file, résolvent leur `localExerciseId` vers le `serverWorkoutExerciseId` fraîchement rempli avant d'appeler la Server Action.

Aucune entrée `completeSet` n'est jamais tentée avant que le `startWorkout` de la même séance ait réussi — l'ordre FIFO garantit structurellement cette dépendance, sans mécanisme supplémentaire.

---

## 5. Modifications des Server Actions (idempotence + découplage du redirect)

Deux problèmes à régler dans `seance/actions.ts` et `programmes/actions.ts` :

**Redirect incompatible avec un appel en arrière-plan.** `startFromTemplate` et `startProgramDay` appellent `redirect()` en fin d'exécution — pertinent pour un clic utilisateur en ligne, absurde pour le moteur de synchro. Chacune est scindée en une fonction cœur non-redirigeante (ex. `createWorkoutFromTemplate(templateId, clientRequestId): Promise<{ workoutId: string, exerciseIds: string[] }>`) et l'action exportée existante, qui appelle ce cœur puis fait le `redirect()` — comportement inchangé pour tous les appelants actuels.

**Idempotence.** Deux champs ajoutés au schéma : `Workout.clientRequestId String? @unique` et `SetLog.clientRequestId String? @unique`. Chaque entrée de l'`outbox` porte un `outboxId` (uuid) transmis comme `clientRequestId`. Avant de créer, l'action cœur vérifie si un enregistrement avec ce `clientRequestId` existe déjà — si oui, elle renvoie l'existant au lieu d'en recréer un. Ça couvre le cas d'une confirmation réseau perdue après un traitement serveur réussi (retry sans doublon).

`finishWorkout`/`rateAndFinishWorkout` sont déjà des `updateMany` conditionnés sur `status: "EN_COURS"` — rejouer une fois de plus après succès est déjà sans effet (la clause `status: "EN_COURS"` ne matche plus). Pas de changement requis pour celles-ci au-delà d'accepter le `workoutId` résolu.

**Cas particulier `startProgramDay` — avancée de `currentDayIndex`.** Le cœur non-redirigeant doit avancer `currentDayIndex` **uniquement** lors de la création réelle du `Workout` (première exécution pour ce `clientRequestId`), jamais lors d'un rejeu qui retrouve un `Workout` existant via l'idempotence — sinon une resynchro accidentelle ferait sauter un jour du programme. L'avancée et la création du `Workout` restent dans la même transaction, elle-même court-circuitée si un `Workout` avec ce `clientRequestId` existe déjà.

---

## 6. Déclenchement de la synchro

- **Background Sync API** (`registration.sync.register(...)`) là où le navigateur la supporte (Chrome/Edge/Android) — réveille le service worker pour synchroniser même app fermée.
- **iOS Safari ne supporte pas Background Sync** — filet de sécurité : synchro déclenchée au premier plan sur l'évènement `online` du navigateur, et systématiquement tentée à chaque ouverture de l'app. Couvre le cas réaliste (sortie de la salle avec signal, app rouverte peu après).

---

## 7. Authentification hors-ligne

Le cookie de session better-auth reste présent dans le navigateur hors-ligne mais ne peut pas être validé sans réseau. L'app hors-ligne fait confiance au dernier état "connecté" connu (mis en cache au dernier chargement en ligne réussi) pour afficher l'interface plutôt que de forcer un écran de connexion sans réseau. C'est une question d'UX, pas de sécurité : toute mutation reste soumise à une session serveur valide au moment réel de la synchro.

**Limite connue** : si la session a expiré pendant la période hors-ligne, la synchro échouera avec une erreur d'authentification. L'utilisateur devra se reconnecter ; les données locales non synchronisées restent intactes dans l'`outbox` et repartiront après reconnexion. Pas de gestion UX spécifique au-delà d'un message d'erreur explicite en V1.

---

## 8. PWA (manifest + service worker)

- **Bibliothèque** : Serwist (`@serwist/next`), successeur maintenu de `next-pwa`, avec support natif de l'App Router de Next.js 16.
- **`public/manifest.json`** : nom "SpartOps", icônes générées depuis `public/spartan-hero.png`, `theme_color` aligné sur le dégradé de marque (`#3F5EFB`), `display: "standalone"`.
- Le service worker précache les assets de l'app (chargement instantané hors-ligne) et héberge la logique de synchro (§6).

---

## 9. Interface utilisateur

- Indicateur discret et permanent tant qu'une séance a des entrées en attente dans l'`outbox` : "En attente de synchro" (pas de blocage, juste une information).
- Aucun changement visible dans le flux normal de la séance live — c'est le point du design : l'utilisateur ne doit rien remarquer de différent, réseau ou non.
- Bouton d'installation PWA : utiliser l'invite native du navigateur (`beforeinstallprompt`), pas de bannière custom pour la V1.

---

## 10. Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `package.json` | Modifier — ajout `dexie`, `@serwist/next` |
| `next.config.ts` | Modifier — intégration du plugin Serwist |
| `public/manifest.json` | Créer |
| `public/icons/*` | Créer — icônes générées depuis `spartan-hero.png` |
| `src/app/sw.ts` | Créer — service worker custom (précache + synchro) |
| `prisma/schema.prisma` | Modifier — `clientRequestId` sur `Workout` et `SetLog` |
| `src/lib/offline/db.ts` | Créer — définition Dexie (tables §2) |
| `src/lib/offline/cache-templates.ts` | Créer — rafraîchissement du cache templates/programme actif |
| `src/lib/offline/outbox.ts` | Créer — enqueue + drain de la file, résolution d'identifiants (§4) |
| `src/app/(app)/musculation/seance/actions.ts` | Modifier — extraction des cœurs non-redirigeants, ajout `clientRequestId` |
| `src/app/(app)/musculation/programmes/actions.ts` | Modifier — idem pour `startProgramDay` |
| `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx` | Modifier — passe par le stockage local au lieu d'appeler les Server Actions directement |

---

## 11. Tests

Pas de suite automatisée dans ce repo (convention établie) — vérification par `pnpm build` + tests manuels. Spécifiquement pour cette fonctionnalité :
1. Mode "Offline" des DevTools pendant le développement (démarrer une séance, cocher des séries, terminer, réactiver le réseau, vérifier la synchro).
2. Test réel en mode avion sur téléphone avant de considérer la fonctionnalité terminée.
3. Vérifier la reprise après fermeture complète de l'app pendant que la file d'attente contient des entrées non synchronisées.
4. Vérifier qu'un rejeu accidentel d'une action déjà traitée (retry réseau) ne crée pas de doublon (`clientRequestId`).
