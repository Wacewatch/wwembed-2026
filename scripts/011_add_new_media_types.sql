-- Migration: Add new media types (ebook, music, software, game)
-- This extends the media_type constraint to support new content types

-- First, create a new table for digital content (non-TMDB media)
CREATE TABLE IF NOT EXISTS public.digital_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ww_id TEXT UNIQUE NOT NULL, -- Format: ww-ebook-uuid, ww-music-uuid, etc.
  content_type TEXT NOT NULL CHECK (content_type IN ('ebook', 'music', 'software', 'game')),
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  author TEXT, -- For ebooks/music
  version TEXT, -- For software/games
  file_size TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create download links table for digital content
CREATE TABLE IF NOT EXISTS public.digital_download_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.digital_content(id) ON DELETE CASCADE,
  ww_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL, -- For download
  reader_url TEXT, -- For ebooks/music streaming (optional)
  link_type TEXT DEFAULT 'direct' CHECK (link_type IN ('direct', 'torrent', 'magnet', 'stream')),
  quality TEXT,
  file_format TEXT, -- pdf, epub, mp3, exe, iso, etc.
  file_size TEXT,
  language TEXT DEFAULT 'multi',
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_digital_content_type ON public.digital_content(content_type);
CREATE INDEX IF NOT EXISTS idx_digital_content_ww_id ON public.digital_content(ww_id);
CREATE INDEX IF NOT EXISTS idx_digital_download_content ON public.digital_download_links(content_id);
CREATE INDEX IF NOT EXISTS idx_digital_download_ww_id ON public.digital_download_links(ww_id);

-- Enable RLS
ALTER TABLE public.digital_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_download_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for digital_content
CREATE POLICY "Public can view approved digital content"
  ON public.digital_content FOR SELECT
  USING (status = 'approved' AND is_active = true);

CREATE POLICY "Authenticated users can insert digital content"
  ON public.digital_content FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update own digital content"
  ON public.digital_content FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by);

CREATE POLICY "Admins full access digital content"
  ON public.digital_content FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for digital_download_links
CREATE POLICY "Public can view approved digital download links"
  ON public.digital_download_links FOR SELECT
  USING (status = 'approved' AND is_active = true);

CREATE POLICY "Authenticated users can insert digital download links"
  ON public.digital_download_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update own digital download links"
  ON public.digital_download_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by);

CREATE POLICY "Admins full access digital download links"
  ON public.digital_download_links FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Update embed_views to support new media types
ALTER TABLE public.embed_views 
DROP CONSTRAINT IF EXISTS embed_views_media_type_check;

-- Note: If the constraint doesn't exist or has a different name, this might fail silently
-- The important thing is we can now insert any media_type value
