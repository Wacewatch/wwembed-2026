const TMDB_API_KEY = process.env.TMDB_API_KEY || "demo"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"

export interface TMDBMovie {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  runtime?: number
  genres?: { id: number; name: string }[]
}

export interface TMDBTVShow {
  id: number
  name: string
  original_name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  number_of_seasons?: number
  number_of_episodes?: number
  genres?: { id: number; name: string }[]
  seasons?: Array<{
    id: number
    name: string
    season_number: number
    episode_count: number
    poster_path: string | null
    air_date: string
  }>
}

export interface TMDBEpisode {
  id: number
  name: string
  overview: string
  episode_number: number
  season_number: number
  still_path: string | null
  air_date: string
  vote_average: number
  runtime: number | null
}

export interface TMDBSeasonDetails {
  id: number
  name: string
  overview: string
  season_number: number
  poster_path: string | null
  air_date: string
  episodes: TMDBEpisode[]
}

export interface TMDBSearchResult {
  id: number
  title?: string
  name?: string
  media_type: "movie" | "tv"
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  overview: string
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovie | null> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getTVDetails(tmdbId: number): Promise<TMDBTVShow | null> {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=fr-FR`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getSeasonDetails(tmdbId: number, seasonNumber: number): Promise<TMDBSeasonDetails | null> {
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getEpisodeDetails(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<TMDBEpisode | null> {
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export function getPosterUrl(path: string | null, size = "w500"): string {
  if (!path) return "/abstract-movie-poster.png"
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function getBackdropUrl(path: string | null, size = "w1280"): string {
  if (!path) return "/movie-backdrop.png"
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function getStillUrl(path: string | null, size = "w500"): string {
  if (!path) return "/episode-still.jpg"
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export async function searchMedia(query: string): Promise<TMDBSearchResult[]> {
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=fr-FR&query=${encodeURIComponent(query)}&page=1`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const data = await res.json()
    // Filter only movies and TV shows
    return data.results
      .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 10)
      .map((r: any) => ({
        id: r.id,
        title: r.title,
        name: r.name,
        media_type: r.media_type,
        poster_path: r.poster_path,
        release_date: r.release_date,
        first_air_date: r.first_air_date,
        vote_average: r.vote_average,
        overview: r.overview,
      }))
  } catch {
    return []
  }
}

export function generateWWId(
  mediaType: "movie" | "tv",
  tmdbId: number,
  seasonNumber?: number | null,
  episodeNumber?: number | null,
): string {
  let wwId = `ww-${mediaType}-${tmdbId}`
  if (mediaType === "tv" && seasonNumber !== undefined && seasonNumber !== null) {
    wwId += `-s${seasonNumber}`
    if (episodeNumber !== undefined && episodeNumber !== null) {
      wwId += `-e${episodeNumber}`
    }
  }
  return wwId
}

export function parseWWId(wwId: string): {
  mediaType: "movie" | "tv"
  tmdbId: number
  seasonNumber?: number
  episodeNumber?: number
} | null {
  // Format: ww-movie-123456 or ww-tv-123456 or ww-tv-123456-s1 or ww-tv-123456-s1-e5
  const movieMatch = wwId.match(/^ww-movie-(\d+)$/)
  if (movieMatch) {
    return {
      mediaType: "movie",
      tmdbId: Number.parseInt(movieMatch[1], 10),
    }
  }

  const tvFullMatch = wwId.match(/^ww-tv-(\d+)(?:-s(\d+))?(?:-e(\d+))?$/)
  if (tvFullMatch) {
    return {
      mediaType: "tv",
      tmdbId: Number.parseInt(tvFullMatch[1], 10),
      seasonNumber: tvFullMatch[2] ? Number.parseInt(tvFullMatch[2], 10) : undefined,
      episodeNumber: tvFullMatch[3] ? Number.parseInt(tvFullMatch[3], 10) : undefined,
    }
  }

  return null
}
