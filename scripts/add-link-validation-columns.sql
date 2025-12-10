-- Add validation columns to download_links table
ALTER TABLE download_links 
ADD COLUMN IF NOT EXISTS is_valid boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_checked timestamp with time zone;

-- Add validation columns to digital_download_links table  
ALTER TABLE digital_download_links
ADD COLUMN IF NOT EXISTS is_valid boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_checked timestamp with time zone;

-- Create index for faster queries on invalid links
CREATE INDEX IF NOT EXISTS idx_download_links_is_valid ON download_links(is_valid);
CREATE INDEX IF NOT EXISTS idx_digital_download_links_is_valid ON digital_download_links(is_valid);
