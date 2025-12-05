export interface StreamingLink {
  id: string
  tmdb_id: number
  media_type: "movie" | "tv"
  ww_id: string
  source_name: string
  source_url: string
  quality: string
  language: string
  is_auto_generated: boolean
  is_verified: boolean
  is_active: boolean
  status: "pending" | "approved" | "rejected"
  submitted_by: string | null
  created_at: string
  season_number: number | null
  episode_number: number | null
}

export interface DownloadLink {
  id: string
  tmdb_id: number
  media_type: "movie" | "tv"
  ww_id: string
  source_name: string
  source_url: string
  link_type: "direct" | "torrent" | "magnet"
  quality: string
  file_size: string | null
  language: string
  is_auto_generated: boolean
  is_verified: boolean
  is_active: boolean
  status: "pending" | "approved" | "rejected"
  submitted_by: string | null
  created_at: string
  season_number: number | null
  episode_number: number | null
}

// ThirdPartyAPI interface has been updated to include url_pattern_movie and url_pattern_tv
export interface ThirdPartyAPI {
  id: string
  name: string
  base_url: string
  url_pattern: string
  url_pattern_movie: string | null
  url_pattern_tv: string | null
  api_type: "streaming" | "download" | "torrent"
  is_active: boolean
  priority: number
  created_at: string
}

export interface Profile {
  id: string
  email: string
  username: string | null
  role: "admin" | "uploader" | "member"
  created_at: string
}

export interface EmbedStats {
  total_views: number
  total_clicks: number
  unique_visitors: number
  top_referrers: { referrer: string; count: number }[]
  views_by_day: { date: string; count: number }[]
}

export interface DailyStats {
  stat_date: string
  total_embed_views: number
  total_link_clicks: number
  total_api_calls: number
  unique_visitors: number
}

// TMDB Types
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

export interface TMDBSeason {
  id: number
  name: string
  overview: string
  season_number: number
  poster_path: string | null
  air_date: string
  episode_count: number
  episodes?: TMDBEpisode[]
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
  seasons?: TMDBSeason[]
}

export interface LiveTVChannel {
  id: string
  channel_name: string
  channel_logo: string | null
  stream_url: string | null // Now nullable since we use sources table
  category: string
  country: string
  language: string
  quality: string
  is_active: boolean
  status: "pending" | "approved" | "rejected"
  submitted_by: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export interface LiveTVSource {
  id: string
  channel_id: string
  source_name: string
  stream_url: string
  quality: string
  is_active: boolean
  status: "pending" | "approved" | "rejected"
  submitted_by: string | null
  created_at: string
}
