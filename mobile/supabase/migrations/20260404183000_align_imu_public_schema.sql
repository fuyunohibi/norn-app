-- Align public schema with MPU6050 / FastAPI pipeline (activity_events, IMU alerts, optional daily IMU fields).
-- Safe to run on DBs that match the legacy NORN DDL (mmWave-era checks without fall_risk, etc.).

-- =============================================================================
-- activity_events: canonical IMU timeline (POST /api/v1/sensor/activity)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.activity_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    device_id text,
    activity text NOT NULL,
    timestamp_device bigint,
    extras jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_events IS
    'MPU6050: class transitions + ping heartbeats from firmware via FastAPI.';

COMMENT ON COLUMN public.activity_events.activity IS
    'Codes: st, si, w, r, nf, f, af, or ping.';

ALTER TABLE public.activity_events ADD COLUMN IF NOT EXISTS timestamp_device bigint;

ALTER TABLE public.activity_events
    ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_activity_events_user_created
    ON public.activity_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_activity
    ON public.activity_events (user_id, activity);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_events_service_role_all" ON public.activity_events;
CREATE POLICY "activity_events_service_role_all"
    ON public.activity_events
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "activity_events_select_own" ON public.activity_events;
CREATE POLICY "activity_events_select_own"
    ON public.activity_events
    FOR SELECT
    USING (auth.uid() = user_id);

-- =============================================================================
-- alerts: allow fall_risk (nf); store ESP clip id outside sensor_devices FK
-- =============================================================================
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
ALTER TABLE public.alerts
    ADD CONSTRAINT alerts_alert_type_check
    CHECK (
        alert_type IN (
            'fall',
            'fall_risk',
            'no_movement',
            'device_offline',
            'low_battery'
        )
    );

ALTER TABLE public.alerts
    ADD COLUMN IF NOT EXISTS source_device_id text;

COMMENT ON COLUMN public.alerts.device_id IS
    'Optional FK to sensor_devices (legacy mmWave). IMU clips use source_device_id + alert_data.';

COMMENT ON COLUMN public.alerts.source_device_id IS
    'IMU / ESP string id from firmware (e.g. esp32-imu-001).';

-- =============================================================================
-- daily_statistics: optional IMU rollups (defaults 0 / {}); legacy sleep columns unchanged
-- =============================================================================
ALTER TABLE public.daily_statistics
    ADD COLUMN IF NOT EXISTS imu_activity_event_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS imu_critical_event_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS activity_class_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON TABLE public.daily_statistics IS
    'Legacy mmWave/sleep aggregates plus optional IMU daily counters; live stats from activity_events via API.';

-- =============================================================================
-- monitoring_sessions: allow IMU-focused session label
-- =============================================================================
ALTER TABLE public.monitoring_sessions DROP CONSTRAINT IF EXISTS monitoring_sessions_session_type_check;
ALTER TABLE public.monitoring_sessions
    ADD CONSTRAINT monitoring_sessions_session_type_check
    CHECK (
        session_type IN (
            'sleep',
            'fall_monitoring',
            'general',
            'imu_monitoring'
        )
    );

COMMENT ON TABLE public.monitoring_sessions IS
    'Legacy sessions; imu_monitoring = waist MPU6050 clip monitoring.';

-- =============================================================================
-- sensor_readings: extend reading_type (table dropped in 20260404190000 on fresh chains)
-- =============================================================================
ALTER TABLE public.sensor_readings DROP CONSTRAINT IF EXISTS sensor_readings_reading_type_check;
ALTER TABLE public.sensor_readings
    ADD CONSTRAINT sensor_readings_reading_type_check
    CHECK (
        reading_type IN (
            'sleep',
            'fall',
            'movement',
            'presence',
            'imu_aggregate'
        )
    );

COMMENT ON TABLE public.sensor_readings IS
    'Legacy mmWave rows; dropped in 20260404190000 — use activity_events for IMU.';

-- =============================================================================
-- sensor_configurations: optional wearable label (no FK to sensor_devices required)
-- =============================================================================
ALTER TABLE public.sensor_configurations
    ADD COLUMN IF NOT EXISTS imu_wearable_device_id text;

COMMENT ON COLUMN public.sensor_configurations.imu_wearable_device_id IS
    'Optional ESP/clip string id matching firmware DEVICE_ID; independent of sensor_devices.uuid.';

COMMENT ON TABLE public.sensor_configurations IS
    'Legacy mmWave tuning; imu_wearable_device_id links app settings to MPU clip string id.';
