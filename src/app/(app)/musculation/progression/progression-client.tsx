"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TrendingUp, CalendarDays, CheckCircle2, Loader2, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { save1RM, scheduleTest } from "./actions"
import type { ExerciseRecord } from "./page"
import { ProgressionChart } from "./progression-chart"

type Props = {
  exercises: ExerciseRecord[]
  lastEntryDate: string | null
  hasScheduled: boolean
}

// Formule d'Epley : 1RM ≈ poids × (1 + reps / 30)
function calcEpley(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30))
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

const EXERCISE_IMAGES: Record<string, string> = {
  "Squat": "/groups/squat.png",
  "Développé couché": "/groups/developpe-couche.png",
  "Soulevé de terre": "/groups/SDT.png",
}

// ─── Exercise Card ─────────────────────────────────────────────────────────────

function ExerciseCard({ exercise }: { exercise: ExerciseRecord }) {
  const [mode, setMode] = useState<"calculator" | "direct">("calculator")
  const [weight, setWeight] = useState("")
  const [reps, setReps] = useState("")
  const [directMax, setDirectMax] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const bestMax = exercise.bestMax

  const epleyResult =
    mode === "calculator" && weight && reps
      ? calcEpley(parseFloat(weight), parseInt(reps))
      : null

  function handleSave() {
    setError(null)
    let estimatedMax: number
    let inputWeight: number | null = null
    let inputReps: number | null = null

    if (mode === "calculator") {
      const w = parseFloat(weight)
      const r = parseInt(reps)
      if (!weight || !reps || isNaN(w) || isNaN(r)) {
        setError("Renseignez le poids et les répétitions")
        return
      }
      inputWeight = w
      inputReps = r
      estimatedMax = calcEpley(w, r)
    } else {
      const v = parseFloat(directMax)
      if (!directMax || isNaN(v)) {
        setError("Renseignez le 1RM")
        return
      }
      estimatedMax = v
    }

    startTransition(async () => {
      const res = await save1RM(exercise.id, estimatedMax, inputWeight, inputReps, mode === "direct")
      if (res.error) {
        setError(res.error)
      } else {
        setWeight("")
        setReps("")
        setDirectMax("")
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  const image = EXERCISE_IMAGES[exercise.name]

  return (
    <Card className="bg-background/80 backdrop-blur-sm overflow-hidden">
      {/* Image de l'exercice */}
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={exercise.name}
          className="w-full h-auto"
        />
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{exercise.name}</CardTitle>
          <span className="text-xl font-bold text-orange-500 shrink-0">
            {bestMax !== null ? `${bestMax} kg` : "— kg"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Graphique */}
        <ProgressionChart history={exercise.history} />

        {/* Toggle mode */}
        <div className="flex gap-3 text-xs border-b pb-2">
          <button
            onClick={() => setMode("calculator")}
            className={`font-medium transition-colors ${
              mode === "calculator" ? "text-orange-500" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Calculateur Epley
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            onClick={() => setMode("direct")}
            className={`font-medium transition-colors ${
              mode === "direct" ? "text-orange-500" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Saisie directe
          </button>
        </div>

        {/* Formulaire */}
        {mode === "calculator" ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Poids (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="100"
                  min="1"
                  className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Répétitions</label>
                <input
                  type="number"
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                  placeholder="5"
                  min="1"
                  max="30"
                  className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {epleyResult !== null && (
              <p className="text-xs text-muted-foreground">
                1RM estimé :{" "}
                <span className="font-semibold text-orange-500">{epleyResult} kg</span>
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">1RM (kg)</label>
            <input
              type="number"
              value={directMax}
              onChange={e => setDirectMax(e.target.value)}
              placeholder="120"
              min="1"
              className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          style={{ background: saved ? "linear-gradient(to right, #16a34a, #22c55e)" : "linear-gradient(to right, #ea580c, #f97316)" }}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : null}
          {saved ? "Enregistré !" : "Enregistrer"}
        </button>
      </CardContent>
    </Card>
  )
}

// ─── Main client component ─────────────────────────────────────────────────────

export function ProgressionClient({ exercises, lastEntryDate, hasScheduled }: Props) {
  const router = useRouter()
  const [isScheduling, startSchedule] = useTransition()
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const daysSinceLast = lastEntryDate ? daysSince(lastEntryDate) : null
  const needsTest = daysSinceLast === null || daysSinceLast > 30

  function handleSchedule() {
    setScheduleError(null)
    startSchedule(async () => {
      const res = await scheduleTest()
      if (res.error) {
        setScheduleError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Bannière de rappel */}
      <div
        className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${
          needsTest
            ? "bg-orange-500/10 border-orange-500/30"
            : "bg-muted/50 border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <TrendingUp
            className={`h-4 w-4 shrink-0 ${needsTest ? "text-orange-500" : "text-muted-foreground"}`}
          />
          <p className={`text-sm ${needsTest ? "text-orange-500 font-medium" : "text-muted-foreground"}`}>
            {daysSinceLast === null
              ? "Aucun test enregistré — commencez dès maintenant !"
              : `Dernier test il y a ${daysSinceLast} jour${daysSinceLast > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {scheduleError && (
            <p className="text-xs text-destructive">{scheduleError}</p>
          )}
          {hasScheduled ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Déjà planifié
            </div>
          ) : (
            <button
              onClick={handleSchedule}
              disabled={isScheduling}
              className="flex items-center gap-1.5 text-xs font-medium rounded-lg border border-orange-500/40 px-3 py-1.5 text-orange-500 hover:bg-orange-500/10 transition-colors disabled:opacity-50"
            >
              {isScheduling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CalendarDays className="h-3 w-3" />
              )}
              Planifier dans l&apos;agenda
            </button>
          )}
        </div>
      </div>

      {/* 3 cartes exercices */}
      <div className="grid gap-4 md:grid-cols-3">
        {exercises.map(ex => (
          <ExerciseCard key={ex.id} exercise={ex} />
        ))}
      </div>

      {/* Terminer */}
      <div className="flex justify-center pt-2">
        <Link
          href="/musculation"
          className="w-64 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Terminer
        </Link>
      </div>
    </div>
  )
}
