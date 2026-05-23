import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/pg/db"
import { verifyPassword, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/pg/auth"
import { rateLimit, getClientIp } from "@/lib/pg/rate-limit"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email: rawEmail, password } = body || {}
  if (!rawEmail || !password)
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 })

  const email = String(rawEmail).toLowerCase().trim()

  // Brute-force protection: max 8 login attempts / 10 min per (ip + email).
  const ip = getClientIp(req)
  const rl = await rateLimit({ identifier: `login:${ip}:${email}`, windowSec: 600, max: 8 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessaye dans ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    )
  }

  const pool = getPool()
  const r = await pool.query(
    `SELECT id, email, username, password_hash, role, needs_password_reset, created_at
     FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  )
  const user = r.rows[0]
  if (!user) return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })

  if (user.needs_password_reset || !user.password_hash) {
    return NextResponse.json(
      { error: "Ce compte n'a pas encore de mot de passe. Crée-en un.", needs_setup: true, email: user.email },
      { status: 401 }
    )
  }

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })

  // En Postgres, l'id uuid est l'identifiant canonique : sub du token ET id public.
  const access = createAccessToken(user.id, user.email)
  const refresh = createRefreshToken(user.id)

  const res = NextResponse.json({
    id: user.id,
    email: user.email,
    username: user.username || null,
    role: user.role || "member",
    created_at: user.created_at ? new Date(user.created_at).toISOString() : undefined,
  })
  setAuthCookies(res, access, refresh)
  return res
}
