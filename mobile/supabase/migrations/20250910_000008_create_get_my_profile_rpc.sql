-- Create RPC function to get current user's profile
-- This function returns the user profile for the currently authenticated user
-- Handles cases where user_id might be NULL or doesn't match auth.uid()
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current authenticated user ID
    current_user_id := auth.uid();
    
    -- Return early if no authenticated user
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Query for user profile where user_id matches the authenticated user
    -- If multiple profiles exist (duplicates), return the most recent one
    RETURN QUERY
    SELECT 
        u.id,
        u.user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.created_at,
        u.updated_at
    FROM public.users u
    WHERE u.user_id = current_user_id
    ORDER BY u.created_at DESC
    LIMIT 1;
    
    -- If no profile found with user_id match, log for debugging
    IF NOT FOUND THEN
        RAISE NOTICE 'No user profile found for user_id: %', current_user_id;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

