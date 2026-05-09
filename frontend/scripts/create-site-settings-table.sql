-- Create site_settings table for admin-configurable settings
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  live_tv_ticker_enabled boolean DEFAULT false,
  live_tv_ticker_message text DEFAULT 'Bienvenue sur WWEmbed - Votre plateforme de streaming',
  live_tv_ticker_speed integer DEFAULT 50,
  live_tv_ticker_bg_color varchar(20) DEFAULT '#ef4444',
  live_tv_ticker_text_color varchar(20) DEFAULT '#ffffff',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Insert default settings
INSERT INTO site_settings (live_tv_ticker_enabled, live_tv_ticker_message)
VALUES (false, 'Bienvenue sur WWEmbed - Votre plateforme de streaming')
ON CONFLICT DO NOTHING;

-- RLS policies
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON site_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
