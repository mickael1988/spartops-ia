import { NextRequest, NextResponse } from "next/server"
import { betterFetch } from "@better-fetch/fetch"
import type { Session } from "@/lib/auth"

const PUBLIC_ROUTES = ["/", "/login", "/register"]

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Routes publiques : laisser passer
  if (PUBLIC_ROUTES.some((route) => pathname === route || (route !== "/" && pathname.startsWith(route)))) {
    return NextResponse.next()
  }

  // Vérifier la session
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    }
  )

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Protège toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     * - api/auth (routes better-auth)
     * - fichiers publics (.png, .jpg, .svg, .ico, .webp...)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js)).*)",
  ],
}
