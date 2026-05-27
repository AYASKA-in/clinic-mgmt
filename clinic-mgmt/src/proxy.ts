import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySessionToken } from "@/lib/auth"
import { ROLE_HIERARCHY } from "@/lib/constants"

const publicPaths = ["/login", "/api/auth/login", "/api/cron"]
const adminPaths = ["/users", "/settings"]
const doctorOrAdminPaths = ["/plans/new", "/plans/[id]/edit"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next()
  }

  const token = request.cookies.get("session_user")?.value
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const user = await verifySessionToken(token)
  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    const res = NextResponse.redirect(loginUrl)
    res.cookies.delete("session_user")
    return res
  }

  if (!user.active) {
    const res = NextResponse.redirect(new URL("/login?error=deactivated", request.url))
    res.cookies.delete("session_user")
    return res
  }

  const userLevel = ROLE_HIERARCHY[user.role] ?? 0

  if (adminPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (userLevel < ROLE_HIERARCHY["admin"]) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url))
    }
  }

  if (doctorOrAdminPaths.some((p) => pathname.startsWith(p))) {
    if (userLevel < ROLE_HIERARCHY["doctor"]) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth/login).*)",
  ],
}
