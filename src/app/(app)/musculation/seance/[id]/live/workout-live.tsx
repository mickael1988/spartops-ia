"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { startWorkout, completeSet, finishWorkout, saveExerciseNote } from "../../actions"
import type { Workout, WorkoutExercise, Exercise, MuscleGroup } from "@/generated/prisma/client"
import type { HistoryEntry, Suggestion } from "./page"

type SetType = "NORMAL" | "WARMUP" | "DROP_SET" | "FAILURE"

const SET_TYPE_ORDER: SetType[] = ["NORMAL", "WARMUP", "DROP_SET", "FAILURE"]

const SET_TYPE_LABELS: Record<SetType, string> = {
  NORMAL: "Normal",
  WARMUP: "Échauff.",
  DROP_SET: "Drop set",
  FAILURE: "À l'échec",
}

const SET_TYPE_COLORS: Record<SetType, string> = {
  NORMAL: "bg-primary/20 border-primary/40 text-primary",
  WARMUP: "bg-amber-500/20 border-amber-500/40 text-amber-500",
  DROP_SET: "bg-purple-500/20 border-purple-500/40 text-purple-400",
  FAILURE: "bg-red-500/20 border-red-500/40 text-red-400",
}

type ExerciseWithRelations = WorkoutExercise & {
  exercise: Exercise & { muscleGroup: MuscleGroup }
}

type WorkoutWithExercises = Workout & {
  exercises: ExerciseWithRelations[]
}

type WorkoutLiveProps = {
  workout: WorkoutWithExercises
  historyByExercise: Record<string, HistoryEntry[]>
  prByExercise: Record<string, number>
  warmupCountByExercise: Record<string, number>
  suggestionByExercise: Record<string, Suggestion>
}

// ─── Suggestion Banner ────────────────────────────────────────────────────────

