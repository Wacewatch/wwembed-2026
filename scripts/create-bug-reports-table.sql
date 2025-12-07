-- Create bug_reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ww_id TEXT NOT NULL,
  media_type TEXT,
  tmdb_id INTEGER,
  season_number INTEGER,
  episode_number INTEGER,
  title TEXT,
  source_name TEXT,
  source_url TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fixed', 'impossible')),
  reporter_ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  embed_type TEXT DEFAULT 'streaming',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_note TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bug_reports_ww_id ON bug_reports(ww_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to insert bug reports
CREATE POLICY "Anyone can insert bug reports" ON bug_reports
  FOR INSERT WITH CHECK (true);

-- Policy for admins to read and update bug reports
CREATE POLICY "Admins can manage bug reports" ON bug_reports
  FOR ALL USING (true);
