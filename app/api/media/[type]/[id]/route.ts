import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMovieDetails, getTVDetails, getEpisodeDetails, generateWWId } from "@/lib/tmdb"

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params
  const tmdbId = Number.parseInt(id, 10)

  if (!["movie", "tv"].includes(type) || isNaN(tmdbId)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
  }

  const mediaType = type as "movie" | "tv"

  const searchParams = request.nextUrl.searchParams
  const seasonParam = searchParams.get("season")
  const episodeParam = searchParams.get("episode")
  const seasonNumber = seasonParam ? Number.parseInt(seasonParam, 10) : null
  const episodeNumber = episodeParam ? Number.parseInt(episodeParam, 10) : null

  const wwId = generateWWId(mediaType, tmdbId, seasonNumber, episodeNumber)

  // Get TMDB data
  const tmdbData = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)

  if (!tmdbData) {
    return NextResponse.json({ error: "Media not found on TMDB" }, { status: 404 })
  }

  let episodeData = null
  if (mediaType === "tv" && seasonNumber !== null && episodeNumber !== null) {
    episodeData = await getEpisodeDetails(tmdbId, seasonNumber, episodeNumber)
  }

  const supabase = await createClient()

  let streamingQuery = supabase
    .from("streaming_links")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .eq("is_active", true)

  // For TV shows, get links matching the specific season/episode or generic ones
  if (mediaType === "tv") {
    if (seasonNumber !== null && episodeNumber !== null) {
      // Get specific episode links OR generic show/season links
      streamingQuery = streamingQuery.or(
        `and(season_number.eq.${seasonNumber},episode_number.eq.${episodeNumber}),and(season_number.is.null,episode_number.is.null)`,
      )
    } else if (seasonNumber !== null) {
      // Get season-level links or generic show links
      streamingQuery = streamingQuery.or(
        `and(season_number.eq.${seasonNumber},episode_number.is.null),and(season_number.is.null,episode_number.is.null)`,
      )
    }
  }

  const { data: userStreamingLinks } = await streamingQuery.order("created_at", { ascending: false })

  // Get auto-generated links from third-party APIs
  const { data: apis } = await supabase
    .from("third_party_apis")
    .select("*")
    .eq("api_type", "streaming")
    .eq("is_active", true)
    .order("priority", { ascending: true })

  const autoStreamingLinks = (apis || []).map((api) => {
    let url = api.url_pattern.replace("{tmdb_id}", String(tmdbId)).replace("{media_type}", mediaType)

    // Replace season/episode placeholders
    if (mediaType === "tv") {
      url = url
        .replace("{season}", seasonNumber !== null ? String(seasonNumber) : "1")
        .replace("{episode}", episodeNumber !== null ? String(episodeNumber) : "1")
        .replace("{season_number}", seasonNumber !== null ? String(seasonNumber) : "1")
        .replace("{episode_number}", episodeNumber !== null ? String(episodeNumber) : "1")
    }

    return {
      id: `auto-${api.id}`,
      tmdb_id: tmdbId,
      media_type: mediaType,
      ww_id: wwId,
      source_name: api.name,
      source_url: url,
      quality: "HD",
      language: "multi",
      is_auto_generated: true,
      is_verified: false,
      is_active: true,
      created_at: new Date().toISOString(),
      season_number: seasonNumber,
      episode_number: episodeNumber,
    }
  })

  // Combine all streaming links
  const streamingLinks = [...autoStreamingLinks, ...(userStreamingLinks || [])]

  let downloadQuery = supabase
    .from("download_links")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .eq("is_active", true)

  if (mediaType === "tv") {
    if (seasonNumber !== null && episodeNumber !== null) {
      downloadQuery = downloadQuery.or(
        `and(season_number.eq.${seasonNumber},episode_number.eq.${episodeNumber}),and(season_number.is.null,episode_number.is.null)`,
      )
    } else if (seasonNumber !== null) {
      downloadQuery = downloadQuery.or(
        `and(season_number.eq.${seasonNumber},episode_number.is.null),and(season_number.is.null,episode_number.is.null)`,
      )
    }
  }

  const { data: downloadLinks } = await downloadQuery.order("created_at", { ascending: false })

  // Log API usage with season/episode
  await supabase.from("api_usage").insert({
    endpoint: `/api/media/${type}/${id}`,
    method: "GET",
    ww_id: wwId,
    tmdb_id: tmdbId,
    media_type: mediaType,
    season_number: seasonNumber,
    episode_number: episodeNumber,
    response_status: 200,
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  return NextResponse.json({
    tmdbData,
    episodeData,
    streamingLinks,
    downloadLinks: downloadLinks || [],
    wwId,
    seasonNumber,
    episodeNumber,
  })
}
