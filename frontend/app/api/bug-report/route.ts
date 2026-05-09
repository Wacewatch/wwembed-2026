/**
 * Compat alias for /api/bug-reports — historically called as singular
 * with snake_case keys from the embedded streaming/download players.
 */
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()
    const { error } = await supabase.from("bug_reports").insert({
      ww_id: body.ww_id || body.wwId,
      media_type: body.media_type || body.mediaType,
      tmdb_id: body.tmdb_id ?? body.tmdbId,
      season_number: body.season_number ?? body.seasonNumber ?? null,
      episode_number: body.episode_number ?? body.episodeNumber ?? null,
      title: body.title,
      source_name: body.source_name || body.sourceName,
      source_url: body.source_url || body.sourceUrl,
      message: body.message,
      embed_type: body.embed_type || body.embedType || "streaming",
      reporter_ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      user_agent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
      user_id: null,
      status: "pending",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal" }, { status: 500 })
  }
}
