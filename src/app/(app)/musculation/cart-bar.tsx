"use client"

import { useState } from "react"
import { useCart } from "./cart-context"
import { buildAndStartWorkout } from "./seance/actions"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export function CartBar() {
  const { items, clear } = useCart()
  const [loading, setLoading] = useState(false)

  if (items.length === 0) return null

  async function handleStart() {
    if (loading) return
    setLoading(true)
    try {
      await buildAndStartWorkout(items.map((i) => i.id))
    } catch (err) {
      if (isRedirectError(err)) throw err
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <span className="flex-1 text-sm font-medium">
          🏋️ {items.length} exercice{items.length > 1 ? "s" : ""}
        </span>
        <button
          onClick={clear}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border disabled:opacity-60"
        >
          × Vider
        </button>
        <button
          onClick={handleStart}
          disabled={loading}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          {loading ? "Démarrage…" : "▶ Démarrer"}
        </button>
      </div>
    </div>
  )
}
