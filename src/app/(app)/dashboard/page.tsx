import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { SignOutButton } from "@/components/sign-out-button"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Bienvenue, {session?.user.name} !</h1>
        <p className="text-muted-foreground mt-2">
          Sprint 1 terminé — L&apos;authentification fonctionne.
        </p>
      </div>
      <div className="bg-white dark:bg-gray-900 border rounded-lg p-4 text-sm text-left w-full max-w-md">
        <p><span className="font-medium">Email :</span> {session?.user.email}</p>
        <p className="mt-1"><span className="font-medium">ID :</span> {session?.user.id}</p>
      </div>
      <SignOutButton />
    </main>
  )
}
