-- RPC return types must match column types; varchar != text for PostgreSQL 42804.
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
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.user_id,
        u.username::text,
        u.full_name::text,
        u.avatar_url,
        u.created_at,
        u.updated_at
    FROM public.users u
    WHERE u.user_id = current_user_id
    ORDER BY u.created_at DESC
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
