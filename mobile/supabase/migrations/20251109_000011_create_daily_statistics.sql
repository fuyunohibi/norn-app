-- =============================================
-- CREATE DAILY STATISTICS TABLE
-- =============================================
-- Stores aggregated per-day activity metrics for users.
-- =============================================

CREATE TABLE IF NOT EXISTS daily_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,

    total_readings INTEGER NOT NULL DEFAULT 0,
    sleep_readings INTEGER NOT NULL DEFAULT 0,
    fall_readings INTEGER NOT NULL DEFAULT 0,

    respiration_sum NUMERIC DEFAULT 0,
    respiration_count INTEGER NOT NULL DEFAULT 0,
    hrv_sum NUMERIC DEFAULT 0,
    hrv_count INTEGER NOT NULL DEFAULT 0,

    first_reading_at TIMESTAMP WITH TIME ZONE,
    last_reading_at TIMESTAMP WITH TIME ZONE,
    last_sleep_reading_at TIMESTAMP WITH TIME ZONE,
    last_fall_reading_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (user_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_statistics_user_date
    ON daily_statistics(user_id, stat_date DESC);

-- Utility function to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_daily_statistics_updated_at
BEFORE UPDATE ON daily_statistics
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE daily_statistics ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "Service role full access to daily_statistics"
    ON daily_statistics
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to manage their own statistics
CREATE POLICY IF NOT EXISTS "Users can manage own daily statistics"
    ON daily_statistics
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Public read demo daily statistics"
    ON daily_statistics
    FOR SELECT
    USING (
        auth.role() = 'anon'
        AND user_id = '0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61'
    );

