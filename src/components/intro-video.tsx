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
  const [muted, setMuted] = useState(true)
  const [needsTap, setNeedsTap] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Affichée une fois par jour et par appareil, ou à la demande avec ?intro=1
  useEffect(() => {
    let seen = false
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === today()
    } catch {
      // stockage indisponible : on montre l'intro
    }
    const forced = new URLSearchParams(window.location.search).get("intro") === "1"
    // lecture de localStorage après l'hydratation (évite un écart SSR/client)
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

  // Lecture automatique d'abord en muet (la seule que iOS accepte sans geste, hors mode
  // économie d'énergie), puis on rallume le son si le navigateur l'autorise (activation
  // utilisateur récente : cas de PC/Android juste après la connexion). Sinon : bouton « Activer le son ».
  useEffect(() => {
    if (phase !== "visible") return
    const video = videoRef.current
    if (!video) return
    video.defaultMuted = true
    video.muted = true
    let timer: number | undefined
    video
      .play()
      .then(() => {
        const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
        if (!activation?.hasBeenActive) return
        video.muted = false
        setMuted(false)
        // si le navigateur met la lecture en pause à cause du son, on repasse en muet
        timer = window.setTimeout(() => {
          if (video.paused && !video.ended) {
            video.muted = true
            setMuted(true)
            video.play().catch(() => setNeedsTap(true))
          }
        }, 400)
      })
      .catch(() => setNeedsTap(true))
    return () => window.clearTimeout(timer)
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

  // Libère le blob éventuel quand l'intro se ferme
  useEffect(() => {
    if (phase !== "hidden") return
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [phase])

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

  // Lancement par un tap : avec le son, sinon muet, sinon en téléchargeant le fichier en
  // entier (lecture depuis un blob, qui évite les requêtes Range), sinon message d'erreur
  async function startManually() {
    const video = videoRef.current
    if (!video) return
    setFailed(false)
    video.muted = false
    setMuted(false)
    try {
      await video.play()
      setNeedsTap(false)
      return
    } catch {
      video.muted = true
      setMuted(true)
    }
    try {
      await video.play()
      setNeedsTap(false)
      return
    } catch {
      // on tente le blob
    }
    try {
      const response = await fetch(VIDEO_SRC, { cache: "no-store" })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const url = URL.createObjectURL(await response.blob())
      blobUrlRef.current = url
      video.src = url
      await video.play()
      setNeedsTap(false)
    } catch (err) {
      console.error("[intro-video]", err)
      setFailed(true)
    }
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
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlaying={() => setReady(true)}
        onEnded={dismiss}
        onError={skipOnError}
      />

      {!ready && !needsTap && !failed && (
        <p className="absolute text-sm text-white/70" aria-live="polite">
          Chargement…
        </p>
      )}

      {failed && (
        <p role="alert" className="absolute max-w-xs px-6 text-center text-sm text-white">
          Impossible de lire la vidéo sur cet appareil. Appuie sur « Passer » pour continuer.
        </p>
      )}

      {needsTap && (
        <button
          type="button"
          onClick={() => void startManually()}
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
