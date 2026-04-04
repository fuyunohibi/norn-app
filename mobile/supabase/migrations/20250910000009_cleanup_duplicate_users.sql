-- Cleanup duplicate user profiles
-- This migration removes duplicate user profiles, keeping only the most recent one for each user_id
-- It also ensures user_id has a unique constraint to prevent future duplicates

-- First, delete duplicate user profiles, keeping only the most recent one for each user_id
-- This uses a subquery to identify duplicates and delete the older ones
DELETE FROM public.users u1
WHERE u1.id IN (
    SELECT u2.id
    FROM public.users u2
    WHERE u2.user_id IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM public.users u3
          WHERE u3.user_id = u2.user_id
            AND u3.created_at > u2.created_at
      )
);

-- Add a unique constraint on user_id to prevent future duplicates
-- This will fail if there are still duplicates, so run the DELETE above first
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_user_id_unique'
          AND conrelid = 'public.users'::regclass
    ) THEN
        -- Add unique constraint on user_id (allowing NULL)
        -- PostgreSQL allows multiple NULLs in a unique constraint
        ALTER TABLE public.users
        ADD CONSTRAINT users_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Create an index if it doesn't exist (should already exist, but just in case)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id_unique 
ON public.users (user_id) 
WHERE user_id IS NOT NULL;

