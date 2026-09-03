"use client"

import { useState } from "react"
import { ArrowRight, CalendarRange } from "lucide-react"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { startProgramDay } from "./programmes/actions"

export function ActiveProgramBanner({
  programId,
  programName,
  dayIndex,
  dayName,
}: {
  programId: string
  programName: string
  dayIndex: number
  dayName: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    setLoading(true)
    try {
      await startProgramDay(programId)
    } catch (err) {
      if (isRedirectError(err)) throw err
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 hover:bg-primary/10 active:bg-primary/15 transition-colors w-full text-left disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-fit rounded-xl p-2 shrink-0"
          style={{ background: "linear-gradient(135deg, #3F5EFB, #F50535)" }}
        >
          <CalendarRange className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm">
            {programName} — Jour {dayIndex + 1}
          </p>
          <p className="text-xs text-muted-foreground">{dayName}</p>
        </div>
      </div>
      <span className="flex items-center gap-1 text-sm font-semibold shrink-0" style={{ color: "#3F5EFB" }}>
        {loading ? "…" : "Démarrer"} <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  )
}
