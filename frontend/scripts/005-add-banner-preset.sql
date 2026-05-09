-- Add banner_preset column to profile_settings table
ALTER TABLE profile_settings 
ADD COLUMN IF NOT EXISTS banner_preset TEXT DEFAULT 'gradient-purple';
