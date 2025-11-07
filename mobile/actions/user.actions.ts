import { supabase } from '@/utils/supabase';

// Type for the user profile returned by get_my_profile RPC
export type User = {
  id: string;
  user_id: string | null;
  username: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/**
 * Get the current authenticated user's profile
 * Uses the get_my_profile RPC function which automatically
 * filters by the current authenticated user (auth.uid())
 * Falls back to getProfile if RPC is not available
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // First, get the current authenticated user ID
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Error getting authenticated user:', authError);
      return null;
    }

    console.log('Authenticated user ID:', authUser.id);

    // Try RPC function first
    try {
      console.log('Attempting RPC call: get_my_profile');
      const { data, error } = await supabase.rpc('get_my_profile');

      if (error) {
        console.warn('RPC function error (will try fallback):', error.message);
        console.warn('Error code:', error.code);
        console.warn('Error details:', error);
        // If function doesn't exist (42883) or other recoverable error, fall through to fallback
        if (error.code !== '42883' && error.code !== 'P0001' && error.code !== '42704') {
          // For non-recoverable errors, still try fallback
          console.warn('Non-recoverable RPC error, attempting fallback');
        }
      } else {
        console.log('RPC response received');
        console.log('RPC response data:', JSON.stringify(data, null, 2));
        console.log('Data type:', typeof data);
        console.log('Is array:', Array.isArray(data));

        // RPC function returns an array (RETURNS TABLE)
        if (Array.isArray(data)) {
          if (data.length > 0) {
            const user = data[0] as User;
            console.log('✅ Found user profile via RPC:', user);
            return user;
          } else {
            console.warn('⚠️ RPC returned empty array - no profile found for user_id:', authUser.id);
          }
        } else if (data) {
          // Sometimes RPC might return a single object instead of array
          console.log('RPC returned single object instead of array');
          const user = data as User;
          console.log('✅ Found user profile via RPC (single object):', user);
          return user;
        } else {
          console.warn('⚠️ RPC returned null or undefined data');
        }
      }
    } catch (rpcError: any) {
      // If RPC function doesn't exist or other RPC error, use fallback
      console.warn('❌ RPC call failed, using fallback method:', rpcError.message);
      console.warn('RPC error stack:', rpcError.stack);
    }

    // Fallback: Use direct query with user ID
    // Handle case where there might be duplicate profiles
    console.log('Using fallback: querying users table with userId:', authUser.id);
    try {
      const { data: profiles, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false }); // Get most recent first

      if (queryError) {
        console.error('Error querying users table:', queryError);
        return null;
      }

      if (!profiles || profiles.length === 0) {
        console.warn('No user profile found for user:', authUser.id);
        return null;
      }

      // If multiple profiles exist, use the most recent one (already sorted)
      const profile = profiles[0];
      
      if (profiles.length > 1) {
        console.warn(`⚠️ Found ${profiles.length} profiles for user_id ${authUser.id}, using most recent one`);
        console.warn('Consider cleaning up duplicate profiles in the database');
      }

      console.log('✅ Found user profile via fallback:', profile);
      // Convert to User type
      return {
        id: profile.id,
        user_id: profile.user_id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
    } catch (fallbackError: any) {
      console.error('❌ Fallback query failed:', fallbackError);
      return null;
    }
  } catch (err) {
    console.error('Unexpected error fetching current user:', err);
    return null;
  }
};

