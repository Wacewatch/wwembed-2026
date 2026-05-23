/**
 * JWT auth helpers (server-side only) — PostgreSQL/TimescaleDB backend.
 * Logique JWT/bcrypt/cookies inchangée ; seule la lecture du user passe de Mongo à PG.
 *
 * Cohérence des IDs :
 *   - Le JWT `sub` peut être un ObjectId 24-hex (tokens émis avant migration, où
 *     login faisait user._id.toString()) OU déjà un UUID (tokens post-migration).
 *   - On résout dans les deux cas vers l'`id` uuid de la table users PG :
 *     ObjectId → UUID dérivé (même algo que la migration), UUID → tel quel.
 */
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { getPool } from "@/lib/pg/db"

const JWT_SECRET = (() => {
  const v = process.env.JWT_SECRET
  if (!v || v === "change-me-in-prod") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET environment variable is missing or set to its insecure default. " +
        "Generate a strong random value (>= 32 chars) and set it before starting the server."
      )
    }
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

/** ObjectId 24-hex → UUID dérivé (identique à la migration et au shim). */
function oidToUuid(oidHex: string): string {
  const h = oidHex.padEnd(32, "0")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
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
  res.headers.append("Set-Cookie", `${ACCESS_COOKIE}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`)
  res.headers.append("Set-Cookie", `${REFRESH_COOKIE}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)
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

  const pool = getPool()
  // Résout l'id : ObjectId 24-hex → UUID dérivé ; UUID → tel quel ; sinon match email.
  let row: any = null
  const sub = payload.sub
  if (/^[a-f0-9]{24}$/i.test(sub)) {
    const uid = oidToUuid(sub.toLowerCase())
    const r = await pool.query(`SELECT id, email, username, role, created_at, needs_password_reset FROM users WHERE id = $1`, [uid])
    row = r.rows[0] || null
  } else if (/^[0-9a-f-]{36}$/i.test(sub)) {
    const r = await pool.query(`SELECT id, email, username, role, created_at, needs_password_reset FROM users WHERE id = $1`, [sub.toLowerCase()])
    row = r.rows[0] || null
  }
  // Filet : si pas trouvé par id mais le token porte l'email, on retombe dessus.
  if (!row && payload.email) {
    const r = await pool.query(`SELECT id, email, username, role, created_at, needs_password_reset FROM users WHERE lower(email) = lower($1)`, [payload.email])
    row = r.rows[0] || null
  }
  if (!row) return null

  return {
    id: row.id,
    email: row.email,
    username: row.username || null,
    role: row.role || "member",
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    needs_password_reset: row.needs_password_reset || false,
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
