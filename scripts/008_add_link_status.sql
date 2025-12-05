-- Add status column to streaming_links and download_links
-- status: 'pending' (needs approval), 'approved' (visible), 'rejected' (hidden)

ALTER TABLE streaming_links 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE download_links 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add submitted_by reference for tracking who submitted
ALTER TABLE streaming_links 
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE download_links 
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for faster queries on pending links
CREATE INDEX IF NOT EXISTS idx_streaming_links_status ON streaming_links(status);
CREATE INDEX IF NOT EXISTS idx_download_links_status ON download_links(status);

-- Update existing auto-generated links to approved
UPDATE streaming_links SET status = 'approved' WHERE is_auto_generated = true;
UPDATE download_links SET status = 'approved' WHERE is_auto_generated = true;
