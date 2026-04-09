-- Allow informational "clip back online" rows in the alerts inbox.
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
ALTER TABLE public.alerts
    ADD CONSTRAINT alerts_alert_type_check
    CHECK (
        alert_type IN (
            'fall',
            'fall_risk',
            'no_movement',
            'device_offline',
            'device_online',
            'low_battery'
        )
    );
