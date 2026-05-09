import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const TMDB_API_KEY = process.env.TMDB_API_KEY || "demo"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"

export async function GET() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch TMDB stats and database stats in parallel
    const [discoverMovies, discoverTv, allApis, downloadLinks, digitalDownloadLinks] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`),
      fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=fr-FR&page=1`),
      supabase.from("third_party_apis").select("id, url_pattern_movie, url_pattern_tv").eq("is_active", true),
      supabase.from("download_links").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("digital_download_links").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ])

    const discoverMoviesData = await discoverMovies.json()
    const discoverTvData = await discoverTv.json()

    const totalMovies = discoverMoviesData.total_results || 0
    const totalTvShows = discoverTvData.total_results || 0
    const estimatedEpisodes = totalTvShows * 20

    const apis = allApis.data || []
    const movieApiCount = apis.filter((api: any) => api.url_pattern_movie && api.url_pattern_movie.trim() !== "").length
    const tvApiCount = apis.filter((api: any) => api.url_pattern_tv && api.url_pattern_tv.trim() !== "").length

    const totalStreamingLinks = totalMovies * movieApiCount + estimatedEpisodes * tvApiCount
    const totalDownloadLinks = (downloadLinks.count || 0) + (digitalDownloadLinks.count || 0)

    return NextResponse.json({
      movies: totalMovies,
      tvShows: totalTvShows,
      episodes: estimatedEpisodes,
      movieApiCount,
      tvApiCount,
      totalStreamingLinks,
      totalDownloadLinks,
    })
  } catch (error) {
    console.error("Error fetching TMDB stats:", error)
    return NextResponse.json(
      {
        movies: 0,
        tvShows: 0,
        episodes: 0,
        movieApiCount: 0,
        tvApiCount: 0,
        totalStreamingLinks: 0,
        totalDownloadLinks: 0,
      },
      { status: 500 },
    )
  }
}
