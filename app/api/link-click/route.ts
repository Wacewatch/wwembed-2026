import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wwId, linkType, mediaType, tmdbId, seasonNumber, episodeNumber, sourceName } = body

    const supabase = await createClient()

    // Insert link click record
    await supabase.from("link_clicks").insert({
      ww_id: wwId || null,
      link_type: linkType || "external", // "external" for external links, "download" for internal
      media_type: mediaType || null,
      tmdb_id: tmdbId || null,
      season_number: seasonNumber || null,
      episode_number: episodeNumber || null,
      referrer: request.headers.get("referer") || null,
      user_agent: request.headers.get("user-agent") || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Link click tracking error:", error)
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 })
  }
}
