-- RLS: accept service_role using JWT role claim (covers cases where auth.role() differs from PostgREST).
-- Backend must still use the service_role secret from Project Settings → API.

DROP POLICY IF EXISTS "activity_events_service_role_all" ON public.activity_events;
CREATE POLICY "activity_events_service_role_all"
    ON public.activity_events
    FOR ALL
    USING (
        coalesce(auth.jwt() ->> 'role', '') = 'service_role'
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        coalesce(auth.jwt() ->> 'role', '') = 'service_role'
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "alerts_service_role_all" ON public.alerts;
CREATE POLICY "alerts_service_role_all"
    ON public.alerts
    FOR ALL
    USING (
        coalesce(auth.jwt() ->> 'role', '') = 'service_role'
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        coalesce(auth.jwt() ->> 'role', '') = 'service_role'
        OR auth.role() = 'service_role'
    );
