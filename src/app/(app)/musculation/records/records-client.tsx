"use client"

import Link from "next/link"
import type { MuscleGroupRecords } from "./page"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function RecordsClient({ groups }: { groups: MuscleGroupRecords[] }) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-4xl">🏆</p>
        <p className="font-semibold">Aucun record encore</p>
        <p className="text-sm text-muted-foreground">
          Termine une séance avec des poids pour voir tes records ici.
        </p>
        <Link
          href="/musculation"
          className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          Commencer une séance
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.groupName} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {group.groupName}
          </h2>

          <div className="rounded-2xl border overflow-hidden divide-y">
            {group.records.map((record) => (
              <Link
                key={record.exerciseId}
                href={`/musculation/progression/exercices?exercice=${record.exerciseId}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors"
              >
                {/* Image / emoji */}
                <span className="text-xl shrink-0 w-7 text-center">
                  {record.exerciseImage ?? "🏋️"}
                </span>

                {/* Nom */}
                <p className="flex-1 text-sm font-medium truncate">{record.exerciseName}</p>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-orange-500 leading-none">
                    {record.weight} kg
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    × {record.reps} reps · {formatDate(record.date)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
