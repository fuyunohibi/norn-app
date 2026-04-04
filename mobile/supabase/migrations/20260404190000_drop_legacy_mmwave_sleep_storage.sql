-- Remove mmWave-era sensor_readings and sleep/HRV columns. IMU timeline stays in activity_events.
-- Destructive: truncates daily_statistics and drops all sensor_readings rows.

DROP VIEW IF EXISTS public.device_status CASCADE;
DROP VIEW IF EXISTS public.user_dashboard CASCADE;

DROP TABLE IF EXISTS public.sensor_readings CASCADE;

TRUNCATE TABLE public.daily_statistics;

ALTER TABLE public.daily_statistics
    DROP COLUMN IF EXISTS sleep_readings,
    DROP COLUMN IF EXISTS last_sleep_reading_at,
    DROP COLUMN IF EXISTS respiration_sum,
    DROP COLUMN IF EXISTS respiration_count,
    DROP COLUMN IF EXISTS hrv_sum,
    DROP COLUMN IF EXISTS hrv_count;

COMMENT ON TABLE public.daily_statistics IS
    'Per-day IMU rollups (imu_* counts, activity_class_breakdown, fall/total readings).';

ALTER TABLE public.sensor_configurations
    DROP CONSTRAINT IF EXISTS sensor_configurations_sleep_sensitivity_check;

ALTER TABLE public.sensor_configurations
    DROP COLUMN IF EXISTS sleep_sensitivity,
    DROP COLUMN IF EXISTS sleep_detection_range,
    DROP COLUMN IF EXISTS sleep_alert_threshold;

DELETE FROM public.monitoring_sessions WHERE session_type::text = 'sleep';

ALTER TABLE public.monitoring_sessions
    DROP CONSTRAINT IF EXISTS monitoring_sessions_session_type_check;

ALTER TABLE public.monitoring_sessions
    ADD CONSTRAINT monitoring_sessions_session_type_check
    CHECK (session_type IN ('fall_monitoring', 'general', 'imu_monitoring'));

ALTER TABLE public.monitoring_sessions
    DROP COLUMN IF EXISTS average_sleep_quality;

ALTER TABLE public.user_preferences
    DROP COLUMN IF EXISTS sleep_alerts_enabled;

CREATE OR REPLACE VIEW public.device_status AS
SELECT
    sd.id,
    sd.device_name,
    sd.device_id,
    sd.is_active,
    sd.last_seen,
    sc.fall_sensitivity,
    0::bigint AS total_readings,
    0::bigint AS recent_readings,
    sd.last_seen AS last_reading
FROM public.sensor_devices sd
LEFT JOIN public.sensor_configurations sc ON sd.id = sc.device_id
WHERE sd.user_id = auth.uid();

CREATE OR REPLACE VIEW public.user_dashboard AS
SELECT
    u.id AS profile_id,
    u.username,
    u.full_name,
    u.avatar_url,
    COUNT(DISTINCT sd.id) AS device_count,
    COUNT(DISTINCT CASE WHEN sd.is_active THEN sd.id END) AS active_devices,
    COUNT(DISTINCT a.id) AS unread_alerts,
    (
        SELECT MAX(ae.created_at)
        FROM public.activity_events ae
        WHERE ae.user_id = u.user_id
    ) AS last_reading_time
FROM public.users u
LEFT JOIN public.sensor_devices sd ON u.user_id = sd.user_id
LEFT JOIN public.alerts a ON u.user_id = a.user_id AND a.is_read = false
WHERE u.user_id = auth.uid()
GROUP BY u.id, u.username, u.full_name, u.avatar_url, u.user_id;
