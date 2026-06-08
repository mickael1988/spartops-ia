"use client"

import { useState } from "react"
import { startFromTemplate } from "../seance/actions"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export function StartButton({ templateId }: { templateId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    if (loading) return
    setLoading(true)
    try {
      await startFromTemplate(templateId)
    } catch (err) {
      if (isRedirectError(err)) throw err
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60 shrink-0"
      style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
    >
      {loading ? "…" : "▶ Démarrer"}
    </button>
  )
}
