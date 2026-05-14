/**
 * JWT auth helpers (server-side only).
 * Uses bcryptjs + jsonwebtoken with httpOnly cookies.
 */
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { getDb } from "./db"

const JWT_SECRET = (() => {
  const v = process.env.JWT_SECRET
  if (!v || v === "change-me-in-prod") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET environment variable is missing or set to its insecure default. " +
        "Generate a strong random value (>= 32 chars) and set it before starting the server."
      )
    }
    // Dev fallback — never reachable in prod thanks to the guard above.
    console.warn("[auth] JWT_SECRET not set, using dev-only fallback. DO NOT deploy without setting it.")
    return "dev-only-insecure-secret-do-not-use-in-prod"
  }
  if (v.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is too short (< 32 chars). Use a strong random value.")
    }
    console.warn("[auth] JWT_SECRET is shorter than 32 chars — unsafe in prod.")
  }
  return v
})()
const ACCESS_COOKIE = "ww_access"
const REFRESH_COOKIE = "ww_refresh"

export interface AuthUser {
  id: string
  email: string
  username: string | null
  role: "admin" | "uploader" | "member"
  created_at?: string
  needs_password_reset?: boolean
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

export function createAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email, type: "access" }, JWT_SECRET, { expiresIn: "12h" })
}

export function createRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, JWT_SECRET, { expiresIn: "30d" })
}

export function verifyAccessToken(token: string): { sub: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.type !== "access") return null
    return { sub: decoded.sub, email: decoded.email }
  } catch {
    return null
  }
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`
  )
  res.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
  )
}

export function clearAuthCookies(res: Response) {
  res.headers.append("Set-Cookie", `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
  res.headers.append("Set-Cookie", `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

export async function getCurrentUser(req?: NextRequest): Promise<AuthUser | null> {
  let token: string | undefined
  if (req) {
    token = req.cookies.get(ACCESS_COOKIE)?.value
  } else {
    const c = await cookies()
    token = c.get(ACCESS_COOKIE)?.value
  }
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload) return null

  const db = await getDb()
  let userDoc: any = null
  if (/^[a-f0-9]{24}$/i.test(payload.sub)) {
    userDoc = await db.collection("users").findOne({ _id: new ObjectId(payload.sub) })
  } else {
    userDoc = await db.collection("users").findOne({ id: payload.sub })
  }
  if (!userDoc) return null

  return {
    // Prefer legacy_uuid (original Supabase UUID) so that joins with foreign-key
    // fields stored as the old UUID (e.g. streaming_links.submitted_by from the
    // Supabase→Mongo migration) keep working. Fallback to the Mongo ObjectId hex
    // for post-migration users that don't have a legacy UUID.
    id: userDoc.legacy_uuid || userDoc._id?.toString() || userDoc.id,
    email: userDoc.email,
    username: userDoc.username || null,
    role: userDoc.role || "member",
    created_at: userDoc.created_at,
    needs_password_reset: userDoc.needs_password_reset || false,
  }
}

export async function requireUser(req?: NextRequest): Promise<AuthUser> {
  const u = await getCurrentUser(req)
  if (!u) throw new Error("Unauthorized")
  return u
}

export async function requireAdmin(req?: NextRequest): Promise<AuthUser> {
  const u = await requireUser(req)
  if (u.role !== "admin") throw new Error("Forbidden")
  return u
}

export const COOKIES = { ACCESS_COOKIE, REFRESH_COOKIE }
