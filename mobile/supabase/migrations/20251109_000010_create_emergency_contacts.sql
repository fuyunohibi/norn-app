-- =============================================
-- CREATE EMERGENCY CONTACTS TABLE
-- =============================================
-- This migration adds a dedicated table for storing user emergency contacts.
-- The table supports priority ordering and quick filtering per user.
-- =============================================

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    relationship TEXT,
    phone_number TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id
    ON emergency_contacts(user_id);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_priority
    ON emergency_contacts(user_id, priority DESC, created_at DESC);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Ensure service role always has access (backend integrations)
CREATE POLICY IF NOT EXISTS "Service role full access to emergency_contacts"
    ON emergency_contacts
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can manage their own contacts
CREATE POLICY IF NOT EXISTS "Users can view own emergency contacts"
    ON emergency_contacts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own emergency contacts"
    ON emergency_contacts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own emergency contacts"
    ON emergency_contacts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own emergency contacts"
    ON emergency_contacts
    FOR DELETE
    USING (auth.uid() = user_id);

