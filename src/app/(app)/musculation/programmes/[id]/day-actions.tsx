"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { activateProgram, startProgramDay, deleteProgram } from "../actions"

export function DayActions({
  programId,
  isActive,
  currentDayIndex,
}: {
  programId: string
  isActive: boolean
  currentDayIndex: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleActivate() {
    setLoading(true)
    try {
      await activateProgram(programId)
      router.refresh()
    } catch {
      setLoading(false)
    }
  }

  async function handleStart() {
    setLoading(true)
    try {
      await startProgramDay(programId)
    } catch (err) {
      if (isRedirectError(err)) throw err
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce programme ?")) return
    setLoading(true)
    try {
      await deleteProgram(programId)
      router.push("/musculation/programmes")
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {isActive ? (
        <Button
          className="border-0 text-white"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
          onClick={handleStart}
          disabled={loading || currentDayIndex < 0}
        >
          {loading ? "…" : `Démarrer le jour ${currentDayIndex + 1}`}
        </Button>
      ) : (
        <Button variant="outline" onClick={handleActivate} disabled={loading}>
          {loading ? "…" : "Activer ce programme"}
        </Button>
      )}
      <Button
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={loading}
      >
        Supprimer
      </Button>
    </div>
  )
}
