"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { createExercise } from "../actions"

type MuscleGroup = { id: string; name: string; slug: string }

const DIFFICULTIES = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
] as const

export function ExerciseForm({ muscleGroups }: { muscleGroups: MuscleGroup[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [muscleGroupId, setMuscleGroupId] = useState("")
  const [difficulty, setDifficulty] = useState<"DEBUTANT" | "INTERMEDIAIRE" | "AVANCE">("DEBUTANT")
  const [equipment, setEquipment] = useState("")
  const [defaultReps, setDefaultReps] = useState<string>("10")
  const [defaultRestSeconds, setDefaultRestSeconds] = useState<string>("60")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createExercise({
        name,
        description,
        muscleGroupId,
        difficulty,
        equipment,
        defaultReps: defaultReps ? parseInt(defaultReps) : null,
        defaultRestSeconds: defaultRestSeconds ? parseInt(defaultRestSeconds) : null,
      })
      if (result?.error) setError(result.error)
      // Si pas d'erreur, la server action redirige automatiquement
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <Card>
        <CardContent className="pt-6 space-y-5">

          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom de l&apos;exercice <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              placeholder="ex : Curl barre EZ"
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Groupe musculaire */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Groupe musculaire <span className="text-destructive">*</span></label>
            <select
              value={muscleGroupId}
              onChange={(e) => setMuscleGroupId(e.target.value)}
              required
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choisir un groupe…</option>
              {muscleGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Difficulté */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Difficulté <span className="text-destructive">*</span></label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    difficulty === d.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Décrivez l'exercice, le mouvement, les muscles ciblés…"
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Équipement */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Équipement <span className="text-muted-foreground text-xs">(optionnel)</span></label>
            <input
              type="text"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="ex : Barre, haltères, machine…"
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Répétitions & Repos par défaut */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reps par défaut</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={defaultReps}
                  onChange={(e) => setDefaultReps(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">rép</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Repos par défaut</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={defaultRestSeconds}
                  onChange={(e) => setDefaultRestSeconds(e.target.value)}
                  placeholder="60"
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">sec</span>
              </div>
            </div>
          </div>

          {/* Feedback erreur */}
          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-xl border py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Création…" : "Créer l'exercice"}
            </button>
          </div>

        </CardContent>
      </Card>
    </form>
  )
}
