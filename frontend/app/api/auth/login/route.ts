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

  if (user.needs_password_reset && !user.password_hash) {
    return NextResponse.json(
      { error: "Compte importé : créez un mot de passe via l'inscription avec ce même email." },
      { status: 401 }
    )
  }

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })

  const id = user._id.toString()
  const access = createAccessToken(id, user.email)
  const refresh = createRefreshToken(id)

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
