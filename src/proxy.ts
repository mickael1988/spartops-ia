import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const PUBLIC_ROUTES = ["/", "/login", "/register"]

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Routes publiques : laisser passer
  if (PUBLIC_ROUTES.some((route) => pathname === route || (route !== "/" && pathname.startsWith(route)))) {
    return NextResponse.next()
  }

  // Vérification rapide : présence du cookie de session (pas de DB call)
  // La vraie validation de la session est faite par les server components via getSession()
  // getSessionCookie gère le préfixe `__Secure-` ajouté par better-auth en HTTPS —
  // un nom de cookie codé en dur ne matchait qu'en local (HTTP, pas de préfixe).
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js)).*)",
  ],
}
