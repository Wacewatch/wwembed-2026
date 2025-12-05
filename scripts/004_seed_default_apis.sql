-- Seed some default third-party streaming APIs with season/episode support
-- Updated URL patterns to include season/episode placeholders
INSERT INTO public.third_party_apis (name, base_url, url_pattern, api_type, is_active, priority) VALUES
('VidSrc', 'https://vidsrc.xyz', 'https://vidsrc.xyz/embed/{media_type}/{tmdb_id}/{season}/{episode}', 'streaming', true, 1),
('2Embed', 'https://2embed.cc', 'https://2embed.cc/embed/{media_type}/{tmdb_id}/{season}/{episode}', 'streaming', true, 2),
('VidSrc Pro', 'https://vidsrc.pro', 'https://vidsrc.pro/embed/{media_type}/{tmdb_id}/{season}/{episode}', 'streaming', true, 3),
('SuperEmbed', 'https://multiembed.mov', 'https://multiembed.mov/?video_id={tmdb_id}&{media_type}=1&s={season}&e={episode}', 'streaming', true, 4),
('VidSrc.to', 'https://vidsrc.to', 'https://vidsrc.to/embed/{media_type}/{tmdb_id}/{season}/{episode}', 'streaming', true, 5)
ON CONFLICT DO NOTHING;
