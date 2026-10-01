"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  buildTimeline,
  computeElapsedMs,
  getState,
  pauseClock,
  resumeClock,
  type Clock,
  type StepInput,
  type TimelineState,
  type WodFormat,
} from "@/lib/cardio/timeline"
import { detectCue, playCue, requestWakeLock, unlockAudio } from "@/lib/cardio/cues"
import { clearLiveState, loadLiveState, saveLiveState } from "@/lib/cardio/live-state"
import { formatClock, formatStepUnit } from "@/lib/cardio/format"
import { MAX_ELAPSED_SECONDS, MAX_EXTRA_REPS, MAX_ROUNDS } from "@/lib/cardio/limits"
import { drainOutbox, getSyncStatus, onOutboxChange, queueSaveCardioSession } from "@/lib/offline/outbox"
import { PhasedView } from "./phased-view"
import { AmrapView } from "./amrap-view"
import { ForTimeView } from "./for-time-view"

export type CardioLiveWod = {
  id: string
  name: string
  image: string | null
  format: WodFormat
  durationMin: number
  steps: StepInput[]
}

type Screen = "loading" | "ready" | "countdown" | "running" | "done" | "saved"
type Finished = { atMs: number; elapsedMs: number }

const FORMAT_LABELS: Record<WodFormat, string> = {
  CIRCUIT: "Circuit",
  AMRAP: "AMRAP",
  EMOM: "EMOM",
  FOR_TIME: "For Time",
}

const GRADIENT = "linear-gradient(to right, #3F5EFB, #F50535)"

