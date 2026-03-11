"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { startWorkout, completeSet, finishWorkout } from "../../actions"
import type { Workout, WorkoutExercise, Exercise, MuscleGroup } from "@/generated/prisma/client"

type ExerciseWithRelations = WorkoutExercise & {
  exercise: Exercise & { muscleGroup: MuscleGroup }
}

type WorkoutWithExercises = Workout & {
  exercises: ExerciseWithRelations[]
}

export function WorkoutLive({ workout }: { workout: WorkoutWithExercises }) {
  const [started, setStarted] = useState(workout.status === "EN_COURS")
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [completedSetsMap, setCompletedSetsMap] = useState<Record<string, number>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, we.completedSets]))
  )
  const [setsMap, setSetsMap] = useState<Record<string, number>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, we.sets]))
  )
  const [weightMap, setWeightMap] = useState<Record<string, number | null>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, we.weight]))
  )
  const [repsMap, setRepsMap] = useState<Record<string, number>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, we.reps]))
  )
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [restActive, setRestActive] = useState(false)
  const [restRemaining, setRestRemaining] = useState(0)
  const [restForId, setRestForId] = useState<string | null>(null)
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const exerciseRefs = useRef<(HTMLDivElement | null)[]>([])
  const router = useRouter()

  // Premier exercice non terminé
  const activeIndex = workout.exercises.findIndex(
    (we) => (completedSetsMap[we.id] ?? 0) < (setsMap[we.id] ?? we.sets)
  )
  const allDone = activeIndex === -1

  // Auto-scroll vers l'exercice actif
  useEffect(() => {
    if (activeIndex >= 0) {
      exerciseRefs.current[activeIndex]?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [activeIndex])

  // Chrono total
  useEffect(() => {
    if (!started) return
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [started])

  // Cleanup chrono repos
  useEffect(() => () => { if (restRef.current) clearInterval(restRef.current) }, [])

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  function triggerRestEnd() {
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200])
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {
      // AudioContext non supporté
    }
  }

  function startRest(seconds: number, weId: string) {
    if (restRef.current) clearInterval(restRef.current)
    setRestRemaining(seconds)
    setRestActive(true)
    setRestForId(weId)
    restRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(restRef.current!)
          setRestActive(false)
          setRestForId(null)
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
  }

  async function handleStart() {
    setStarting(true)
    try {
      await startWorkout(workout.id)
      setStarted(true)
    } finally {
      setStarting(false)
    }
  }

  async function handleFinish() {
    setFinishing(true)
    try {
      await finishWorkout(workout.id)
      router.push(`/musculation/seance/${workout.id}`)
    } catch {
      setFinishing(false)
    }
  }

  async function handleCompleteSet(we: ExerciseWithRelations) {
    if (validatingId) return
    const done = completedSetsMap[we.id] ?? 0
    const totalSets = setsMap[we.id] ?? we.sets
    if (done >= totalSets) return
    setValidatingId(we.id)
    const reps = repsMap[we.id] ?? we.reps
    const weight = weightMap[we.id] ?? null
    try {
      await completeSet(we.id, reps, weight)
      setCompletedSetsMap((prev) => ({ ...prev, [we.id]: done + 1 }))
      startRest(we.restSeconds, we.id)
    } finally {
      setValidatingId(null)
    }
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <button
          onClick={() => router.back()}
          className="self-start flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-bold text-center">{workout.name}</h1>
        <p className="text-muted-foreground">
          {workout.exercises.length} exercice{workout.exercises.length > 1 ? "s" : ""}
        </p>
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full max-w-sm rounded-2xl py-5 text-xl font-bold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          {starting ? "Démarrage…" : "Démarrer la séance"}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 flex items-center justify-between py-3 bg-background/80 backdrop-blur-sm text-sm text-muted-foreground">
        <span>
          {allDone
            ? "✅ Tous les exercices terminés"
            : `Exercice ${activeIndex + 1} / ${workout.exercises.length}`}
        </span>
        <span className="font-mono font-bold text-base text-foreground">
          ⏱ {formatTime(elapsedSeconds)}
        </span>
      </div>

      {/* Liste complète des exercices */}
      {workout.exercises.map((we, index) => {
        const done = completedSetsMap[we.id] ?? 0
        const isCompleted = done >= (setsMap[we.id] ?? we.sets)
        const isActive = index === activeIndex

        return (
          <div
            key={we.id}
            ref={(el) => { exerciseRefs.current[index] = el }}
            className={`rounded-2xl border p-5 space-y-4 transition-all ${
              isCompleted
                ? "opacity-40 bg-background/40"
                : isActive
                ? "border-primary bg-background/80 backdrop-blur-sm shadow-sm"
                : "bg-background/70"
            }`}
          >
            {/* En-tête */}
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">{we.exercise.image ?? "🏋️"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {we.exercise.muscleGroup.name}
                </p>
                <h3 className="font-bold text-lg leading-tight">{we.exercise.name}</h3>
              </div>
              {isCompleted && <span className="text-green-500 text-xl" aria-label="Terminé">✅</span>}
            </div>

            {/* Résumé (terminé) */}
            {isCompleted && (
              <p className="text-sm text-muted-foreground">
                {setsMap[we.id] ?? we.sets} séries terminées
              </p>
            )}

            {/* Inputs éditables (exercice en attente) */}
            {!isActive && !isCompleted && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Séries</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={setsMap[we.id] ?? we.sets}
                    onChange={(e) =>
                      setSetsMap((prev) => ({ ...prev, [we.id]: Math.max(1, parseInt(e.target.value) || 1) }))
                    }
                    className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Poids (kg)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={weightMap[we.id] ?? ""}
                    placeholder="—"
                    onChange={(e) =>
                      setWeightMap((prev) => ({
                        ...prev,
                        [we.id]: e.target.value === "" ? null : parseFloat(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold"
                  />
                </div>
              </div>
            )}

            {/* Contenu interactif (exercice actif uniquement) */}
            {isActive && (
              <>
                <p className="text-center text-sm font-medium text-muted-foreground">
                  Série {Math.min(done + 1, setsMap[we.id] ?? we.sets)} / {setsMap[we.id] ?? we.sets}
                </p>

                {done < (setsMap[we.id] ?? we.sets) ? (
                  <>
                    {/* Inputs séries + reps + poids pour la série en cours */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Séries</label>
                        <input
                          type="number"
                          min={done + 1}
                          max={20}
                          value={setsMap[we.id] ?? we.sets}
                          onChange={(e) =>
                            setSetsMap((prev) => ({ ...prev, [we.id]: Math.max(done + 1, parseInt(e.target.value) || done + 1) }))
                          }
                          className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Répétitions</label>
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={repsMap[we.id] ?? we.reps}
                          onChange={(e) =>
                            setRepsMap((prev) => ({ ...prev, [we.id]: Math.max(1, parseInt(e.target.value) || 1) }))
                          }
                          className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Poids (kg)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={weightMap[we.id] ?? ""}
                          placeholder="—"
                          onChange={(e) =>
                            setWeightMap((prev) => ({
                              ...prev,
                              [we.id]: e.target.value === "" ? null : parseFloat(e.target.value),
                            }))
                          }
                          className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleCompleteSet(we)}
                      disabled={validatingId === we.id}
                      className="w-full rounded-2xl py-4 text-lg font-bold text-white disabled:opacity-60"
                      style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
                    >
                      {validatingId === we.id ? "Enregistrement…" : "✓ Valider la série"}
                    </button>
                  </>
                ) : (
                  <div className="w-full rounded-2xl py-3 text-center font-bold text-green-600 bg-green-50 dark:bg-green-900/20">
                    ✅ Exercice terminé !
                  </div>
                )}

                {/* Dots séries */}
                <div className="flex justify-center gap-2">
                  {Array.from({ length: setsMap[we.id] ?? we.sets }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-3 w-3 rounded-full ${i < done ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>

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
              </>
            )}
          </div>
        )
      })}

      {/* Bouton terminer — visible quand tout est fait */}
      {allDone && (
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="w-full rounded-2xl py-5 text-xl font-bold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
        >
          {finishing ? "Enregistrement…" : "🏁 Terminer la séance"}
        </button>
      )}
    </div>
  )
}
