"use client"

import { useState, useEffect, useRef } from "react"
import { startWorkout, completeSet } from "../../actions"
import type { Workout, WorkoutExercise, Exercise, MuscleGroup } from "@/generated/prisma/client"

type ExerciseWithRelations = WorkoutExercise & {
  exercise: Exercise & { muscleGroup: MuscleGroup }
}

type WorkoutWithExercises = Workout & {
  exercises: ExerciseWithRelations[]
}

export function WorkoutLive({ workout }: { workout: WorkoutWithExercises }) {
  const [started, setStarted] = useState(workout.status === "EN_COURS")
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [completedSetsMap, setCompletedSetsMap] = useState<Record<string, number>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, we.completedSets]))
  )
  const [repsMap, setRepsMap] = useState<Record<string, number>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, we.reps]))
  )
  const [weightMap, setWeightMap] = useState<Record<string, number | null>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, we.weight]))
  )
  const [validating, setValidating] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!started) return
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [started])

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const current = workout.exercises[exerciseIndex]
  const totalExercises = workout.exercises.length
  const isLast = exerciseIndex === totalExercises - 1

  async function handleStart() {
    await startWorkout(workout.id)
    setStarted(true)
  }

  function handleNext() {
    if (!isLast) setExerciseIndex((i) => i + 1)
  }

  function handlePrev() {
    if (exerciseIndex > 0) setExerciseIndex((i) => i - 1)
  }

  async function handleCompleteSet() {
    if (validating) return
    const done = completedSetsMap[current.id] ?? 0
    if (done >= current.sets) return
    setValidating(true)
    try {
      await completeSet(current.id)
      setCompletedSetsMap((prev) => ({ ...prev, [current.id]: done + 1 }))
    } finally {
      setValidating(false)
    }
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h1 className="text-2xl font-bold text-center">{workout.name}</h1>
        <p className="text-muted-foreground">{totalExercises} exercice{totalExercises > 1 ? "s" : ""}</p>
        <button
          onClick={handleStart}
          className="w-full max-w-sm rounded-2xl py-5 text-xl font-bold text-white"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          Démarrer la séance
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      {/* Header : progression */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
        <span>Exercice {exerciseIndex + 1} / {totalExercises}</span>
        <span className="font-mono font-bold text-base text-foreground">⏱ {formatTime(elapsedSeconds)}</span>
      </div>

      {/* Exercice actif */}
      <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-6 space-y-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {current.exercise.muscleGroup.name}
        </p>
        <h2 className="text-2xl font-bold">{current.exercise.name}</h2>
        <p className="text-5xl text-center py-2" aria-hidden="true">
          {current.exercise.image ?? "🏋️"}
        </p>

        {/* Série en cours */}
        <p className="text-center text-sm font-medium text-muted-foreground">
          Série {Math.min((completedSetsMap[current.id] ?? 0) + 1, current.sets)} / {current.sets}
        </p>

        {/* Inputs reps / poids (display-only, aide-mémoire pour l'utilisateur) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Répétitions</label>
            <input
              type="number"
              min={1}
              max={100}
              value={repsMap[current.id]}
              onChange={(e) =>
                setRepsMap((prev) => ({ ...prev, [current.id]: Math.max(1, parseInt(e.target.value) || 1) }))
              }
              className="w-full rounded-xl border bg-background px-3 py-3 text-center text-2xl font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Poids (kg)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={weightMap[current.id] ?? ""}
              placeholder="—"
              onChange={(e) =>
                setWeightMap((prev) => ({
                  ...prev,
                  [current.id]: e.target.value === "" ? null : parseFloat(e.target.value),
                }))
              }
              className="w-full rounded-xl border bg-background px-3 py-3 text-center text-2xl font-bold"
            />
          </div>
        </div>

        {/* Bouton valider */}
        {(completedSetsMap[current.id] ?? 0) < current.sets ? (
          <button
            onClick={handleCompleteSet}
            disabled={validating}
            className="w-full rounded-2xl py-5 text-xl font-bold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
          >
            {validating ? "Enregistrement…" : "✓  Valider la série"}
          </button>
        ) : (
          <div className="w-full rounded-2xl py-4 text-center font-bold text-green-600 bg-green-50 dark:bg-green-900/20">
            Exercice terminé !
          </div>
        )}

        {/* Dots séries */}
        <div className="flex justify-center gap-2 pt-1">
          {Array.from({ length: current.sets }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${
                i < (completedSetsMap[current.id] ?? 0)
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={handlePrev}
          disabled={exerciseIndex === 0}
          className="flex-1 rounded-xl border py-3 font-medium disabled:opacity-30"
        >
          ← Préc.
        </button>
        <button
          onClick={handleNext}
          disabled={isLast}
          className="flex-1 rounded-xl border py-3 font-medium disabled:opacity-30"
        >
          Suiv. →
        </button>
      </div>
    </div>
  )
}
