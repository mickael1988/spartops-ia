"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X, Play, Pencil, CalendarDays, Plus, Loader2 } from "lucide-react"
import { rescheduleWorkout, assignWorkoutToDate } from "./actions"
import type { WorkoutEvent, Template } from "./page"

type Props = {
  open: boolean
  onClose: () => void
  date: Date | null
  events: WorkoutEvent[]
  templates: Template[]
}

const JOURS = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"]
const MOIS  = ["janvier","février","mars","avril","mai","juin",
               "juillet","août","septembre","octobre","novembre","décembre"]

function formatDate(date: Date) {
  return `${JOURS[date.getUTCDay()]} ${date.getUTCDate()} ${MOIS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

function toInputDate(date: Date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function AgendaDrawer({ open, onClose, date, events, templates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [newDate, setNewDate] = useState("")

  const hasEvents = events.length > 0

  function handleReschedule(workoutId: string) {
    if (!newDate) return
    setError(null)
    startTransition(async () => {
      const res = await rescheduleWorkout(workoutId, newDate)
      if (res.error) {
        setError(res.error)
      } else {
        setReschedulingId(null)
        setNewDate("")
        onClose()
      }
    })
  }

  function handleAssign(templateId: string) {
    if (!date) return
    setError(null)
    startTransition(async () => {
      const res = await assignWorkoutToDate(templateId, toInputDate(date))
      if (res.error) {
        setError(res.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panneau latéral */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {date ? formatDate(date) : ""}
            </p>
            <h2 className="text-base font-semibold mt-0.5">
              {hasEvents ? `${events.length} séance${events.length > 1 ? "s" : ""}` : "Aucune séance"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Séances du jour */}
          {hasEvents && events.map(event => (
            <div key={event.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div>
                <p className="font-semibold">{event.name}</p>
                {event.exercises.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.exercises.slice(0, 3).map(e => e.name).join(" · ")}
                    {event.exercises.length === 4 && " · …"}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { onClose(); router.push(`/musculation/seance/${event.id}/live`) }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
                >
                  <Play className="h-3.5 w-3.5" /> Démarrer
                </button>
                <button
                  onClick={() => { onClose(); router.push(`/musculation/seance/${event.id}`) }}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </button>
              </div>

              {/* Reprogrammer */}
              {reschedulingId === event.id ? (
                <div className="flex gap-2 pt-1">
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => handleReschedule(event.id)}
                    disabled={!newDate || isPending}
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    OK
                  </button>
                  <button
                    onClick={() => { setReschedulingId(null); setNewDate("") }}
                    className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setReschedulingId(event.id)
                    setNewDate(toInputDate(new Date(event.scheduledAt)))
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Changer la date
                </button>
              )}
            </div>
          ))}

          {/* Jour vide : planifier depuis templates */}
          {!hasEvents && date && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Planifier une séance pour ce jour :
              </p>

              {templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleAssign(t.id)}
                      disabled={isPending}
                      className="w-full text-left rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:border-primary hover:text-primary transition-colors disabled:opacity-50 flex items-center justify-between"
                    >
                      {t.name}
                      {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Aucun template disponible.
                </p>
              )}

              {/* Créer une nouvelle séance */}
              <button
                onClick={() => {
                  onClose()
                  router.push(`/musculation/seance/nouvelle?date=${toInputDate(date)}`)
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-4 w-4" /> Créer une nouvelle séance
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
