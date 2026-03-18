"use client"

import { useRef, useState, useTransition } from "react"
import { Camera, User, Mail, Calendar, Loader2, CheckCircle, Pencil, X, Hash } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateProfile } from "./actions"

type Props = {
  user: {
    id: string
    name: string
    email: string
    image: string | null
    age: number | null
    createdAt: Date
  }
  initials: string
  dateInscription: string
}

export function ProfilForm({ user, initials, dateInscription }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [age, setAge] = useState<string>(user.age != null ? String(user.age) : "")
  const [preview, setPreview] = useState<string | null>(user.image)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleCancel() {
    setIsEditing(false)
    setName(user.name)
    setAge(user.age != null ? String(user.age) : "")
    setPreview(user.image)
    setImageFile(null)
    setError(null)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const formData = new FormData()
    formData.set("name", name)
    formData.set("age", age)
    if (imageFile) formData.set("image", imageFile)

    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setImageFile(null)
        setIsEditing(false)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className={`relative ${isEditing ? "cursor-pointer group" : ""}`}
              onClick={() => isEditing && fileInputRef.current?.click()}
            >
              <Avatar className="h-20 w-20">
                {preview && <AvatarImage src={preview} alt={name} className="object-cover" />}
                <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageChange}
            />
            <div className="flex-1">
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <p className="text-sm text-muted-foreground">Membre SpartOps</p>
            </div>
            {/* Bouton Modifier / Annuler */}
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Pencil className="h-4 w-4" /> Modifier
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" /> Annuler
              </button>
            )}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-5">
          {/* Nom */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
              <User className="h-3.5 w-3.5" /> Prénom / Pseudo
            </label>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                autoFocus
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className="px-4 py-2.5 text-sm font-medium">{user.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
              <Mail className="h-3.5 w-3.5" /> Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full rounded-xl border bg-muted px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
            ) : (
              <p className="px-4 py-2.5 text-sm font-medium">{user.email}</p>
            )}
          </div>

          {/* Âge */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
              <Hash className="h-3.5 w-3.5" /> Âge
            </label>
            {isEditing ? (
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={1}
                max={120}
                placeholder="ex : 25"
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className="px-4 py-2.5 text-sm font-medium">
                {user.age != null ? `${user.age} ans` : <span className="text-muted-foreground italic">Non renseigné</span>}
              </p>
            )}
          </div>

          {/* Membre depuis */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Membre depuis le {dateInscription}
          </div>

          {/* Feedback succès (visible aussi hors édition) */}
          {saved && (
            <p className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4" /> Profil mis à jour avec succès
            </p>
          )}

          {/* Formulaire édition */}
          {isEditing && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t">
              {error && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Enregistrement…" : "Sauvegarder"}
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
