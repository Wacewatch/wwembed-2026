/**
 * Compat alias for /api/bug-reports — historically called as singular
 * with snake_case keys from the embedded streaming/download players.
 *
 * Rate-limited by IP to prevent flood/spam (5 reports / 10 min / IP).
 */
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit, getClientIp } from "@/lib/mongo/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await rateLimit({
      identifier: `bugreport:${ip}`,
      windowSec: 600,
      max: 5,
    })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Trop de signalements. Réessaye dans ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    }

    const body = await req.json()

    // Length guards — these fields are user-controlled and go straight to admin UI.
    const safeStr = (v: any, max: number) =>
      typeof v === "string" ? v.slice(0, max) : v == null ? null : String(v).slice(0, max)

    const supabase = createAdminClient()
    const { error } = await supabase.from("bug_reports").insert({
      ww_id: safeStr(body.ww_id || body.wwId, 100),
      media_type: safeStr(body.media_type || body.mediaType, 30),
      tmdb_id: body.tmdb_id ?? body.tmdbId ?? null,
      season_number: body.season_number ?? body.seasonNumber ?? null,
      episode_number: body.episode_number ?? body.episodeNumber ?? null,
      title: safeStr(body.title, 300),
      source_name: safeStr(body.source_name || body.sourceName, 200),
      source_url: safeStr(body.source_url || body.sourceUrl, 2048),
      message: safeStr(body.message, 2000),
      embed_type: safeStr(body.embed_type || body.embedType || "streaming", 30),
      reporter_ip: ip,
      user_agent: safeStr(req.headers.get("user-agent"), 500),
      referrer: safeStr(req.headers.get("referer"), 1000),
      user_id: null,
      status: "pending",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal" }, { status: 500 })
  }
}
