-- Remove legacy monitoring_sessions and sensor_configurations (unused; IMU uses activity_events).
-- Recreate device_status without join to sensor_configurations.

DROP VIEW IF EXISTS public.device_status CASCADE;

DROP TABLE IF EXISTS public.monitoring_sessions CASCADE;
DROP TABLE IF EXISTS public.sensor_configurations CASCADE;

CREATE OR REPLACE VIEW public.device_status AS
SELECT
    sd.id,
    sd.device_name,
    sd.device_id,
    sd.is_active,
    sd.last_seen,
    0::bigint AS total_readings,
    0::bigint AS recent_readings,
    sd.last_seen AS last_reading
FROM public.sensor_devices sd
WHERE sd.user_id = auth.uid();