function SuggestionBanner({ suggestion }: { suggestion: Suggestion | undefined }) {
  if (!suggestion) return null

  const rpeEmoji = suggestion.lastRpe === 1 ? " 😌" : suggestion.lastRpe === 2 ? " 😤" : suggestion.lastRpe === 3 ? " 🔥" : ""

  const config = {
    up:   { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-500",        icon: "↑" },
    hold: { border: "border-[#3F5EFB]/30",    bg: "bg-[#3F5EFB]/10",    text: "text-[#3F5EFB]",          icon: "=" },
    down: { border: "border-amber-500/30",   bg: "bg-amber-500/10",   text: "text-amber-500",          icon: "↓" },
    none: { border: "border-border",         bg: "bg-muted/30",       text: "text-muted-foreground",   icon: "—" },
  }[suggestion.direction]

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} px-3 py-2 mb-2 flex items-center justify-between gap-2`}>
      <p className="text-[10px] text-muted-foreground leading-snug">
        Dernière fois :{" "}
        <strong className="text-foreground">
          {suggestion.lastWeight} kg × {suggestion.lastReps} reps
        </strong>
        {rpeEmoji}
        {suggestion.direction !== "none" && (
          <>
            <br />Objectif aujourd&apos;hui
          </>
        )}
      </p>
      {suggestion.direction !== "none" && (
        <span className={`text-sm font-bold ${config.text} whitespace-nowrap shrink-0`}>
          {config.icon} {suggestion.suggestedWeight} kg × {suggestion.suggestedReps}
        </span>
      )}
    </div>
  )
}

// ─── Exercise History ──────────────────────────────────────────────────────────

function ExerciseHistory({ history, currentPR }: { history: HistoryEntry[]; currentPR: number }) {
  const [open, setOpen] = useState(false)

  if (history.length === 0) return null

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full cursor-pointer bg-gradient-to-r from-primary/10 to-primary/5 border-l-[3px] border-primary rounded-r-lg px-3 py-2 flex items-center justify-between transition-colors active:from-primary/20"
      >
        <span className="text-xs font-semibold text-primary/80">📋 Voir mes sessions précédentes</span>
        <span className="text-primary text-sm">{open ? "∧" : "∨"}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {history.map((entry, i) => {
            const isPR = currentPR > 0 && entry.maxWeight >= currentPR
            const delta = i < history.length - 1 ? entry.maxWeight - history[i + 1].maxWeight : null
            return (
              <div
                key={`${entry.date}-${entry.maxWeight}`}
                className="flex items-center justify-between bg-background rounded-lg px-3 py-2 text-xs border border-border"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">
                    {entry.maxWeight > 0 ? `${entry.maxWeight} kg` : "—"} × {entry.totalReps} reps × {entry.sets} séries
                  </span>
                  <span className="text-muted-foreground">{entry.date}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isPR && (
                    <span className="bg-amber-500/20 border border-amber-500/40 text-amber-500 rounded px-1.5 py-0.5 text-[9px] font-bold">
                      🏆 PR
                    </span>
                  )}
                  {delta !== null && delta !== 0 && (
                    <span className={delta > 0 ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
                      {delta > 0 ? `+${delta}` : `${delta}`} kg
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
          {/* Bouton -15s */}
          <button
            onClick={onSubtract}
            disabled={remaining <= 15}
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted active:bg-muted transition-colors disabled:opacity-40"
          >
            −15s
          </button>

          {/* Cercle SVG */}
          <div className="relative flex items-center justify-center">
            <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE}
                className="text-muted/40"
              />
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
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
              />
            </svg>
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
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted active:bg-muted transition-colors"
          >
            +15s
          </button>
        </div>

        <button
          onClick={onSkip}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted active:bg-muted transition-colors border"
        >
          Passer
        </button>
      </div>
    </div>
  )
}

// ─── Quit Dialog ────────────────────────────────────────────────────────────────

function QuitDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  // Fermeture au clavier (Escape)
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel() }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quit-dialog-title"
        aria-describedby="quit-dialog-desc"
        className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h2 id="quit-dialog-title" className="text-lg font-bold">Quitter la séance ?</h2>
          <p id="quit-dialog-desc" className="text-sm text-muted-foreground">
            Ton avancement est sauvegardé. Tu pourras reprendre là où tu t&apos;es arrêté.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border py-2.5 text-sm font-semibold hover:bg-muted active:bg-muted transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
            style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
          >
            Quitter
          </button>
        </div>
      </div>
    </div>
  )
}

export function WorkoutLive({ workout, historyByExercise, prByExercise, warmupCountByExercise, suggestionByExercise }: WorkoutLiveProps) {
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
  const [typeMap, setTypeMap] = useState<Record<string, SetType>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, "NORMAL" as SetType]))
  )
  const [warmupSetsMap, setWarmupSetsMap] = useState<Record<string, number>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, warmupCountByExercise[we.id] ?? 0]))
  )
  const [noteMap, setNoteMap] = useState<Record<string, string>>(
    Object.fromEntries(workout.exercises.map((we) => [we.id, we.note ?? ""]))
  )
  const [pendingRpe, setPendingRpe] = useState<{
    we: ExerciseWithRelations
    reps: number
    weight: number | null
    setType: SetType
  } | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [restActive, setRestActive] = useState(false)
  const [restRemaining, setRestRemaining] = useState(0)
  const [restForId, setRestForId] = useState<string | null>(null)
  const [restTotal, setRestTotal] = useState(0)
  const [restExerciseName, setRestExerciseName] = useState("")
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const exerciseRefs = useRef<(HTMLDivElement | null)[]>([])
  const router = useRouter()
  const [showQuitDialog, setShowQuitDialog] = useState(false)
  const handleCancelQuit = useCallback(() => setShowQuitDialog(false), [])

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
      // Flush all pending notes before finishing
      await Promise.all(
        workout.exercises.map((we) => {
          const note = noteMap[we.id] ?? ""
          const original = we.note ?? ""
          if (note === original) return Promise.resolve()
          return saveExerciseNote(we.id, note).catch(() => {})
        })
      )
      await finishWorkout(workout.id)
      router.push(`/musculation/seance/${workout.id}`)
    } catch {
      setFinishing(false)
    }
  }

  async function handleCompleteSet(we: ExerciseWithRelations) {
    if (validatingId || pendingRpe) return
    const done = completedSetsMap[we.id] ?? 0
    const totalSets = setsMap[we.id] ?? we.sets
    if (done >= totalSets) return

    const reps = repsMap[we.id] ?? we.reps
    const weight = weightMap[we.id] ?? null
    const setType = typeMap[we.id] ?? "NORMAL"

    setPendingRpe({ we, reps, weight, setType })
  }

  async function handleConfirmSet(rpe: number | null) {
    if (!pendingRpe || validatingId) return
    const { we, reps, weight, setType } = pendingRpe
    const done = completedSetsMap[we.id] ?? 0

    setPendingRpe(null)
    setValidatingId(we.id)
    try {
      await completeSet(we.id, reps, weight, setType, rpe)
      setCompletedSetsMap((prev) => ({ ...prev, [we.id]: done + 1 }))
      if (setType === "WARMUP") {
        setWarmupSetsMap((prev) => ({ ...prev, [we.id]: (prev[we.id] ?? 0) + 1 }))
      }
      setTypeMap((prev) => ({ ...prev, [we.id]: "NORMAL" }))
      startRest(we.restSeconds, we.id)
    } finally {
      setValidatingId(null)
    }
  }

  // Derived stats variables for end-of-session display
  const totalSets = Object.values(completedSetsMap).reduce((a, b) => a + b, 0)

  const totalVolume = Math.round(
    workout.exercises.reduce((acc, we) => {
      const weight = weightMap[we.id] ?? 0
      const reps = repsMap[we.id] ?? we.reps
      const total = completedSetsMap[we.id] ?? 0
      const warmup = warmupSetsMap[we.id] ?? 0
      return acc + weight * reps * (total - warmup)
    }, 0)
  )

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
    <div className={`space-y-4 max-w-lg mx-auto transition-all ${restActive ? "pb-56" : "pb-24"}`}>
      {/* Header sticky */}
      <div className="sticky top-0 z-10 grid grid-cols-3 items-center py-3 bg-background/80 backdrop-blur-sm text-sm text-muted-foreground">
        <button
          onClick={() => setShowQuitDialog(true)}
          aria-label="Quitter la séance"
          className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors justify-self-start"
        >
          ✕ Quitter
        </button>
        <span className="text-center">
          {allDone
            ? "✅ Tous les exercices terminés"
            : `Exercice ${activeIndex + 1} / ${workout.exercises.length}`}
        </span>
        <span className="font-mono font-bold text-base text-foreground justify-self-end">
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
              <SuggestionBanner suggestion={suggestionByExercise[we.id]} />
            )}

            {/* Note exercice — visible pour tout exercice non terminé */}
            {!isCompleted && (
              <textarea
                value={noteMap[we.id] ?? ""}
                onChange={(e) => setNoteMap((prev) => ({ ...prev, [we.id]: e.target.value }))}
                onBlur={async () => {
                  try {
                    await saveExerciseNote(we.id, noteMap[we.id] ?? "")
                  } catch {
                    // silent — note is preserved in local state even if server write fails
                  }
                }}
                placeholder="Note sur cet exercice… (optionnel)"
                rows={1}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            )}

            {isActive && (
              <>
                <p className="text-center text-sm font-medium text-muted-foreground">
                  Série {Math.min(done + 1, setsMap[we.id] ?? we.sets)} / {setsMap[we.id] ?? we.sets}
                </p>

                {done < (setsMap[we.id] ?? we.sets) ? (
                  <>
                    {/* Inputs séries + reps + poids pour la série en cours */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
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
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground opacity-0">Type</label>
                        <button
                          onClick={() =>
                            setTypeMap((prev) => {
                              const current = prev[we.id] ?? "NORMAL"
                              const nextIdx = (SET_TYPE_ORDER.indexOf(current) + 1) % SET_TYPE_ORDER.length
                              return { ...prev, [we.id]: SET_TYPE_ORDER[nextIdx] }
                            })
                          }
                          className={`rounded-xl border px-2 py-2 text-[10px] font-bold transition-colors leading-tight text-center whitespace-normal w-14 ${SET_TYPE_COLORS[typeMap[we.id] ?? "NORMAL"]}`}
                        >
                          {SET_TYPE_LABELS[typeMap[we.id] ?? "NORMAL"]}
                        </button>
                      </div>
                    </div>
                    {pendingRpe?.we.id === we.id ? (
                      <div className="flex items-center justify-between bg-muted/50 border border-border rounded-xl px-4 py-2.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Ressenti série {(completedSetsMap[we.id] ?? 0) + 1} ?
                        </span>
                        <div className="flex items-center gap-3">
                          {([{ emoji: "😌", value: 1 }, { emoji: "😤", value: 2 }, { emoji: "🔥", value: 3 }] as const).map(
                            ({ emoji, value }) => (
                              <button
                                key={value}
                                onClick={() => handleConfirmSet(value)}
                                disabled={validatingId === we.id}
                                className="text-xl active:scale-125 transition-transform disabled:opacity-40"
                              >
                                {emoji}
                              </button>
                            )
                          )}
                          <button
                            onClick={() => handleConfirmSet(null)}
                            disabled={validatingId === we.id}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1 disabled:opacity-40"
                          >
                            Passer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCompleteSet(we)}
                        disabled={!!validatingId || !!pendingRpe}
                        className="w-full rounded-2xl py-4 text-lg font-bold text-white disabled:opacity-60"
                        style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
                      >
                        {validatingId === we.id ? "Enregistrement…" : "✓ Valider la série"}
                      </button>
                    )}
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

                {(weightMap[we.id] ?? 0) > 0 &&
                  (weightMap[we.id] ?? 0) > (prByExercise[we.exerciseId] ?? 0) && (
                  <div className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-l-[3px] border-amber-500 rounded-r-lg px-3 py-2 flex items-center gap-3">
                    <span className="text-xl shrink-0">🏆</span>
                    <div>
                      <p className="text-xs font-bold text-amber-500">Nouveau record personnel !</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">
                        {weightMap[we.id]} kg dépasse votre PR de {prByExercise[we.exerciseId]} kg
                      </p>
                    </div>
                  </div>
                )}

                <ExerciseHistory history={historyByExercise[we.exerciseId] ?? []} currentPR={prByExercise[we.exerciseId] ?? 0} />

              </>
            )}
          </div>
        )
      })}

      <QuitDialog
        open={showQuitDialog}
        onCancel={handleCancelQuit}
        onConfirm={() => { stopRest(); router.push("/musculation") }}
      />

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

      {/* Bloc fin de séance — visible quand tout est fait */}
      {allDone && (
        <div className="rounded-2xl border p-5 space-y-4 bg-background/80 backdrop-blur-sm">
          <p className="text-center text-xl font-bold">🎉 Séance terminée !</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border p-3 text-center space-y-1">
              <p className="text-lg font-bold font-mono">{formatTime(elapsedSeconds)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Durée</p>
            </div>
            <div className="rounded-xl border p-3 text-center space-y-1">
              <p className="text-lg font-bold">{totalSets}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Séries</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-center space-y-1">
              <p className="text-lg font-bold text-primary">{totalVolume.toLocaleString("fr-FR")}</p>
              <p className="text-[10px] text-primary/60 uppercase tracking-wide">kg soulevés</p>
            </div>
          </div>

          <button
            onClick={handleFinish}
            disabled={finishing}
            className="w-full rounded-2xl py-4 text-lg font-bold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
          >
            {finishing ? "Enregistrement…" : "🏁 Terminer la séance"}
          </button>
        </div>
      )}
    </div>
  )
}
