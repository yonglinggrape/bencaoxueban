import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED = ["/home", "/learning", "/quiz", "/collection", "/leaderboard", "/tutor", "/profile"]
const AUTH_PAGES = ["/login", "/register"]

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasToken = req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token")

  if (!hasToken && PROTECTED.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (hasToken && (AUTH_PAGES.some(p => pathname.startsWith(p)) || pathname === "/")) {
    return NextResponse.redirect(new URL("/home", req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
