-- =============================================
-- SEED MARCH DAILY STATISTICS (DEMO)
-- =============================================
-- Inserts fake daily statistics for 2026-03-01..2026-03-31
-- for the public demo user so charts have a full month.
-- =============================================

DO $$
DECLARE
    v_user_id UUID := 'e3620158-e37a-4d4f-b851-a14fd0e53dc3';
BEGIN
    -- FK to auth.users: skip quietly if the demo UUID does not exist.
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
        INSERT INTO public.daily_statistics (
            user_id,
            stat_date,
            total_readings,
            fall_readings,
            first_reading_at,
            last_reading_at,
            last_fall_reading_at,
            created_at,
            updated_at
        )
        SELECT
            v_user_id AS user_id,
            d::date AS stat_date,
            (56 + ((EXTRACT(DAY FROM d)::int * 7) % 23)) AS total_readings,
            CASE
                WHEN EXTRACT(DAY FROM d)::int IN (4, 11, 18, 24, 29) THEN 1
                ELSE 0
            END AS fall_readings,
            ((d::date + make_time(1, 30 + (EXTRACT(DAY FROM d)::int % 10), 0))::timestamptz) AS first_reading_at,
            ((d::date + make_time(22, 40 + (EXTRACT(DAY FROM d)::int % 10), 0))::timestamptz) AS last_reading_at,
            CASE
                WHEN EXTRACT(DAY FROM d)::int IN (4, 11, 18, 24, 29)
                    THEN ((d::date + make_time(14, 20 + (EXTRACT(DAY FROM d)::int % 10), 0))::timestamptz)
                ELSE NULL
            END AS last_fall_reading_at,
            NOW() AS created_at,
            NOW() AS updated_at
        FROM generate_series('2026-03-01'::date, '2026-03-31'::date, '1 day'::interval) AS d
        ON CONFLICT (user_id, stat_date) DO UPDATE
        SET
            total_readings = EXCLUDED.total_readings,
            fall_readings = EXCLUDED.fall_readings,
            first_reading_at = EXCLUDED.first_reading_at,
            last_reading_at = EXCLUDED.last_reading_at,
            last_fall_reading_at = EXCLUDED.last_fall_reading_at,
            updated_at = EXCLUDED.updated_at;
    END IF;
END $$;

