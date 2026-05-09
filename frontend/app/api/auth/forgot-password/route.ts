/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Response: { ok: true } regardless of whether the email exists
 *           (avoid leaking which emails are registered).
 *
 * On success: stores a single-use token in `password_reset_tokens` and
 * sends a Resend email with the reset link.
 */
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getDb } from "@/lib/mongo/db"
import { sendEmail } from "@/lib/email/resend"
import { passwordResetTemplate } from "@/lib/email/templates"

const TOKEN_TTL_MINUTES = 30

function getBaseUrl(req: NextRequest): string {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  ).replace(/\/$/, "")
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const rawEmail = body?.email
  if (!rawEmail || typeof rawEmail !== "string") {
    return NextResponse.json({ error: "Email requis" }, { status: 400 })
  }
  const email = rawEmail.toLowerCase().trim()

  const db = await getDb()
  const user = await db.collection("users").findOne({ email })

  // Always respond OK to avoid email enumeration.
  if (!user) {
    return NextResponse.json({ ok: true })
  }

  // Generate token (URL-safe), hash before storing.
  const rawToken = crypto.randomBytes(32).toString("base64url")
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
  const now = new Date()
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60_000)

  // Invalidate previous tokens for this user.
  await db.collection("password_reset_tokens").deleteMany({ user_id: user._id })

  await db.collection("password_reset_tokens").insertOne({
    user_id: user._id,
    email,
    token_hash: tokenHash,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    used_at: null,
  })

  const baseUrl = getBaseUrl(req)
  const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}`

  const tpl = passwordResetTemplate({
    username: user.username || email.split("@")[0],
    resetUrl,
    expiresInMinutes: TOKEN_TTL_MINUTES,
  })

  const result = await sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  })

  if (!result.ok) {
    // Log server-side, still respond ok to user (don't leak provider state).
    console.error("[forgot-password] Resend error:", result.error)
  }

  return NextResponse.json({ ok: true })
}
