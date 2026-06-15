"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ProgressionChart } from "../progression-chart"
import type { ExerciseProgressionRecord } from "./page"

type Props = {
  exercises: ExerciseProgressionRecord[]
  filteredExerciseId: string | null
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ exerciseName }: { exerciseName?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
      <Link href="/musculation" className="hover:text-foreground transition-colors">Musculation</Link>
      <ChevronRight className="h-4 w-4" />
      <Link href="/musculation/progression" className="hover:text-foreground transition-colors">Progression 1RM</Link>
      <ChevronRight className="h-4 w-4" />
      {exerciseName ? (
        <>
          <Link href="/musculation/progression/exercices" className="hover:text-foreground transition-colors">
            Tous les exercices
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{exerciseName}</span>
        </>
      ) : (
        <span className="text-foreground font-medium">Tous les exercices</span>
      )}
    </nav>
  )
}

// ─── Mode détail ──────────────────────────────────────────────────────────────

function DetailView({ exercise }: { exercise: ExerciseProgressionRecord }) {
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <Breadcrumb exerciseName={exercise.name} />

      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{exercise.muscleGroupName}</p>
        <h1 className="text-2xl font-bold">{exercise.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Meilleur 1RM estimé : <span className="font-bold text-orange-500">{exercise.bestMax} kg</span>
        </p>
      </div>

      <Card className="bg-background/80 backdrop-blur-sm">
        <CardContent className="pt-4">
          <div className="w-full" style={{ aspectRatio: "400/120" }}>
            <ProgressionChart history={exercise.history} />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">1RM estimé</th>
            </tr>
          </thead>
          <tbody>
            {[...exercise.history].reverse().map((entry, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2 text-muted-foreground">{formatDate(entry.recordedAt)}</td>
                <td className="px-4 py-2 text-right font-semibold text-orange-500">{entry.estimatedMax} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        href="/musculation/progression/exercices"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Retour à tous les exercices
      </Link>
    </div>
  )
}

// ─── Mode liste ───────────────────────────────────────────────────────────────

function ListView({ exercises }: { exercises: ExerciseProgressionRecord[] }) {
  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-muted-foreground text-sm">
          Complète au moins 2 séances d&apos;un même exercice pour voir ta progression ici.
        </p>
        <Link
          href="/musculation"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          Commencer une séance
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {exercises.map(ex => (
        <Link
          key={ex.id}
          href={`/musculation/progression/exercices?exercice=${ex.id}`}
          className="block"
        >
          <Card className="bg-background/80 backdrop-blur-sm h-full hover:border-primary/50 transition-colors">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{ex.muscleGroupName}</p>
                  <p className="font-semibold truncate">{ex.name}</p>
                </div>
                <span className="text-lg font-bold text-orange-500 shrink-0">{ex.bestMax} kg</span>
              </div>
              <ProgressionChart history={ex.history} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function ExercicesProgressionClient({ exercises, filteredExerciseId }: Props) {
  if (filteredExerciseId !== null) {
    const exercise = exercises[0] ?? null

    if (!exercise) {
      return (
        <div className="space-y-6">
          <Breadcrumb />
          <p className="text-sm text-muted-foreground">
            Pas encore assez de données pour afficher une progression. Complète au moins 2 séances de cet exercice.
          </p>
          <Link
            href="/musculation/progression/exercices"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Retour
          </Link>
        </div>
      )
    }

    return <DetailView exercise={exercise} />
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div>
        <h1 className="text-3xl font-bold">Tous mes exercices</h1>
        <p className="text-muted-foreground mt-1">Évolution du 1RM estimé depuis tes séances</p>
      </div>
      <ListView exercises={exercises} />
    </div>
  )
}
