import { cache } from "react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

/**
 * Version mise en cache de getSession pour les server components.
 * cache() déduplique les appels dans le même render tree (layout + page = 1 seul appel DB).
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})
