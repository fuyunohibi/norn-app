-- Allow service role and backend to insert sensor readings and alerts
-- This is needed for the backend API to store data from ESP32 devices

-- Drop ALL existing policies that might conflict
DROP POLICY IF EXISTS "Users can insert own readings" ON sensor_readings;
DROP POLICY IF EXISTS "Users can insert own alerts" ON alerts;
DROP POLICY IF EXISTS "Service role can insert sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Service role can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Allow sensor readings inserts" ON sensor_readings;
DROP POLICY IF EXISTS "Allow alerts inserts" ON alerts;
DROP POLICY IF EXISTS "Service role can view sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Service role can view alerts" ON alerts;

-- Policy for sensor_readings: Allow inserts when user_id matches OR when user_id is NULL (for ESP32/backend data)
-- Simplest approach: allow NULL user_id (ESP32 data) and matching user_id (authenticated users)
CREATE POLICY "Allow sensor readings inserts" ON sensor_readings
    FOR INSERT 
    WITH CHECK (
        user_id IS NULL OR
        auth.uid() = user_id
    );

-- Policy for alerts: Allow inserts when user_id matches OR when user_id is NULL (for ESP32/backend data)
CREATE POLICY "Allow alerts inserts" ON alerts
    FOR INSERT 
    WITH CHECK (
        user_id IS NULL OR
        auth.uid() = user_id
    );

-- Also allow service role to view (for debugging) - keep existing if it works
-- If not, these policies allow viewing when user_id matches or is NULL

