import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden pb-16">
      {/* Desktop : deux spartans qui se regardent */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/spartan-hero.png"
        alt=""
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-auto hidden lg:block"
        style={{
          WebkitMaskImage: "linear-gradient(to right, black 40%, transparent 100%)",
          maskImage: "linear-gradient(to right, black 40%, transparent 100%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/spartan-hero.png"
        alt=""
        aria-hidden="true"
        className="absolute top-0 right-0 h-full w-auto hidden lg:block"
        style={{
          transform: "scaleX(-1)",
          WebkitMaskImage: "linear-gradient(to right, black 40%, transparent 100%)",
          maskImage: "linear-gradient(to right, black 40%, transparent 100%)",
        }}
      />
      {/* Mobile : un seul spartan centré */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/spartan-hero.png"
        alt=""
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-auto lg:hidden"
      />

      {/* Gradient sombre uniquement en bas pour lisibilité des boutons */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/5" />

      {/* Contenu */}
      <div className="relative z-10 flex flex-col items-center gap-4 text-white text-center px-6">
        <h1 className="text-4xl font-bold tracking-tight drop-shadow-lg">SpartOps</h1>
        <p className="text-white/70 text-sm">Forge ton corps. Domine ta nutrition.</p>

        <Link
          href="/login"
          className="mt-4 px-10 py-3 rounded-full text-white font-semibold text-base shadow-lg"
          style={{ background: "linear-gradient(to right, #3F5EFB, #F50535)" }}
        >
          Connexion
        </Link>
        <Link href="/register" className="text-white/60 text-sm hover:text-white transition-colors">
          Pas encore de compte ? S&apos;inscrire
        </Link>
      </div>
    </div>
  )
}
