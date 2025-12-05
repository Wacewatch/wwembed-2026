-- WWEmbed Database Schema
-- Tables for users, links, third-party APIs, and statistics

-- Profiles table with roles (admin, uploader, member)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'uploader', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Third-party API configurations (for auto-generating links)
CREATE TABLE IF NOT EXISTS public.third_party_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  url_pattern TEXT NOT NULL, -- Pattern with {tmdb_id} placeholder
  api_type TEXT NOT NULL CHECK (api_type IN ('streaming', 'download', 'torrent')),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-submitted streaming links
CREATE TABLE IF NOT EXISTS public.streaming_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  ww_id TEXT UNIQUE NOT NULL, -- Format: ww-movie-123456 or ww-tv-123456
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  quality TEXT DEFAULT 'HD',
  language TEXT DEFAULT 'multi',
  is_auto_generated BOOLEAN DEFAULT false,
  api_source_id UUID REFERENCES public.third_party_apis(id),
  submitted_by UUID REFERENCES public.profiles(id),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-submitted download links
CREATE TABLE IF NOT EXISTS public.download_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  ww_id TEXT NOT NULL, -- Format: ww-movie-123456 or ww-tv-123456
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('direct', 'torrent', 'magnet')),
  quality TEXT DEFAULT 'HD',
  file_size TEXT,
  language TEXT DEFAULT 'multi',
  is_auto_generated BOOLEAN DEFAULT false,
  api_source_id UUID REFERENCES public.third_party_apis(id),
  submitted_by UUID REFERENCES public.profiles(id),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statistics: Embed views
CREATE TABLE IF NOT EXISTS public.embed_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ww_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  embed_type TEXT NOT NULL CHECK (embed_type IN ('streaming', 'download')),
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT, -- Hashed for privacy
  country TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statistics: Link clicks
CREATE TABLE IF NOT EXISTS public.link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID,
  link_type TEXT NOT NULL CHECK (link_type IN ('streaming', 'download')),
  ww_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  country TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statistics: API usage
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ww_id TEXT,
  tmdb_id INTEGER,
  media_type TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily aggregated statistics
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  total_embed_views INTEGER DEFAULT 0,
  total_link_clicks INTEGER DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  top_media_type TEXT,
  top_tmdb_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stat_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_streaming_links_tmdb ON public.streaming_links(tmdb_id, media_type);
CREATE INDEX IF NOT EXISTS idx_streaming_links_ww_id ON public.streaming_links(ww_id);
CREATE INDEX IF NOT EXISTS idx_download_links_tmdb ON public.download_links(tmdb_id, media_type);
CREATE INDEX IF NOT EXISTS idx_download_links_ww_id ON public.download_links(ww_id);
CREATE INDEX IF NOT EXISTS idx_embed_views_ww_id ON public.embed_views(ww_id);
CREATE INDEX IF NOT EXISTS idx_embed_views_date ON public.embed_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_link_clicks_date ON public.link_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON public.api_usage(created_at);
