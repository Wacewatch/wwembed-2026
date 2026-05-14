/**
 * POST /api/upload/probe
 * Body: { url: string }
 * Auth: any logged-in user (so uploaders can use it from the dashboard).
 *
 * Returns the inferred provider/quality/language/file_size + reachability.
 * The user can still override every field before submitting.
 */
import { NextRequest, NextResponse } from "next/server"
import { probeUrl } from "@/lib/url-probe"
import { getCurrentUser } from "@/lib/mongo/auth"
import { rateLimit, getClientIp } from "@/lib/mongo/rate-limit"

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req).catch(() => null)
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 })

  // 20 probes / min / user so an uploader can't grief the rate-limited
  // public hosters (some banlist on too many HEAD requests).
  const rl = await rateLimit({
    identifier: `probe:${user.id || user.email || getClientIp(req)}`,
    windowSec: 60,
    max: 20,
  })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de requêtes. Réessaye dans ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    )
  }

  const { url } = await req.json().catch(() => ({}))
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 })
  }

  const result = await probeUrl(url)
  return NextResponse.json(result)
}
