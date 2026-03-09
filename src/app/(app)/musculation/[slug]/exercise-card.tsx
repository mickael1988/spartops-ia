"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { quickStartWorkout } from "../seance/actions"

type DifficultyKey = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"

const difficultyConfig: Record<DifficultyKey, { label: string; className: string }> = {
  DEBUTANT: { label: "Débutant", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  INTERMEDIAIRE: { label: "Intermédiaire", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  AVANCE: { label: "Avancé", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

type Props = {
  exercise: {
    id: string
    name: string
    description: string
    image: string | null
    equipment: string | null
    difficulty: DifficultyKey
  }
}

export function ExerciseCard({ exercise }: Props) {
  const [loading, setLoading] = useState(false)
  const diff = difficultyConfig[exercise.difficulty] ?? { label: exercise.difficulty, className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" }

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      await quickStartWorkout(exercise.id)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-left w-full rounded-xl transition-transform active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="bg-background/80 backdrop-blur-sm h-full hover:border-primary/50 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-2xl" aria-hidden="true">{exercise.image ?? "🏋️"}</div>
            <Badge className={diff.className}>{diff.label}</Badge>
          </div>
          <CardTitle className="text-base mt-2">{exercise.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{exercise.description}</p>
          {exercise.equipment && (
            <p className="text-xs text-muted-foreground mt-2"><span aria-hidden="true">🔧</span> {exercise.equipment}</p>
          )}
          <p className="text-xs font-medium text-primary mt-3">
            {loading ? "Démarrage…" : "▶ Lancer la séance"}
          </p>
        </CardContent>
      </Card>
    </button>
  )
}
