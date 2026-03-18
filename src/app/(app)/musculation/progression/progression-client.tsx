"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TrendingUp, CalendarDays, CheckCircle2, Loader2, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { save1RM, scheduleTest } from "./actions"
import type { ExerciseRecord, OneRepMaxEntry } from "./page"

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

// ─── SVG Line Chart ────────────────────────────────────────────────────────────

function ProgressionChart({ history }: { history: OneRepMaxEntry[] }) {
  const W = 240
  const H = 80
  const PAD = { top: 14, right: 8, bottom: 20, left: 30 }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
        Aucune donnée
      </div>
    )
  }

  const values = history.map(e => e.estimatedMax)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  function xPos(i: number) {
    return PAD.left + (history.length === 1 ? chartW / 2 : (i / (history.length - 1)) * chartW)
  }
  function yPos(v: number) {
    return PAD.top + chartH - ((v - minVal) / range) * chartH
  }

  const points = history.map((e, i) => ({ x: xPos(i), y: yPos(e.estimatedMax) }))
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")

  function shortDate(iso: string) {
    const d = new Date(iso)
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      {/* Y axis labels */}
      <text x={PAD.left - 4} y={PAD.top + 4} fontSize="9" fill="#6b7280" textAnchor="end">
        {maxVal}
      </text>
      {minVal !== maxVal && (
        <text x={PAD.left - 4} y={PAD.top + chartH} fontSize="9" fill="#6b7280" textAnchor="end">
          {minVal}
        </text>
      )}

      {/* Line */}
      {history.length > 1 && (
        <path d={linePath} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
      )}

      {/* Points + value labels + date labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#f97316" />
          <text
            x={p.x}
            y={Math.max(p.y - 5, PAD.top + 4)}
            fontSize="8"
            fill="#f97316"
            textAnchor="middle"
          >
            {history[i].estimatedMax}
          </text>
          <text x={p.x} y={H - 2} fontSize="8" fill="#6b7280" textAnchor="middle">
            {shortDate(history[i].recordedAt)}
          </text>
        </g>
      ))}
    </svg>
  )
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

  return (
    <Card className="bg-background/80 backdrop-blur-sm">
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
          className="flex items-center gap-2 rounded-xl px-8 py-3 text-base font-semibold text-white transition-colors hover:opacity-90"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Terminer
        </Link>
      </div>
    </div>
  )
}
