-- Create live TV sources table for multiple streams per channel
CREATE TABLE IF NOT EXISTS live_tv_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES live_tv_channels(id) ON DELETE CASCADE,
  source_name VARCHAR(255) DEFAULT 'Source',
  stream_url TEXT NOT NULL,
  quality VARCHAR(20) DEFAULT 'HD',
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_live_tv_sources_channel ON live_tv_sources(channel_id);
CREATE INDEX IF NOT EXISTS idx_live_tv_sources_status ON live_tv_sources(status);

-- RLS Policies
ALTER TABLE live_tv_sources ENABLE ROW LEVEL SECURITY;

-- Everyone can view approved active sources
CREATE POLICY "live_tv_sources_select_approved" ON live_tv_sources
  FOR SELECT
  USING (is_active = true AND status = 'approved');

-- Authenticated users can insert
CREATE POLICY "live_tv_sources_insert_auth" ON live_tv_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own pending sources
CREATE POLICY "live_tv_sources_update_own" ON live_tv_sources
  FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid() AND status = 'pending');

-- Migrate existing stream_url from channels to sources table
INSERT INTO live_tv_sources (channel_id, source_name, stream_url, quality, is_active, status, submitted_by)
SELECT id, 'Source principale', stream_url, quality, true, 'approved', submitted_by
FROM live_tv_channels
WHERE stream_url IS NOT NULL AND stream_url != '';

-- Make stream_url nullable in channels (we now use sources table)
ALTER TABLE live_tv_channels ALTER COLUMN stream_url DROP NOT NULL;
