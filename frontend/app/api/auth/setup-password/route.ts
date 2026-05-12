/**
 * POST /api/auth/setup-password
 * Body: { email, password, admin_code }
 *
 * Lets a Supabase-imported user (or any user flagged `needs_password_reset`)
 * create their first password without going through email. The action is
 * gated by an admin code stored in ADMIN_RESET_CODE (env).
 *
 * On success: updates password_hash, clears needs_password_reset, mirrors the
 * role into `profiles`, and auto-logs the user in (sets JWT cookies).
 */
import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo/db"
import {
  hashPassword,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
} from "@/lib/mongo/auth"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email: rawEmail, password, admin_code } = body || {}

  if (!rawEmail || typeof rawEmail !== "string") {
    return NextResponse.json({ error: "Email requis" }, { status: 400 })
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Mot de passe trop court (6 caractères min)" },
      { status: 400 }
    )
  }
  if (!admin_code || typeof admin_code !== "string") {
    return NextResponse.json({ error: "Code admin requis" }, { status: 400 })
  }

  const expectedCode = process.env.ADMIN_RESET_CODE
  if (!expectedCode) {
    console.error("[setup-password] ADMIN_RESET_CODE not set in env")
    return NextResponse.json(
      { error: "Configuration serveur manquante" },
      { status: 500 }
    )
  }
  if (admin_code !== expectedCode) {
    return NextResponse.json({ error: "Code admin invalide" }, { status: 403 })
  }

  const email = rawEmail.toLowerCase().trim()
  const db = await getDb()
  const user = await db.collection("users").findOne({ email })

  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 })
  }
  if (!user.needs_password_reset && user.password_hash) {
    return NextResponse.json(
      { error: "Ce compte a déjà un mot de passe. Connecte-toi normalement." },
      { status: 400 }
    )
  }

  const password_hash = await hashPassword(password)
  const nowIso = new Date().toISOString()

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        password_hash,
        needs_password_reset: false,
        updated_at: nowIso,
      },
    }
  )

  // Mirror to `profiles` so the existing dashboard/admin pages stay consistent.
  await db.collection("profiles").updateOne(
    { _id: user._id },
    {
      $set: {
        email: user.email,
        username: user.username,
        role: user.role || "member",
        updated_at: nowIso,
      },
      $setOnInsert: { created_at: user.created_at || nowIso },
    },
    { upsert: true }
  )

  const tokenSub = user._id.toString()
  const access = createAccessToken(tokenSub, user.email)
  const refresh = createRefreshToken(tokenSub)
  const id = user.legacy_uuid || tokenSub

  const res = NextResponse.json({
    ok: true,
    id,
    email: user.email,
    username: user.username || null,
    role: user.role || "member",
  })
  setAuthCookies(res, access, refresh)
  return res
}
