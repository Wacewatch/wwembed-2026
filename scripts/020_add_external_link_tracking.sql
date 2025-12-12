-- Add columns for external link tracking to link_clicks table
ALTER TABLE public.link_clicks 
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS host_name TEXT,
ADD COLUMN IF NOT EXISTS quality TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS external_link_id TEXT,
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;

-- Create index for external link queries
CREATE INDEX IF NOT EXISTS idx_link_clicks_external ON public.link_clicks(is_external) WHERE is_external = true;
CREATE INDEX IF NOT EXISTS idx_link_clicks_provider ON public.link_clicks(provider) WHERE provider IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.link_clicks.is_external IS 'True if this is an external link (from Movix API), false for internal links';
COMMENT ON COLUMN public.link_clicks.provider IS 'External link provider name (e.g., 1fichier, uptobox)';
COMMENT ON COLUMN public.link_clicks.host_name IS 'Host name of the external link';
