import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongo/db"
import { hashPassword, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/mongo/auth"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email: rawEmail, password, username: rawUsername } = body || {}
  if (!rawEmail || !password)
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 })
  if (password.length < 6)
    return NextResponse.json({ error: "Mot de passe trop court (6 min)" }, { status: 400 })

  const email = String(rawEmail).toLowerCase().trim()
  const username = (rawUsername || email.split("@")[0]).trim()

  const db = await getDb()
  const existing = await db.collection("users").findOne({ email })
  if (existing && !existing.needs_password_reset)
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 })

  const password_hash = await hashPassword(password)
  let userId: ObjectId

  if (existing && existing.needs_password_reset) {
    await db.collection("users").updateOne(
      { _id: existing._id },
      {
        $set: {
          password_hash,
          username: existing.username || username,
          needs_password_reset: false,
          updated_at: new Date().toISOString(),
        },
      }
    )
    userId = existing._id
  } else {
    const usernameClash = await db.collection("users").findOne({ username })
    const finalUsername = usernameClash ? `${username}${Math.floor(Math.random() * 9999)}` : username
    const r = await db.collection("users").insertOne({
      email,
      username: finalUsername,
      password_hash,
      role: "member",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    userId = r.insertedId
  }

  const tokenSub = userId.toString()
  const access = createAccessToken(tokenSub, email)
  const refresh = createRefreshToken(tokenSub)

  const userDoc = await db.collection("users").findOne({ _id: userId })
  // Use legacy_uuid for the public id when the account was migrated from
  // Supabase, otherwise the Mongo ObjectId hex.
  const id = userDoc?.legacy_uuid || tokenSub

  // Mirror the user as a `profiles` row (same _id) so the existing
  // dashboard / admin pages that read from `profiles` keep working.
  await db.collection("profiles").updateOne(
    { _id: userId },
    {
      $set: {
        email: userDoc?.email,
        username: userDoc?.username,
        role: userDoc?.role || "member",
        updated_at: new Date().toISOString(),
      },
      $setOnInsert: { created_at: new Date().toISOString() },
    },
    { upsert: true }
  )

  const res = NextResponse.json({
    id,
    email,
    username: userDoc?.username || username,
    role: userDoc?.role || "member",
  })
  setAuthCookies(res, access, refresh)
  return res
}
