-- Create live TV channels table
CREATE TABLE IF NOT EXISTS live_tv_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_name VARCHAR(255) NOT NULL,
  channel_logo VARCHAR(500),
  stream_url TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  country VARCHAR(50) DEFAULT 'fr',
  language VARCHAR(50) DEFAULT 'fr',
  quality VARCHAR(20) DEFAULT 'HD',
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID REFERENCES profiles(id),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_live_tv_active ON live_tv_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_live_tv_category ON live_tv_channels(category);
CREATE INDEX IF NOT EXISTS idx_live_tv_country ON live_tv_channels(country);
CREATE INDEX IF NOT EXISTS idx_live_tv_status ON live_tv_channels(status);

-- RLS Policies
ALTER TABLE live_tv_channels ENABLE ROW LEVEL SECURITY;

-- Everyone can view approved active channels
CREATE POLICY "live_tv_select_approved" ON live_tv_channels
  FOR SELECT
  USING (is_active = true AND status = 'approved');

-- Authenticated users can insert
CREATE POLICY "live_tv_insert_auth" ON live_tv_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own pending channels
CREATE POLICY "live_tv_update_own" ON live_tv_channels
  FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid() AND status = 'pending');

-- Admins can do everything (will be handled in app logic)

-- Create unique ww_id generator for live TV
CREATE OR REPLACE FUNCTION generate_live_tv_ww_id(channel_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN 'ww-live-' || SUBSTRING(channel_id::text, 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Add increment function for view count
CREATE OR REPLACE FUNCTION increment_live_tv_views(channel_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE live_tv_channels SET view_count = view_count + 1 WHERE id = channel_id;
END;
$$ LANGUAGE plpgsql;
