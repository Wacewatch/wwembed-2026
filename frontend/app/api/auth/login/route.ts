import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongo/db"
import { verifyPassword, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/mongo/auth"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email: rawEmail, password } = body || {}
  if (!rawEmail || !password)
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 })

  const email = String(rawEmail).toLowerCase().trim()
  const db = await getDb()
  const user = await db.collection("users").findOne({ email })
  if (!user) return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })

  // User imported from Supabase (or freshly seeded) without a usable password.
  // Signal the client to redirect to the "setup password" page (which requires
  // the admin code) instead of the old Resend-email flow.
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
