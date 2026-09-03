"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { createProgram } from "../actions"

type Template = { id: string; name: string }

export function ProgramForm({ templates }: { templates: Template[] }) {
  const [name, setName] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function moveUp(index: number) {
    if (index === 0) return
    setSelectedIds((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    setSelectedIds((prev) => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  async function handleSubmit() {
    setError("")
    if (!name.trim()) {
      setError("Le nom du programme est requis.")
      return
    }
    if (selectedIds.length === 0) {
      setError("Ajoutez au moins un jour au programme.")
      return
    }
    setLoading(true)
    try {
      await createProgram({ name, workoutIds: selectedIds })
    } catch (err) {
      if (isRedirectError(err)) throw err
      setError("Une erreur est survenue. Réessayez.")
      setLoading(false)
    }
  }

  if (templates.length === 0) {
    return (
      <p className="text-muted-foreground">
        Créez d&apos;abord une séance pour pouvoir composer un programme.
      </p>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Nom du programme</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Ex : Push Pull Legs"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Séances disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(t.id)}
                onChange={() => toggle(t.id)}
                className="h-4 w-4"
              />
              {t.name}
            </label>
          ))}
        </CardContent>
      </Card>

      {selectedIds.length > 0 && (
        <Card className="bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Ordre des jours ({selectedIds.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedIds.map((id, index) => {
              const template = templates.find((t) => t.id === id)!
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">Jour {index + 1}</span> — {template.name}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      aria-label={`Monter ${template.name}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveDown(index)}
                      disabled={index === selectedIds.length - 1}
                      aria-label={`Descendre ${template.name}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full border-0 text-white"
        style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        onClick={handleSubmit}
        disabled={loading || selectedIds.length === 0 || !name.trim()}
      >
        {loading ? "Enregistrement…" : "Créer le programme"}
      </Button>
    </div>
  )
}
