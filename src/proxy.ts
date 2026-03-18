import { NextRequest, NextResponse } from "next/server"

const PUBLIC_ROUTES = ["/", "/login", "/register"]

// better-auth stocke la session dans ce cookie
const SESSION_COOKIE = "better-auth.session_token"

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Routes publiques : laisser passer
  if (PUBLIC_ROUTES.some((route) => pathname === route || (route !== "/" && pathname.startsWith(route)))) {
    return NextResponse.next()
  }

  // Vérification rapide : présence du cookie de session (pas de DB call)
  // La vraie validation de la session est faite par les server components via getSession()
  const sessionCookie = request.cookies.get(SESSION_COOKIE)

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js)).*)",
  ],
}
