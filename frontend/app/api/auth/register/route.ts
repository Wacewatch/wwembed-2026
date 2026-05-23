import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/pg/db"
import { hashPassword, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/pg/auth"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email: rawEmail, password, username: rawUsername } = body || {}
  if (!rawEmail || !password)
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 })
  if (password.length < 6)
    return NextResponse.json({ error: "Mot de passe trop court (6 min)" }, { status: 400 })

  const email = String(rawEmail).toLowerCase().trim()
  const username = (rawUsername || email.split("@")[0]).trim()
  const pool = getPool()

  const existingRes = await pool.query(
    `SELECT id, username, needs_password_reset, created_at FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  )
  const existing = existingRes.rows[0]
  if (existing && !existing.needs_password_reset)
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 })

  const password_hash = await hashPassword(password)
  const nowIso = new Date().toISOString()
  let userId: string
  let finalUsername: string
  let role = "member"

  if (existing && existing.needs_password_reset) {
    finalUsername = existing.username || username
    await pool.query(
      `UPDATE users SET password_hash = $1, username = $2, needs_password_reset = false, updated_at = now() WHERE id = $3`,
      [password_hash, finalUsername, existing.id]
    )
    userId = existing.id
  } else {
    // Anti-collision username
    const clashRes = await pool.query(`SELECT 1 FROM users WHERE lower(username) = lower($1) LIMIT 1`, [username])
    finalUsername = clashRes.rows.length ? `${username}${Math.floor(Math.random() * 9999)}` : username
    const insRes = await pool.query(
      `INSERT INTO users (email, username, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, 'member', now(), now()) RETURNING id`,
      [email, finalUsername, password_hash]
    )
    userId = insRes.rows[0].id
  }

  // Miroir dans profiles (même id) pour les pages dashboard/admin qui lisent profiles.
  await pool.query(
    `INSERT INTO profiles (id, user_id, email, username, role, created_at, updated_at)
     VALUES ($1, $1, $2, $3, $4, now(), now())
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, username = EXCLUDED.username, role = EXCLUDED.role, updated_at = now()`,
    [userId, email, finalUsername, role]
  )

  const access = createAccessToken(userId, email)
  const refresh = createRefreshToken(userId)

  const res = NextResponse.json({ id: userId, email, username: finalUsername, role })
  setAuthCookies(res, access, refresh)
  return res
}
