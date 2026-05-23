/**
 * POST /api/auth/setup-password
 * Body: { email, password, admin_code }
 *
 * Lets a Supabase-imported user (or any user flagged `needs_password_reset`)
 * create their first password without going through email. Gated by ADMIN_RESET_CODE.
 * On success: updates password_hash, clears needs_password_reset, mirrors the
 * role into `profiles`, and auto-logs the user in (sets JWT cookies).
 */
import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/pg/db"
import { hashPassword, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/pg/auth"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email: rawEmail, password, admin_code } = body || {}

  if (!rawEmail || typeof rawEmail !== "string") {
    return NextResponse.json({ error: "Email requis" }, { status: 400 })
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Mot de passe trop court (6 caractères min)" }, { status: 400 })
  }
  if (!admin_code || typeof admin_code !== "string") {
    return NextResponse.json({ error: "Code admin requis" }, { status: 400 })
  }

  const expectedCode = process.env.ADMIN_RESET_CODE
  if (!expectedCode) {
    console.error("[setup-password] ADMIN_RESET_CODE not set in env")
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 })
  }
  if (admin_code !== expectedCode) {
    return NextResponse.json({ error: "Code admin invalide" }, { status: 403 })
  }

  const email = rawEmail.toLowerCase().trim()
  const pool = getPool()

  const r = await pool.query(
    `SELECT id, email, username, password_hash, role, needs_password_reset, created_at
     FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  )
  const user = r.rows[0]
  if (!user) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 })

  if (!user.needs_password_reset && user.password_hash) {
    return NextResponse.json(
      { error: "Ce compte a déjà un mot de passe. Connecte-toi normalement." },
      { status: 400 }
    )
  }

  const password_hash = await hashPassword(password)

  await pool.query(
    `UPDATE users SET password_hash = $1, needs_password_reset = false, updated_at = now() WHERE id = $2`,
    [password_hash, user.id]
  )

  // Miroir dans profiles (même id) pour cohérence dashboard/admin.
  await pool.query(
    `INSERT INTO profiles (id, user_id, email, username, role, created_at, updated_at)
     VALUES ($1, $1, $2, $3, $4, COALESCE($5, now()), now())
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, username = EXCLUDED.username, role = EXCLUDED.role, updated_at = now()`,
    [user.id, user.email, user.username, user.role || "member", user.created_at]
  )

  const access = createAccessToken(user.id, user.email)
  const refresh = createRefreshToken(user.id)

  const res = NextResponse.json({
    ok: true,
    id: user.id,
    email: user.email,
    username: user.username || null,
    role: user.role || "member",
  })
  setAuthCookies(res, access, refresh)
  return res
}
