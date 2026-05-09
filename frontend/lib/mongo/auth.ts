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

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-prod"
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
    id: userDoc._id?.toString() || userDoc.id,
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
