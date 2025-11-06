-- =============================================
-- QUICK FIX FOR RLS ERRORS - COPY AND PASTE THIS
-- =============================================
-- Run this in Supabase SQL Editor RIGHT NOW
-- =============================================

-- Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Allow sensor readings inserts" ON sensor_readings;
DROP POLICY IF EXISTS "Allow alerts inserts" ON alerts;
DROP POLICY IF EXISTS "Users can insert own readings" ON sensor_readings;
DROP POLICY IF EXISTS "Users can insert own alerts" ON alerts;
DROP POLICY IF EXISTS "Allow all sensor readings inserts" ON sensor_readings;
DROP POLICY IF EXISTS "Allow all alerts inserts" ON alerts;
DROP POLICY IF EXISTS "Service role can insert sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Service role can insert alerts" ON alerts;

-- Ensure RLS is enabled
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allows ALL inserts)
CREATE POLICY "Allow all sensor readings inserts" ON sensor_readings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all alerts inserts" ON alerts
    FOR INSERT WITH CHECK (true);

-- Verify it worked (you should see 2 rows)
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('sensor_readings', 'alerts') 
AND cmd = 'INSERT';

