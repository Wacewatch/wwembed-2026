-- Add avatar_url column to profile_settings table
ALTER TABLE profile_settings 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add avatar_preset column for predefined avatars
ALTER TABLE profile_settings 
ADD COLUMN IF NOT EXISTS avatar_preset text DEFAULT 'default';
