-- Add new metadata columns to download_links table for movies, series, and episodes
ALTER TABLE download_links
ADD COLUMN IF NOT EXISTS release_name TEXT,
ADD COLUMN IF NOT EXISTS codec_video TEXT,
ADD COLUMN IF NOT EXISTS codec_audio TEXT,
ADD COLUMN IF NOT EXISTS resolution TEXT,
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS nfo TEXT,
ADD COLUMN IF NOT EXISTS has_audio_description BOOLEAN DEFAULT FALSE;

-- Add index for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_download_links_submitted_by ON download_links(submitted_by);
