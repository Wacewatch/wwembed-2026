import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { linkId, linkType, wwId, tmdbId, mediaType, seasonNumber, episodeNumber } = body

    const supabase = await createClient()

    // Get IP hash for anonymization
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0] : "unknown"
    const ipHash = Buffer.from(ip).toString("base64").substring(0, 16)

    // Get user agent and referrer
    const userAgent = request.headers.get("user-agent") || ""
    const referrer = request.headers.get("referer") || ""

    // Insert click record
    const { error } = await supabase.from("link_clicks").insert({
      link_id: linkId || null,
      link_type: linkType || "download",
      ww_id: wwId || null,
      tmdb_id: tmdbId || null,
      media_type: mediaType || null,
      season_number: seasonNumber || null,
      episode_number: episodeNumber || null,
      ip_hash: ipHash,
      user_agent: userAgent.substring(0, 500),
      referrer: referrer.substring(0, 500),
      clicked_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error inserting link click:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking link click:", error)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
