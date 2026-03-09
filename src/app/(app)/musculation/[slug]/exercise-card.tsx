"use client"

import { useCart } from "../cart-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
  const { hasItem, addItem, removeItem } = useCart()
  const inCart = hasItem(exercise.id)
  const diff = difficultyConfig[exercise.difficulty] ?? { label: exercise.difficulty, className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" }

  function handleToggle() {
    if (inCart) {
      removeItem(exercise.id)
    } else {
      addItem({ id: exercise.id, name: exercise.name, image: exercise.image })
    }
  }

  return (
    <Card className={`bg-background/80 backdrop-blur-sm h-full transition-colors ${inCart ? "border-primary" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-2xl" aria-hidden="true">{exercise.image ?? "🏋️"}</div>
          <Badge className={diff.className}>{diff.label}</Badge>
        </div>
        <CardTitle className="text-base mt-2">{exercise.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{exercise.description}</p>
        {exercise.equipment && (
          <p className="text-xs text-muted-foreground"><span aria-hidden="true">🔧</span> {exercise.equipment}</p>
        )}
        <button
          onClick={handleToggle}
          className={`w-full rounded-xl py-2 text-sm font-semibold transition-colors ${
            inCart
              ? "bg-primary/10 text-primary border border-primary"
              : "border hover:border-primary hover:text-primary"
          }`}
        >
          {inCart ? "✅ Dans la séance — Retirer" : "+ Ajouter à la séance"}
        </button>
      </CardContent>
    </Card>
  )
}
