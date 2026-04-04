-- IMU MPU6050 pipeline: activity change + ping heartbeats, and IMU-derived alerts.
-- Firmware posts via FastAPI (service role) to activity_events; mobile reads stats via API.

-- ---------------------------------------------------------------------------
-- activity_events: one row per class transition or heartbeat ("ping")
-- activity: st, si, w, r, nf, f, af (thesis labels) or ping
-- ---------------------------------------------------------------------------
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
    'MPU6050 on-device ML: activity state changes and ping heartbeats (see /api/v1/sensor/activity).';

COMMENT ON COLUMN public.activity_events.activity IS
    'Short class code: st, si, w, r, nf, f, af, or ping.';

-- Add columns before COMMENT when the table already existed without them (CREATE TABLE IF NOT EXISTS skips).
ALTER TABLE public.activity_events
    ADD COLUMN IF NOT EXISTS timestamp_device bigint;

ALTER TABLE public.activity_events
    ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.activity_events.timestamp_device IS
    'Optional device monotonic millis from firmware JSON.';

COMMENT ON COLUMN public.activity_events.extras IS
    'Optional JSON (e.g. confidence, features) from future firmware.';

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

-- ---------------------------------------------------------------------------
-- alerts: allow fall_risk (near-fall / unstable) from IMU service
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Legacy: sensor_readings dropped in 20260404190000; daily_statistics trimmed there too.
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.sensor_readings IS
    'Legacy mmWave readings; removed in migration 20260404190000 — IMU uses activity_events.';

COMMENT ON TABLE public.daily_statistics IS
    'Per-day stats; sleep/HRV columns removed in 20260404190000; IMU dashboards use activity_events + API.';
