-- =============================================
-- VERIFY AND FIX RLS POLICIES
-- =============================================
-- This script will:
-- 1. Show current policies
-- 2. Drop all conflicting policies
-- 3. Create permissive policies
-- 4. Verify they were created
-- =============================================

-- STEP 1: Check what policies currently exist
SELECT 
    tablename, 
    policyname, 
    cmd, 
    with_check
FROM pg_policies 
WHERE tablename IN ('sensor_readings', 'alerts')
ORDER BY tablename, policyname;

-- STEP 2: Drop ALL existing INSERT policies (comprehensive cleanup)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename IN ('sensor_readings', 'alerts') 
        AND cmd = 'INSERT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- STEP 3: Ensure RLS is enabled
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create permissive INSERT policies
CREATE POLICY "Allow all sensor readings inserts" ON sensor_readings
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow all alerts inserts" ON alerts
    FOR INSERT 
    WITH CHECK (true);

-- STEP 5: Verify policies were created
SELECT 
    tablename, 
    policyname, 
    cmd, 
    with_check
FROM pg_policies 
WHERE tablename IN ('sensor_readings', 'alerts')
AND cmd = 'INSERT'
ORDER BY tablename, policyname;

-- =============================================
-- DONE!
-- =============================================
-- You should see 2 policies:
-- 1. "Allow all sensor readings inserts" on sensor_readings
-- 2. "Allow all alerts inserts" on alerts
-- 
-- Both should have with_check = 'true'
-- =============================================

