-- =============================================
-- Naming & domain clarity:
-- - care_backup_contacts: backup numbers the caregiver can call (not "the monitored person").
-- - care_recipient_profiles: the person wearing the sensor (name/phone); moved off user_preferences.
-- Also aligns legacy constraint/trigger names (emergency_contacts_*).
-- =============================================

-- ---------------------------------------------------------------------------
-- 1) Rename monitored_person_contacts -> care_backup_contacts
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'monitored_person_contacts'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'care_backup_contacts'
  ) THEN
    ALTER TABLE public.monitored_person_contacts RENAME TO care_backup_contacts;
  END IF;
END $$;

-- Primary key constraint (legacy name: emergency_contacts_pkey)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'emergency_contacts_pkey'
      AND conrelid = 'public.care_backup_contacts'::regclass
  ) THEN
    ALTER TABLE public.care_backup_contacts
      RENAME CONSTRAINT emergency_contacts_pkey TO care_backup_contacts_pkey;
  END IF;
END $$;

-- Foreign key rename for clarity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monitored_person_contacts_caregiver_user_id_fkey'
  ) THEN
    ALTER TABLE public.care_backup_contacts
      RENAME CONSTRAINT monitored_person_contacts_caregiver_user_id_fkey TO care_backup_contacts_caregiver_user_id_fkey;
  END IF;
END $$;

-- Priority check constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'emergency_contacts_priority_check'
      AND conrelid = 'public.care_backup_contacts'::regclass
  ) THEN
    ALTER TABLE public.care_backup_contacts
      RENAME CONSTRAINT emergency_contacts_priority_check TO care_backup_contacts_priority_check;
  END IF;
END $$;

-- Indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'idx_monitored_person_contacts_caregiver_user_id'
  ) THEN
    ALTER INDEX public.idx_monitored_person_contacts_caregiver_user_id
      RENAME TO idx_care_backup_contacts_caregiver_user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'idx_monitored_person_contacts_priority'
  ) THEN
    ALTER INDEX public.idx_monitored_person_contacts_priority RENAME TO idx_care_backup_contacts_priority;
  END IF;
END $$;

-- Triggers (legacy names)
DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON public.care_backup_contacts;
DROP TRIGGER IF EXISTS update_monitored_person_contacts_updated_at ON public.care_backup_contacts;

CREATE TRIGGER update_care_backup_contacts_updated_at
  BEFORE UPDATE ON public.care_backup_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS policies for care_backup_contacts
DROP POLICY IF EXISTS "Service role full access to monitored_person_contacts" ON public.care_backup_contacts;
DROP POLICY IF EXISTS "Caregivers can view monitored person contacts" ON public.care_backup_contacts;
DROP POLICY IF EXISTS "Caregivers can insert monitored person contacts" ON public.care_backup_contacts;
DROP POLICY IF EXISTS "Caregivers can update monitored person contacts" ON public.care_backup_contacts;
DROP POLICY IF EXISTS "Caregivers can delete monitored person contacts" ON public.care_backup_contacts;

DROP POLICY IF EXISTS "Service role full access to care_backup_contacts" ON public.care_backup_contacts;
DROP POLICY IF EXISTS "Caregivers can view care backup contacts" ON public.care_backup_contacts;
DROP POLICY IF EXISTS "Caregivers can insert care backup contacts" ON public.care_backup_contacts;
DROP POLICY IF EXISTS "Caregivers can update care backup contacts" ON public.care_backup_contacts;
DROP POLICY IF EXISTS "Caregivers can delete care backup contacts" ON public.care_backup_contacts;

CREATE POLICY "Service role full access to care_backup_contacts"
  ON public.care_backup_contacts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Caregivers can view care backup contacts"
  ON public.care_backup_contacts
  FOR SELECT
  USING (auth.uid() = caregiver_user_id);

CREATE POLICY "Caregivers can insert care backup contacts"
  ON public.care_backup_contacts
  FOR INSERT
  WITH CHECK (auth.uid() = caregiver_user_id);

CREATE POLICY "Caregivers can update care backup contacts"
  ON public.care_backup_contacts
  FOR UPDATE
  USING (auth.uid() = caregiver_user_id)
  WITH CHECK (auth.uid() = caregiver_user_id);

CREATE POLICY "Caregivers can delete care backup contacts"
  ON public.care_backup_contacts
  FOR DELETE
  USING (auth.uid() = caregiver_user_id);

-- ---------------------------------------------------------------------------
-- 2) Care recipient (sensor wearer) — dedicated table, not user_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.care_recipient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT care_recipient_profiles_one_per_caregiver UNIQUE (caregiver_user_id)
);

CREATE INDEX IF NOT EXISTS idx_care_recipient_profiles_caregiver_user_id
  ON public.care_recipient_profiles(caregiver_user_id);

DROP TRIGGER IF EXISTS update_care_recipient_profiles_updated_at ON public.care_recipient_profiles;

CREATE TRIGGER update_care_recipient_profiles_updated_at
  BEFORE UPDATE ON public.care_recipient_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.care_recipient_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to care_recipient_profiles" ON public.care_recipient_profiles;
DROP POLICY IF EXISTS "Caregivers can view care recipient profile" ON public.care_recipient_profiles;
DROP POLICY IF EXISTS "Caregivers can insert care recipient profile" ON public.care_recipient_profiles;
DROP POLICY IF EXISTS "Caregivers can update care recipient profile" ON public.care_recipient_profiles;
DROP POLICY IF EXISTS "Caregivers can delete care recipient profile" ON public.care_recipient_profiles;

CREATE POLICY "Service role full access to care_recipient_profiles"
  ON public.care_recipient_profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Caregivers can view care recipient profile"
  ON public.care_recipient_profiles
  FOR SELECT
  USING (auth.uid() = caregiver_user_id);

CREATE POLICY "Caregivers can insert care recipient profile"
  ON public.care_recipient_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = caregiver_user_id);

CREATE POLICY "Caregivers can update care recipient profile"
  ON public.care_recipient_profiles
  FOR UPDATE
  USING (auth.uid() = caregiver_user_id)
  WITH CHECK (auth.uid() = caregiver_user_id);

CREATE POLICY "Caregivers can delete care recipient profile"
  ON public.care_recipient_profiles
  FOR DELETE
  USING (auth.uid() = caregiver_user_id);

-- Migrate from user_preferences (only when legacy columns still exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_preferences'
      AND column_name = 'monitored_person_full_name'
  ) THEN
    INSERT INTO public.care_recipient_profiles (caregiver_user_id, full_name, phone_number)
    SELECT up.user_id,
           NULLIF(trim(up.monitored_person_full_name), ''),
           NULLIF(trim(up.monitored_person_phone), '')
    FROM public.user_preferences up
    WHERE up.user_id IS NOT NULL
    ON CONFLICT (caregiver_user_id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, public.care_recipient_profiles.full_name),
      phone_number = COALESCE(EXCLUDED.phone_number, public.care_recipient_profiles.phone_number),
      updated_at = NOW();
  END IF;
END $$;

ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS monitored_person_full_name;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS monitored_person_phone;
