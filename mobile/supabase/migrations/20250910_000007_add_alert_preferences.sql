-- Add fall_alerts_enabled and sleep_alerts_enabled columns to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS fall_alerts_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sleep_alerts_enabled BOOLEAN DEFAULT true;

-- Update existing rows to have default values
UPDATE user_preferences
SET 
    fall_alerts_enabled = COALESCE(fall_alerts_enabled, true),
    sleep_alerts_enabled = COALESCE(sleep_alerts_enabled, true)
WHERE fall_alerts_enabled IS NULL OR sleep_alerts_enabled IS NULL;