function newLocalSessionId(): string {
  return `cardio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function clampInt(value: number, max: number): number {
  return Math.min(max, Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0)))
}

export function CardioLive({ wod }: { wod: CardioLiveWod }) {
  const router = useRouter()
  const timeline = useMemo(() => buildTimeline(wod), [wod])

  const [screen, setScreen] = useState<Screen>("loading")
  const [countdownLeft, setCountdownLeft] = useState(3)
  const [localSessionId, setLocalSessionId] = useState("")
  const [clock, setClock] = useState<Clock | null>(null)
  const [now, setNow] = useState(0)
  const [roundsCompleted, setRoundsCompleted] = useState(0)
  const [checkedSteps, setCheckedSteps] = useState<number[]>([])
  const [finished, setFinished] = useState<Finished | null>(null)
  const [roundsInput, setRoundsInput] = useState(0)
  const [extraReps, setExtraReps] = useState(0)
  const [showQuit, setShowQuit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<{ pendingCount: number; hasFailed: boolean } | null>(null)
  const prevStateRef = useRef<TimelineState | null>(null)

  // Reprise d'une séance en cours (ou terminée mais pas encore enregistrée)
  useEffect(() => {
    const snapshot = loadLiveState(wod.id)
    if (snapshot) {
      setLocalSessionId(snapshot.localSessionId)
      setClock({
        startedAtMs: snapshot.startedAtMs,
        pausedAtMs: snapshot.pausedAtMs,
        pausedTotalMs: snapshot.pausedTotalMs,
      })
      setRoundsCompleted(snapshot.roundsCompleted)
      setRoundsInput(snapshot.roundsCompleted)
      setCheckedSteps(snapshot.checkedSteps)
      setNow(Date.now())
      if (snapshot.finished) {
        setFinished(snapshot.finished)
        setScreen("done")
      } else {
        setScreen("running")
      }
    } else {
      setScreen("ready")
    }
    void drainOutbox()
  }, [wod.id])

  // Sauvegarde de l'état local à chaque changement
  useEffect(() => {
    if ((screen !== "running" && screen !== "done") || !clock) return
    saveLiveState(wod.id, {
      localSessionId,
      startedAtMs: clock.startedAtMs,
      pausedAtMs: clock.pausedAtMs,
      pausedTotalMs: clock.pausedTotalMs,
      roundsCompleted,
      checkedSteps,
      finished,
    })
  }, [screen, clock, localSessionId, roundsCompleted, checkedSteps, finished, wod.id])

  // Décompte 3-2-1 avant le départ
  useEffect(() => {
    if (screen !== "countdown") return
    if (countdownLeft <= 0) {
      playCue("phase")
      const startedAtMs = Date.now()
      setClock({ startedAtMs, pausedAtMs: null, pausedTotalMs: 0 })
      setLocalSessionId(newLocalSessionId())
      setRoundsCompleted(0)
      setCheckedSteps([])
      setFinished(null)
      setNow(startedAtMs)
      prevStateRef.current = null
      setScreen("running")
      return
    }
    playCue("tick")
    const id = window.setTimeout(() => setCountdownLeft((n) => n - 1), 1000)
    return () => window.clearTimeout(id)
  }, [screen, countdownLeft])

  // Horloge d'affichage (l'état se déduit toujours de l'heure, pas de ce compteur)
  useEffect(() => {
    if (screen !== "running") return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [screen])

  const elapsedMs = clock ? computeElapsedMs(clock, now) : 0
  const state = useMemo(() => getState(timeline, elapsedMs), [timeline, elapsedMs])
  const paused = clock !== null && clock.pausedAtMs !== null

  const finishSession = useCallback(
    (result: Finished) => {
      setFinished(result)
      setRoundsInput(roundsCompleted)
      setScreen("done")
    },
    [roundsCompleted]
  )

  // Signaux sonores et fin automatique (Circuit, EMOM, AMRAP)
  useEffect(() => {
    if (screen !== "running" || !clock) return
    const cue = detectCue(prevStateRef.current, state)
    prevStateRef.current = state
    if (cue && !paused) playCue(cue)
    if (state.kind !== "stopwatch" && state.finished && timeline.kind !== "stopwatch") {
      finishSession({
        atMs: clock.startedAtMs + clock.pausedTotalMs + timeline.totalMs,
        elapsedMs: timeline.totalMs,
      })
    }
  }, [state, screen, clock, paused, timeline, finishSession])

  // Écran maintenu allumé pendant la séance
  useEffect(() => {
    if (screen !== "running") return
    let release: (() => void) | null = null
    let cancelled = false
    const acquire = async () => {
      const next = await requestWakeLock()
      if (cancelled) {
        next?.()
        return
      }
      release?.()
      release = next
    }
    void acquire()
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
      release?.()
    }
  }, [screen])

  // Statut de synchronisation une fois le résultat enregistré
  useEffect(() => {
    if (screen !== "saved" || !localSessionId) return
    let mounted = true
    const refresh = () => {
      void getSyncStatus(localSessionId).then((status) => {
        if (mounted) setSyncStatus(status)
      })
    }
    refresh()
    const unsubscribe = onOutboxChange(refresh)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [screen, localSessionId])

  function startCountdown() {
    unlockAudio()
    setCountdownLeft(3)
    setScreen("countdown")
  }

  function togglePause() {
    unlockAudio()
    if (!clock) return
    const t = Date.now()
    setClock(clock.pausedAtMs === null ? pauseClock(clock, t) : resumeClock(clock, t))
    setNow(t)
  }

  function finishStopwatch() {
    unlockAudio()
    if (!clock) return
    const t = Date.now()
    finishSession({ atMs: t, elapsedMs: computeElapsedMs(clock, t) })
  }

  function addRound() {
    unlockAudio()
    setRoundsCompleted((n) => n + 1)
  }

  function removeRound() {
    unlockAudio()
    setRoundsCompleted((n) => Math.max(0, n - 1))
  }

  function toggleStep(stepIndex: number) {
    unlockAudio()
    setCheckedSteps((steps) =>
      steps.includes(stepIndex) ? steps.filter((s) => s !== stepIndex) : [...steps, stepIndex]
    )
  }

  function confirmQuit() {
    clearLiveState(wod.id)
    setShowQuit(false)
    setScreen("ready")
    router.push(`/cardio/${wod.id}`)
  }

  async function save() {
    if (!clock || !finished || saving) return
    const elapsedSeconds = Math.max(1, Math.round(finished.elapsedMs / 1000))
    if (elapsedSeconds > MAX_ELAPSED_SECONDS) {
      setSaveError("Durée trop longue pour être enregistrée (6 h maximum). Abandonne cette séance.")
      return
    }
    setSaving(true)
    setSaveError(null)
    const isAmrap = wod.format === "AMRAP"
    try {
      await queueSaveCardioSession(localSessionId, {
        programId: wod.id,
        startedAt: new Date(clock.startedAtMs).toISOString(),
        completedAt: new Date(finished.atMs).toISOString(),
        elapsedSeconds,
        roundsCompleted: isAmrap ? clampInt(roundsInput, MAX_ROUNDS) : null,
        extraReps: isAmrap ? clampInt(extraReps, MAX_EXTRA_REPS) : null,
      })
      clearLiveState(wod.id)
      setScreen("saved")
    } catch (err) {
      console.error("[cardio:save]", err)
      setSaveError("Impossible d'enregistrer le résultat sur cet appareil. Réessaie.")
    } finally {
      setSaving(false)
    }
  }

  if (screen === "loading") {
    return <p className="py-20 text-center text-sm text-muted-foreground">Chargement…</p>
  }

  const syncMessage =
    syncStatus === null
      ? "Enregistrement…"
      : syncStatus.hasFailed
        ? "⚠️ Synchronisation bloquée — reconnecte-toi. Ton résultat est gardé sur cet appareil."
        : syncStatus.pendingCount > 0
          ? "⏳ Résultat gardé sur cet appareil, en attente de synchro."
          : "✅ Séance enregistrée."

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">{wod.image ?? "🔥"}</span>
        <div>
          <h1 className="text-xl font-bold leading-tight">{wod.name}</h1>
          <p className="text-xs text-muted-foreground">{FORMAT_LABELS[wod.format]}</p>
        </div>
      </div>

      {screen === "ready" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {timeline.kind === "stopwatch"
              ? "Sans limite de temps : le chrono s'arrête quand tu termines."
              : `Durée : ${formatClock(timeline.totalMs, "down")}`}
          </p>
          <div className="space-y-2">
            {wod.steps.map((step) => (
              <div
                key={step.order}
                className="flex items-center gap-3 rounded-xl border bg-background/80 backdrop-blur-sm px-4 py-3"
              >
                <span className="text-2xl" aria-hidden="true">{step.image ?? "🔥"}</span>
                <p className="flex-1 text-sm font-medium">{step.name}</p>
                <p className="text-sm font-semibold tabular-nums">{formatStepUnit(step)}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={startCountdown}
            className="w-full rounded-2xl py-5 text-xl font-bold text-white"
            style={{ background: GRADIENT }}
          >
            Démarrer
          </button>
          <Link
            href={`/cardio/${wod.id}`}
            className="block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour au WOD
          </Link>
        </div>
      )}

      {screen === "countdown" && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <span role="timer" className="text-9xl font-mono font-bold tabular-nums">
            {countdownLeft > 0 ? countdownLeft : "GO"}
          </span>
        </div>
      )}

      {screen === "running" && (
        <>
          {state.kind === "phased" && timeline.kind === "phased" && (
            <PhasedView state={state} timeline={timeline} />
          )}
          {state.kind === "countdown" && timeline.kind === "countdown" && (
            <AmrapView
              state={state}
              timeline={timeline}
              roundsCompleted={roundsCompleted}
              onAddRound={addRound}
              onRemoveRound={removeRound}
            />
          )}
          {state.kind === "stopwatch" && timeline.kind === "stopwatch" && (
            <ForTimeView
              state={state}
              timeline={timeline}
              checkedSteps={checkedSteps}
              onToggleStep={toggleStep}
            />
          )}

          {paused && (
            <p className="text-center text-sm font-semibold text-amber-500">En pause</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={togglePause}
              className="rounded-2xl border py-3 text-sm font-semibold"
            >
              {paused ? "Reprendre" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => setShowQuit(true)}
              className="rounded-2xl border border-red-500/40 py-3 text-sm font-semibold text-red-500"
            >
              Quitter
            </button>
          </div>

          {wod.format === "FOR_TIME" && (
            <button
              type="button"
              onClick={finishStopwatch}
              className="w-full rounded-2xl py-4 text-lg font-bold text-white"
              style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)" }}
            >
              🏁 Terminé
            </button>
          )}
        </>
      )}

      {screen === "done" && finished && (
        <div className="space-y-4 rounded-2xl border bg-background/80 backdrop-blur-sm p-5">
          <p className="text-center text-xl font-bold">🎉 Séance terminée !</p>
          <p className="text-center text-4xl font-mono font-bold tabular-nums">
            {formatClock(finished.elapsedMs, "up")}
          </p>

          {wod.format === "AMRAP" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs text-muted-foreground">
                Tours terminés
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_ROUNDS}
                  value={roundsInput}
                  onChange={(e) => setRoundsInput(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold text-foreground"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Reps en plus
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_EXTRA_REPS}
                  value={extraReps}
                  onChange={(e) => setExtraReps(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-center text-lg font-bold text-foreground"
                />
              </label>
            </div>
          )}

          {saveError && (
            <p role="alert" className="text-center text-sm text-red-500">{saveError}</p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded-2xl py-4 text-lg font-bold text-white disabled:opacity-60"
            style={{ background: GRADIENT }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={() => setShowQuit(true)}
            className="w-full text-center text-xs text-muted-foreground underline"
          >
            Abandonner sans enregistrer
          </button>
        </div>
      )}

      {screen === "saved" && (
        <div className="space-y-4 rounded-2xl border bg-background/80 backdrop-blur-sm p-5 text-center">
          <p className="text-xl font-bold">Bravo !</p>
          <p className="text-sm text-muted-foreground">{syncMessage}</p>
          <Link
            href={`/cardio/${wod.id}`}
            className="block w-full rounded-2xl py-4 text-lg font-bold text-white"
            style={{ background: GRADIENT }}
          >
            Retour au WOD
          </Link>
        </div>
      )}

      {showQuit && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => setShowQuit(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quit-title"
            className="w-full max-w-sm space-y-4 rounded-2xl bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h2 id="quit-title" className="text-lg font-bold">Quitter la séance ?</h2>
              <p className="text-sm text-muted-foreground">
                Ta séance en cours sera perdue, rien ne sera enregistré.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowQuit(false)}
                className="flex-1 rounded-xl border py-2.5 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmQuit}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ background: GRADIENT }}
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
