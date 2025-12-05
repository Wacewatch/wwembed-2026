import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseWWId } from "@/lib/tmdb"

// JSON API to get all links for a media
export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params
  const parsed = parseWWId(wwId)

  if (!parsed) {
    return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })
  }

  const { mediaType, tmdbId } = parsed
  const supabase = await createClient()

  // Get streaming links
  const { data: streamingLinks } = await supabase
    .from("streaming_links")
    .select("id, source_name, source_url, quality, language, is_verified")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .eq("is_active", true)

  // Get auto-generated from APIs
  const { data: apis } = await supabase
    .from("third_party_apis")
    .select("*")
    .eq("api_type", "streaming")
    .eq("is_active", true)
    .order("priority", { ascending: true })

  const autoStreaming = (apis || []).map((api) => ({
    id: `auto-${api.id}`,
    source_name: api.name,
    source_url: api.url_pattern.replace("{tmdb_id}", String(tmdbId)).replace("{media_type}", mediaType),
    quality: "HD",
    language: "multi",
    is_verified: false,
    is_auto: true,
  }))

  // Get download links
  const { data: downloadLinks } = await supabase
    .from("download_links")
    .select("id, source_name, source_url, link_type, quality, file_size, language, is_verified")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .eq("is_active", true)

  // Log API usage
  await supabase.from("api_usage").insert({
    endpoint: `/api/v1/links/${wwId}`,
    method: "GET",
    ww_id: wwId,
    tmdb_id: tmdbId,
    media_type: mediaType,
    response_status: 200,
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  return NextResponse.json(
    {
      ww_id: wwId,
      tmdb_id: tmdbId,
      media_type: mediaType,
      streaming: [...autoStreaming, ...(streamingLinks || [])],
      download: downloadLinks || [],
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    },
  )
}
