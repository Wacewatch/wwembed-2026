-- Table pour les paramètres de profil personnalisables
CREATE TABLE IF NOT EXISTS profile_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme VARCHAR(50) DEFAULT 'dark',
  primary_color VARCHAR(50) DEFAULT 'cyan',
  bio TEXT,
  social_twitter VARCHAR(255),
  social_discord VARCHAR(255),
  social_website VARCHAR(255),
  show_email BOOLEAN DEFAULT false,
  show_stats BOOLEAN DEFAULT true,
  banner_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view profile settings
CREATE POLICY "profile_settings_select_all" ON profile_settings FOR SELECT USING (true);

-- Users can insert their own settings
CREATE POLICY "profile_settings_insert_own" ON profile_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "profile_settings_update_own" ON profile_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can delete any settings
CREATE POLICY "profile_settings_delete_admin" ON profile_settings FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
