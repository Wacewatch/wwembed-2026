-- Add validation columns to streaming_links table
ALTER TABLE streaming_links
ADD COLUMN IF NOT EXISTS is_valid boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_checked timestamp with time zone DEFAULT NULL;

-- Create index for faster queries on invalid links
CREATE INDEX IF NOT EXISTS idx_streaming_links_is_valid ON streaming_links(is_valid);
CREATE INDEX IF NOT EXISTS idx_streaming_links_last_checked ON streaming_links(last_checked);
