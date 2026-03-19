# Rest Timer Overlay Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le timer de repos inline par un overlay fixe en bas d'écran avec un cercle SVG animé qui se vide.

**Architecture:** Extraire un composant `RestTimerOverlay` dans `workout-live.tsx` qui s'affiche en `fixed bottom-0` avec un slide-in/out. Le cercle SVG utilise `stroke-dashoffset` pour animer la progression. L'ancien timer inline est supprimé. Le bouton Reset est supprimé intentionnellement (−15s suffit). Un state `restExerciseName` est mémorisé séparément pour éviter le flash du nom pendant l'animation de fermeture.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, SVG natif

---

## Fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx` | Modifier | Ajouter `RestTimerOverlay`, supprimer l'ancien timer inline |

---

## Chunk 1 : Composant RestTimerOverlay

### Task 1 : Remplacer le timer inline par l'overlay

**Files:**
- Modify: `src/app/(app)/musculation/seance/[id]/live/workout-live.tsx`

- [ ] **Step 1 : Ajouter le composant `RestTimerOverlay` avant `WorkoutLive`**

Ajouter ce composant juste avant la déclaration de `WorkoutLive` dans le fichier :

```tsx
// ─── Rest Timer Overlay ────────────────────────────────────────────────────────

type RestTimerProps = {
  active: boolean
  remaining: number
  total: number
  exerciseName: string
  onAdd: () => void
  onSubtract: () => void
  onSkip: () => void
}

function RestTimerOverlay({ active, remaining, total, exerciseName, onAdd, onSubtract, onSkip }: RestTimerProps) {
  const SIZE = 120
  const STROKE = 8
  const R = (SIZE - STROKE) / 2
  const CIRCUMFERENCE = 2 * Math.PI * R
  const progress = total > 0 ? remaining / total : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const isUrgent = remaining <= 5 && remaining > 0

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        active ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto max-w-lg bg-background border-t shadow-2xl rounded-t-2xl px-6 py-5">
        <p className="text-center text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wide">
          Repos — {exerciseName}
        </p>

        <div className="flex items-center justify-center gap-8">
          {/* Bouton -15s — désactivé si soustraire 15s viderait le timer */}
          <button
            onClick={onSubtract}
            disabled={remaining <= 15}
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            −15s
          </button>

          {/* Cercle SVG */}
          <div className="relative flex items-center justify-center">
            <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
              {/* Piste de fond */}
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE}
                className="text-muted/40"
              />
              {/* Arc de progression */}
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                stroke={isUrgent ? "#ef4444" : "#3F5EFB"}
                // transition 1s linear : synchronisé avec l'intervalle d'1 seconde
                // Le cercle animera sur +15s/-15s mais reste visuellement correct
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
              />
            </svg>
            {/* Countdown au centre — role="timer" sans aria-live (annoncer chaque seconde = trop de bruit) */}
            <span
              role="timer"
              className={`absolute text-2xl font-mono font-bold tabular-nums ${
                isUrgent ? "text-red-500" : "text-foreground"
              }`}
            >
              {remaining}
            </span>
          </div>

          {/* Bouton +15s */}
          <button
            onClick={onAdd}
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            +15s
          </button>
        </div>

        {/* Bouton Passer */}
        <button
          onClick={onSkip}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors border"
        >
          Passer
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Ajouter `restTotal` et `restExerciseName` dans le state de `WorkoutLive`**

Ajouter après `const [restForId, setRestForId] = useState<string | null>(null)` :

```tsx
  const [restTotal, setRestTotal] = useState(0)
  const [restExerciseName, setRestExerciseName] = useState("")
```

`restExerciseName` est mémorisé séparément pour éviter que le nom flash à `""` pendant l'animation de fermeture quand `restForId` passe à `null`.

- [ ] **Step 3 : Mettre à jour `startRest` et `stopRest`**

Remplacer les deux fonctions existantes par :

```tsx
  function startRest(seconds: number, weId: string) {
    if (restRef.current) clearInterval(restRef.current)
    const name = workout.exercises.find(we => we.id === weId)?.exercise.name ?? ""
    setRestRemaining(seconds)
    setRestTotal(seconds)
    setRestActive(true)
    setRestForId(weId)
    setRestExerciseName(name)
    restRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(restRef.current!)
          setRestActive(false)
          setRestForId(null)
          setRestTotal(0)
          triggerRestEnd()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function stopRest() {
    if (restRef.current) clearInterval(restRef.current)
    setRestActive(false)
    setRestRemaining(0)
    setRestForId(null)
    setRestTotal(0)
  }
```

Note : `restExerciseName` n'est PAS remis à `""` dans `stopRest` ni à la fin naturelle — intentionnel pour éviter le flash du nom pendant l'animation de fermeture de 300ms.

- [ ] **Step 4 : Intégrer `RestTimerOverlay` dans le return de `WorkoutLive`**

Ajouter juste avant la balise `</div>` fermante finale du return principal (après le bouton "Terminer la séance") :

```tsx
      {/* Overlay timer de repos */}
      <RestTimerOverlay
        active={restActive}
        remaining={restRemaining}
        total={restTotal}
        exerciseName={restExerciseName}
        onAdd={() => setRestRemaining(r => r + 15)}
        onSubtract={() => setRestRemaining(r => Math.max(16, r) - 15)}
        onSkip={stopRest}
      />
```

- [ ] **Step 5 : Augmenter le padding bas quand l'overlay est actif**

Remplacer la classe du conteneur principal :

```tsx
    <div className="space-y-4 max-w-lg mx-auto pb-24">
```

par :

```tsx
    <div className={`space-y-4 max-w-lg mx-auto transition-all ${restActive ? "pb-56" : "pb-24"}`}>
```

Cela évite que le bouton "Valider la série" soit caché sous l'overlay.

- [ ] **Step 6 : Supprimer l'ancien timer inline**

Dans la section `{isActive && (...)}`, supprimer entièrement le bloc suivant :

```tsx
                {/* Chrono repos */}
                {restActive && restForId === we.id && (
                  <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3 text-center">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-300">😴 Temps de repos</p>
                    <p className="text-4xl font-mono font-bold text-blue-700 dark:text-blue-200">
                      {formatTime(restRemaining)}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setRestRemaining((r) => r + 15)}
                        className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600"
                      >+15s</button>
                      <button
                        onClick={() => startRest(we.restSeconds, we.id)}
                        className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600"
                      >Reset</button>
                      <button
                        onClick={stopRest}
                        className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600"
                      >Passer</button>
                    </div>
                  </div>
                )}
```

- [ ] **Step 7 : Vérifier TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "error TS"
```

Expected: aucune sortie.

- [ ] **Step 8 : Vérifier le build**

```bash
pnpm build 2>&1 | grep -E "error|Error|live"
```

Expected: `/musculation/seance/[id]/live` présent, 0 erreur.

- [ ] **Step 9 : Commit et push**

```bash
git add 'src/app/(app)/musculation/seance/[id]/live/workout-live.tsx'
git commit -m "feat: replace inline rest timer with fixed overlay and SVG progress circle"
git push origin dev
```
