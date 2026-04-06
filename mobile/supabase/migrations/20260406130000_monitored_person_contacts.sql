-- =============================================
-- Caregiver-centric contacts: the app user (caregiver) manages contacts
-- for the person wearing the sensor (monitored person). Rename table/column
-- for clarity. Add monitored person name/phone on preferences for quick call.
-- =============================================

-- 1) Rename table emergency_contacts -> monitored_person_contacts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'emergency_contacts'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'monitored_person_contacts'
  ) THEN
    ALTER TABLE public.emergency_contacts RENAME TO monitored_person_contacts;
  END IF;
END $$;

-- 2) Rename user_id -> caregiver_user_id (logged-in caregiver who owns the rows)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monitored_person_contacts'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.monitored_person_contacts RENAME COLUMN user_id TO caregiver_user_id;
  END IF;
END $$;

-- 3) Rename FK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emergency_contacts_user_id_fkey'
  ) THEN
    ALTER TABLE public.monitored_person_contacts
      RENAME CONSTRAINT emergency_contacts_user_id_fkey TO monitored_person_contacts_caregiver_user_id_fkey;
  END IF;
END $$;

-- 4) Rename indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'idx_emergency_contacts_user_id'
  ) THEN
    ALTER INDEX public.idx_emergency_contacts_user_id RENAME TO idx_monitored_person_contacts_caregiver_user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'idx_emergency_contacts_priority'
  ) THEN
    ALTER INDEX public.idx_emergency_contacts_priority RENAME TO idx_monitored_person_contacts_priority;
  END IF;
END $$;

-- 5) RLS policies (column name changed)
DROP POLICY IF EXISTS "Service role full access to emergency_contacts" ON public.monitored_person_contacts;
DROP POLICY IF EXISTS "Users can view own emergency contacts" ON public.monitored_person_contacts;
DROP POLICY IF EXISTS "Users can insert own emergency contacts" ON public.monitored_person_contacts;
DROP POLICY IF EXISTS "Users can update own emergency contacts" ON public.monitored_person_contacts;
DROP POLICY IF EXISTS "Users can delete own emergency contacts" ON public.monitored_person_contacts;

DROP POLICY IF EXISTS "Service role full access to monitored_person_contacts" ON public.monitored_person_contacts;
DROP POLICY IF EXISTS "Caregivers can view monitored person contacts" ON public.monitored_person_contacts;
DROP POLICY IF EXISTS "Caregivers can insert monitored person contacts" ON public.monitored_person_contacts;
DROP POLICY IF EXISTS "Caregivers can update monitored person contacts" ON public.monitored_person_contacts;
DROP POLICY IF EXISTS "Caregivers can delete monitored person contacts" ON public.monitored_person_contacts;

CREATE POLICY "Service role full access to monitored_person_contacts"
    ON public.monitored_person_contacts
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Caregivers can view monitored person contacts"
    ON public.monitored_person_contacts
    FOR SELECT
    USING (auth.uid() = caregiver_user_id);

CREATE POLICY "Caregivers can insert monitored person contacts"
    ON public.monitored_person_contacts
    FOR INSERT
    WITH CHECK (auth.uid() = caregiver_user_id);

CREATE POLICY "Caregivers can update monitored person contacts"
    ON public.monitored_person_contacts
    FOR UPDATE
    USING (auth.uid() = caregiver_user_id)
    WITH CHECK (auth.uid() = caregiver_user_id);

CREATE POLICY "Caregivers can delete monitored person contacts"
    ON public.monitored_person_contacts
    FOR DELETE
    USING (auth.uid() = caregiver_user_id);

-- 6) Monitored person (wearer) — quick call from fall flow; managed by caregiver in Settings
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS monitored_person_full_name TEXT;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS monitored_person_phone TEXT;
