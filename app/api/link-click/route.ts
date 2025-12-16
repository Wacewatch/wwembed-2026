import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      linkId,
      linkType,
      wwId,
      tmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
      isExternal,
      provider,
      hostName,
      quality,
      language,
      fileSize,
      externalLinkId,
    } = body

    // Get IP and hash it for privacy
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0] : "unknown"
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16)

    const userAgent = request.headers.get("user-agent") || null
    const referrer = request.headers.get("referer") || null

    const isExternalLink = isExternal === true || linkType === "external"

    // Insert click record with external link info
    const { error } = await supabase.from("link_clicks").insert({
      link_id: linkId || null,
      link_type: linkType || "download",
      ww_id: wwId || null,
      tmdb_id: tmdbId || null,
      media_type: mediaType || null,
      season_number: seasonNumber || null,
      episode_number: episodeNumber || null,
      ip_hash: ipHash,
      user_agent: userAgent,
      referrer: referrer,
      is_external: isExternalLink,
      provider: provider || null,
      host_name: hostName || null,
      quality: quality || null,
      language: language || null,
      file_size: fileSize || null,
      external_link_id: externalLinkId || null,
    })

    if (error) {
      console.error("[v0] Error inserting link click:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, isExternal: isExternalLink })
  } catch (error) {
    console.error("[v0] Error tracking link click:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
