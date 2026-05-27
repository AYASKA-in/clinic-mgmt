import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { ROLE_HIERARCHY } from "./constants"

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required")
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
  active: boolean
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .setIssuedAt()
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function getSessionFromCookie(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get("session_user")?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session_user")?.value
    if (!token) return null
    return verifySessionToken(token)
  } catch {
    return null
  }
}

export async function requireRole(minRole: string): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new Error("Authentication required")
  if ((ROLE_HIERARCHY[user.role] ?? 0) < (ROLE_HIERARCHY[minRole] ?? 0)) {
    throw new Error("Insufficient permissions")
  }
  if (!user.active) throw new Error("Account is deactivated")
  return user
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new Error("Authentication required")
  if (!user.active) throw new Error("Account is deactivated")
  return user
}
