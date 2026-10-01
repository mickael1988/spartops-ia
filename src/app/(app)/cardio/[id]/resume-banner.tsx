"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { loadLiveState } from "@/lib/cardio/live-state"
import { drainOutbox } from "@/lib/offline/outbox"

type Status = "none" | "running" | "done"

export function ResumeBanner({ programId }: { programId: string }) {
  const [status, setStatus] = useState<Status>("none")

  useEffect(() => {
    const snapshot = loadLiveState(programId)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(snapshot ? (snapshot.finished ? "done" : "running") : "none")
    void drainOutbox()
  }, [programId])

  if (status === "none") return null

  return (
    <Link
      href={`/cardio/${programId}/seance`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10"
    >
      <div>
        <p className="text-sm font-semibold">
          {status === "running" ? "Séance en cours" : "Résultat à enregistrer"}
        </p>
        <p className="text-xs text-muted-foreground">
          {status === "running"
            ? "Reprends là où tu t'es arrêté."
            : "Ta séance est terminée, il reste à l'enregistrer."}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold" style={{ color: "#3F5EFB" }}>
        {status === "running" ? "Reprendre →" : "Ouvrir →"}
      </span>
    </Link>
  )
}
