-- Add language and is_anonymous columns to third_party_apis table
ALTER TABLE third_party_apis 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'VO',
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Update existing APIs to have default values
UPDATE third_party_apis 
SET language = 'VO', is_anonymous = false 
WHERE language IS NULL OR is_anonymous IS NULL;
