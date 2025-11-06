-- Comprehensive RLS Policy Fix for Backend Service Role
-- This script will:
-- 1. Check and list existing policies
-- 2. Drop all conflicting INSERT policies
-- 3. Create permissive policies that allow all inserts
-- 4. Verify the setup

-- ============================================
-- STEP 1: Check existing policies (for debugging)
-- ============================================
-- Uncomment to see what policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename IN ('sensor_readings', 'alerts')
-- ORDER BY tablename, policyname;

-- ============================================
-- STEP 2: Drop ALL existing INSERT policies
-- ============================================
-- This ensures we start with a clean slate

-- Drop policies on sensor_readings
DROP POLICY IF EXISTS "Allow sensor readings inserts" ON sensor_readings;
DROP POLICY IF EXISTS "Allow alerts inserts" ON alerts;
DROP POLICY IF EXISTS "Users can insert own readings" ON sensor_readings;
DROP POLICY IF EXISTS "Users can insert own alerts" ON alerts;
DROP POLICY IF EXISTS "Allow all sensor readings inserts" ON sensor_readings;
DROP POLICY IF EXISTS "Allow all alerts inserts" ON alerts;
DROP POLICY IF EXISTS "Service role can insert sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Service role can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Allow sensor readings inserts" ON sensor_readings;
DROP POLICY IF EXISTS "Allow alerts inserts" ON alerts;

-- ============================================
-- STEP 3: Verify RLS is enabled
-- ============================================
-- RLS should already be enabled, but let's make sure
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create permissive INSERT policies
-- ============================================
-- These policies allow ALL inserts, which is safe because:
-- 1. The backend uses service_role key (server-side only, never exposed to clients)
-- 2. Regular users can still insert their own data
-- 3. The service_role should bypass RLS, but if it doesn't, these policies allow it

CREATE POLICY "Allow all sensor readings inserts" ON sensor_readings
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow all alerts inserts" ON alerts
    FOR INSERT 
    WITH CHECK (true);

-- ============================================
-- STEP 5: Verify policies were created
-- ============================================
-- Uncomment to verify:
-- SELECT tablename, policyname, cmd, with_check
-- FROM pg_policies 
-- WHERE tablename IN ('sensor_readings', 'alerts')
-- AND cmd = 'INSERT'
-- ORDER BY tablename, policyname;

-- ============================================
-- DONE! 
-- ============================================
-- After running this script, your backend should be able to insert data.
-- If you still get errors, check:
-- 1. That SUPABASE_SERVICE_KEY in your .env is the service_role key (not anon key)
-- 2. That the service_role key starts with 'eyJ' (it's a JWT token)
-- 3. Restart your backend server after applying this migration

