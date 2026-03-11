import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { ProfilForm } from "./profil-form"

export default async function ProfilPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const user = session.user

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const dateInscription = new Date(user.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mon Profil</h1>
        <p className="text-muted-foreground mt-1">Modifier vos informations personnelles</p>
      </div>

      <ProfilForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
          createdAt: new Date(user.createdAt),
        }}
        initials={initials}
        dateInscription={dateInscription}
      />
    </div>
  )
}
