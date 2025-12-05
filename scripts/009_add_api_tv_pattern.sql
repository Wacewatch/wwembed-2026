-- Add separate URL pattern for TV shows (series with seasons/episodes)
ALTER TABLE third_party_apis ADD COLUMN IF NOT EXISTS url_pattern_movie TEXT;
ALTER TABLE third_party_apis ADD COLUMN IF NOT EXISTS url_pattern_tv TEXT;

-- Migrate existing data: copy url_pattern to both columns
UPDATE third_party_apis 
SET url_pattern_movie = url_pattern,
    url_pattern_tv = url_pattern
WHERE url_pattern_movie IS NULL OR url_pattern_tv IS NULL;

-- Make the new columns required for future entries
-- Keep url_pattern for backwards compatibility but it will be deprecated

-- Update existing default APIs with proper patterns
UPDATE third_party_apis 
SET url_pattern_movie = 'https://vidsrc.xyz/embed/movie/{tmdb_id}',
    url_pattern_tv = 'https://vidsrc.xyz/embed/tv/{tmdb_id}/{season}/{episode}'
WHERE name = 'VidSrc';

UPDATE third_party_apis 
SET url_pattern_movie = 'https://www.2embed.cc/embed/movie?tmdb={tmdb_id}',
    url_pattern_tv = 'https://www.2embed.cc/embed/tv?tmdb={tmdb_id}&s={season}&e={episode}'
WHERE name = '2Embed';

UPDATE third_party_apis 
SET url_pattern_movie = 'https://multiembed.mov/directstream.php?video_id={tmdb_id}&tmdb=1',
    url_pattern_tv = 'https://multiembed.mov/directstream.php?video_id={tmdb_id}&tmdb=1&s={season}&e={episode}'
WHERE name = 'MultiEmbed';
