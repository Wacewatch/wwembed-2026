import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo/db"
import { verifyPassword, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/mongo/auth"
import { rateLimit, getClientIp } from "@/lib/mongo/rate-limit"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email: rawEmail, password } = body || {}
  if (!rawEmail || !password)
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 })

  const email = String(rawEmail).toLowerCase().trim()

  // Brute-force protection: max 8 login attempts / 10 min per (ip + email).
  // We use a combined key so an attacker can't lock another user out by
  // hammering one ip, and one ip can't try many emails freely either.
  const ip = getClientIp(req)
  const rl = await rateLimit({
    identifier: `login:${ip}:${email}`,
    windowSec: 600,
    max: 8,
  })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessaye dans ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    )
  }

  const db = await getDb()
  const user = await db.collection("users").findOne({ email })
  if (!user) return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })

  // User imported from a previous migration (or freshly seeded) without a usable
  // password. Signal the client to redirect to the "setup password" page
  // (which requires the admin code) instead of letting them log in.
  if (user.needs_password_reset || !user.password_hash) {
    return NextResponse.json(
      {
        error: "Ce compte n'a pas encore de mot de passe. Crée-en un.",
        needs_setup: true,
        email: user.email,
      },
      { status: 401 }
    )
  }

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })

  const tokenSub = user._id.toString()
  const access = createAccessToken(tokenSub, user.email)
  const refresh = createRefreshToken(tokenSub)
  // Prefer legacy_uuid for the public-facing id so it matches submitted_by /
  // foreign-key fields stored from the Supabase→Mongo migration.
  const id = user.legacy_uuid || tokenSub

  const res = NextResponse.json({
    id,
    email: user.email,
    username: user.username || null,
    role: user.role || "member",
    created_at: user.created_at,
  })
  setAuthCookies(res, access, refresh)
  return res
}
