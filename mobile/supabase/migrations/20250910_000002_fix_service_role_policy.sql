-- Fix RLS policy to properly allow service role inserts
-- When using service_role key, auth.uid() is NULL, so we need to check the JWT role claim

-- Drop existing policy
DROP POLICY IF EXISTS "Allow sensor readings inserts" ON sensor_readings;
DROP POLICY IF EXISTS "Allow alerts inserts" ON alerts;

-- Create policy that checks JWT role claim for service_role
-- This allows: service_role OR authenticated user matching user_id OR NULL user_id
CREATE POLICY "Allow sensor readings inserts" ON sensor_readings
    FOR INSERT 
    WITH CHECK (
        (current_setting('request.jwt.claims', true)::jsonb)->>'role' = 'service_role' OR
        auth.uid() = user_id OR
        user_id IS NULL
    );

CREATE POLICY "Allow alerts inserts" ON alerts
    FOR INSERT 
    WITH CHECK (
        (current_setting('request.jwt.claims', true)::jsonb)->>'role' = 'service_role' OR
        auth.uid() = user_id OR
        user_id IS NULL
    );

