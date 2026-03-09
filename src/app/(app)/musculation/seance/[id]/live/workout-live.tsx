"use client"

import { useState } from "react"
import { startWorkout } from "../../actions"
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
      </div>

      {/* Exercice actif */}
      <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-6 space-y-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {current.exercise.muscleGroup.name}
        </p>
        <h2 className="text-2xl font-bold">{current.exercise.name}</h2>
        <p className="text-4xl text-center" aria-hidden="true">
          {current.exercise.image ?? "🏋️"}
        </p>
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
