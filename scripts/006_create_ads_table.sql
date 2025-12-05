-- Table pour gérer les publicités (jusqu'à 3)
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 3),
  name VARCHAR(255) NOT NULL,
  ad_url TEXT NOT NULL,
  ad_type VARCHAR(50) DEFAULT 'popup', -- popup, redirect, iframe
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_number)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(is_active);
CREATE INDEX IF NOT EXISTS idx_ads_slot ON ads(slot_number);

-- RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les pubs actives
CREATE POLICY "Anyone can read active ads"
  ON ads FOR SELECT
  USING (is_active = true);

-- Admins peuvent tout faire
CREATE POLICY "Admins can manage ads"
  ON ads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Table pour tracker les clics publicitaires
CREATE TABLE IF NOT EXISTS ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  ww_id VARCHAR(100),
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  referrer TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_ad_clicks_ad_id ON ad_clicks(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_date ON ad_clicks(clicked_at);

ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ad clicks"
  ON ad_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read ad clicks"
  ON ad_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
