/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 * - Verifies the token (sha256 hash match, not used, not expired)
 * - Updates user.password_hash, marks token used
 * - Auto-logs the user in (sets cookies) like /login does
 */
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getDb } from "@/lib/mongo/db"
import {
  hashPassword,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
} from "@/lib/mongo/auth"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { token, password } = body || {}

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 })
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Mot de passe trop court (6 min)" },
      { status: 400 }
    )
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const db = await getDb()

  const tokenDoc = await db.collection("password_reset_tokens").findOne({
    token_hash: tokenHash,
  })

  if (!tokenDoc) {
    return NextResponse.json({ error: "Lien invalide ou déjà utilisé" }, { status: 400 })
  }
  if (tokenDoc.used_at) {
    return NextResponse.json({ error: "Lien déjà utilisé" }, { status: 400 })
  }
  if (new Date(tokenDoc.expires_at) < new Date()) {
    return NextResponse.json({ error: "Lien expiré, refais une demande" }, { status: 400 })
  }

  const user = await db.collection("users").findOne({ _id: tokenDoc.user_id })
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 400 })
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

  await db.collection("password_reset_tokens").updateOne(
    { _id: tokenDoc._id },
    { $set: { used_at: nowIso } }
  )

  // Invalidate any other reset tokens for this user.
  await db.collection("password_reset_tokens").deleteMany({
    user_id: user._id,
    used_at: null,
  })

  const id = user._id.toString()
  const access = createAccessToken(id, user.email)
  const refresh = createRefreshToken(id)

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
