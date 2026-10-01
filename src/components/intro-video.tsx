"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const STORAGE_KEY = "spartops-intro-seen-on"
const VIDEO_SRC = "/intro/spartops-intro.mp4"

type Phase = "pending" | "visible" | "hidden"

// Jour local de l'appareil, au format AAAA-MM-JJ
function today(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function IntroVideo() {
  const [phase, setPhase] = useState<Phase>("pending")
  const [muted, setMuted] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Affichée une fois par jour et par appareil, ou à la demande avec ?intro=1
  useEffect(() => {
    let seen = false
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === today()
    } catch {
      // stockage indisponible : on montre l'intro
    }
    const forced = new URLSearchParams(window.location.search).get("intro") === "1"
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture de localStorage après l'hydratation (évite un écart SSR/client)
    setPhase(forced || !seen ? "visible" : "hidden")
  }, [])

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, today())
    } catch {
      // ignoré
    }
    setPhase("hidden")
  }, [])

  // Lecture automatique avec le son ; si le navigateur le refuse (pas de geste récent),
  // on relance en muet avec le bouton « Activer le son » ; en dernier recours, un bouton
  useEffect(() => {
    if (phase !== "visible") return
    const video = videoRef.current
    if (!video) return
    video.muted = false
    video
      .play()
      .catch(() => {
        video.muted = true
        setMuted(true)
        return video.play()
      })
      .catch(() => setNeedsTap(true))
  }, [phase])

  // Pas de défilement derrière l'intro, Échap pour fermer
  useEffect(() => {
    if (phase !== "visible") return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [phase, dismiss])

  if (phase !== "visible") return null

  // La vidéo ne doit jamais bloquer l'app (hors-ligne, fichier absent) : on ferme sans la marquer vue
  function skipOnError() {
    setPhase("hidden")
  }

  function toggleSound() {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  function startManually() {
    const video = videoRef.current
    if (!video) return
    video
      .play()
      .then(() => setNeedsTap(false))
      .catch(() => {})
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Présentation de SpartOps"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
    >
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        className="h-full w-full object-contain"
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={skipOnError}
      />

      {needsTap && (
        <button
          type="button"
          onClick={startManually}
          className="absolute rounded-full px-8 py-4 text-lg font-bold text-white"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          ▶ Lancer la vidéo
        </button>
      )}

      <button
        type="button"
        onClick={dismiss}
        className="absolute right-4 rounded-full bg-black/60 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        Passer ›
      </button>

      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={!muted}
        className="absolute left-4 rounded-full bg-black/60 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
      >
        {muted ? "🔇 Activer le son" : "🔊 Couper le son"}
      </button>
    </div>
  )
}
