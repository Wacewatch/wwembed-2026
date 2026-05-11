/**
 * GET /api/v1/download_links/for-content
 *
 * Query params:
 *   tmdb_id     (required, integer)
 *   media_type  (required, "movie" | "tv")
 *   season      (optional, integer; tv only)
 *   episode     (optional, integer; tv only — requires season)
 *
 * Used by WaveWatch on a film / série / épisode page.
 * Sorted by quality (best first) then created_at (newest first).
 *
 * Response: { items: [...], count }
 */
import { NextRequest, NextResponse } from "next/server"
import {
  BASE_FILTER,
  queryDownloadLinks,
  requireApiKey,
} from "@/lib/wavewatch-api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = requireApiKey(req)
  if (denied) return denied

  const sp = req.nextUrl.searchParams
  const tmdbIdRaw = sp.get("tmdb_id")
  const mediaType = sp.get("media_type")
  const seasonRaw = sp.get("season")
  const episodeRaw = sp.get("episode")

  if (!tmdbIdRaw) {
    return NextResponse.json(
      { error: "Bad request", reason: "tmdb_id is required" },
      { status: 400 }
    )
  }
  const tmdbId = Number.parseInt(tmdbIdRaw, 10)
  if (!Number.isFinite(tmdbId)) {
    return NextResponse.json(
      { error: "Bad request", reason: "tmdb_id must be an integer" },
      { status: 400 }
    )
  }

  if (mediaType !== "movie" && mediaType !== "tv") {
    return NextResponse.json(
      { error: "Bad request", reason: "media_type must be 'movie' or 'tv'" },
      { status: 400 }
    )
  }

  const filter: Record<string, any> = {
    ...BASE_FILTER,
    tmdb_id: tmdbId,
    media_type: mediaType,
  }

  if (mediaType === "tv") {
    if (seasonRaw != null && seasonRaw !== "") {
      const season = Number.parseInt(seasonRaw, 10)
      if (!Number.isFinite(season)) {
        return NextResponse.json(
          { error: "Bad request", reason: "season must be an integer" },
          { status: 400 }
        )
      }
      filter.season_number = season
      if (episodeRaw != null && episodeRaw !== "") {
        const episode = Number.parseInt(episodeRaw, 10)
        if (!Number.isFinite(episode)) {
          return NextResponse.json(
            { error: "Bad request", reason: "episode must be an integer" },
            { status: 400 }
          )
        }
        filter.episode_number = episode
      }
    } else if (episodeRaw != null && episodeRaw !== "") {
      return NextResponse.json(
        { error: "Bad request", reason: "episode requires season" },
        { status: 400 }
      )
    }
  }

  try {
    // Fetch enough to cover any sane "all links for this content" use case,
    // then sort in memory by quality (best first) → created_at desc.
    const { items, total } = await queryDownloadLinks({
      filter,
      sort: { created_at: -1 },
      limit: 5000,
    })
    // Sort by quality desc, fallback created_at desc (already from Mongo).
    const sorted = items
      .slice()
      .sort((a, b) => {
        const qa = a.quality ? 1 : 0
        const qb = b.quality ? 1 : 0
        if (qa !== qb) return qb - qa
        return 0
      })
    void total
    // Apply quality rank ordering using helper from queryDownloadLinks would
    // require a re-query — items are already normalized so do it here.
    const QUALITY_RANK: Record<string, number> = {
      "8k": 8,
      "4320p": 8,
      "4k": 7,
      "2160p": 7,
      "1440p": 6,
      "2k": 6,
      "1080p": 5,
      fhd: 5,
      "720p": 4,
      hd: 4,
      "576p": 3,
      "480p": 2,
      sd: 2,
      "360p": 1,
      "240p": 0,
    }
    const rank = (q: any) =>
      typeof q === "string" ? QUALITY_RANK[q.toLowerCase().trim()] ?? -1 : -1
    sorted.sort((a, b) => rank(b.quality) - rank(a.quality))

    return NextResponse.json({ items: sorted, count: sorted.length })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", reason: e?.message || "unknown" },
      { status: 500 }
    )
  }
}
