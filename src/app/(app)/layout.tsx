import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { Header } from "@/components/layout/header"
import { SidebarContent } from "@/components/layout/sidebar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="relative flex min-h-screen">
      {/* Desktop : deux spartans qui se regardent */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/spartan-hero.png"
        alt=""
        aria-hidden="true"
        className="fixed top-0 left-64 h-full w-auto -z-20 pointer-events-none hidden lg:block"
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
        className="fixed top-0 right-0 h-full w-auto -z-20 pointer-events-none hidden lg:block"
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
        className="fixed top-0 left-1/2 md:left-[calc(50%+8rem)] -translate-x-1/2 h-full w-auto -z-20 pointer-events-none lg:hidden"
      />
      {/* Overlay global */}
      <div className="fixed inset-0 bg-background/20 dark:bg-background/15 -z-10 pointer-events-none" />

      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background/95 backdrop-blur-sm">
        <SidebarContent />
      </aside>

      {/* Contenu principal */}
      <div className="flex flex-1 flex-col md:pl-64">
        <Header
          userName={session.user.name}
          userEmail={session.user.email}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
