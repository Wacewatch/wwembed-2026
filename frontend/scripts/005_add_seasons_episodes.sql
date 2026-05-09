-- Migration: Add season and episode support for TV shows

-- Add season_number and episode_number to streaming_links
ALTER TABLE public.streaming_links 
ADD COLUMN IF NOT EXISTS season_number INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS episode_number INTEGER DEFAULT NULL;

-- Add season_number and episode_number to download_links
ALTER TABLE public.download_links 
ADD COLUMN IF NOT EXISTS season_number INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS episode_number INTEGER DEFAULT NULL;

-- Add season_number and episode_number to embed_views
ALTER TABLE public.embed_views 
ADD COLUMN IF NOT EXISTS season_number INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS episode_number INTEGER DEFAULT NULL;

-- Add season_number and episode_number to link_clicks
ALTER TABLE public.link_clicks 
ADD COLUMN IF NOT EXISTS season_number INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS episode_number INTEGER DEFAULT NULL;

-- Add season_number and episode_number to api_usage
ALTER TABLE public.api_usage 
ADD COLUMN IF NOT EXISTS season_number INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS episode_number INTEGER DEFAULT NULL;

-- Update ww_id constraint on streaming_links to allow episode-specific links
-- Drop the unique constraint on ww_id since we may have multiple links per episode
ALTER TABLE public.streaming_links DROP CONSTRAINT IF EXISTS streaming_links_ww_id_key;

-- Create new indexes for season/episode queries
CREATE INDEX IF NOT EXISTS idx_streaming_links_episode ON public.streaming_links(tmdb_id, media_type, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_download_links_episode ON public.download_links(tmdb_id, media_type, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_embed_views_episode ON public.embed_views(tmdb_id, season_number, episode_number);
