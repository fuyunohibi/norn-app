import { supabase } from '@/utils/supabase';

export const checkExistingEmail = async (email: string): Promise<boolean> => {
  try {
    // Check if the user exists in public.users table
    // This is the only table we can reliably query from the client
    const { data: users, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .limit(1);

    if (error) {
      return false;
    }

    return users && users.length > 0;
  } catch (error) {
    return false;
  }
};

export const checkExistingUsername = async (
  username: string
): Promise<boolean> => {
  try {
    // Check if the username exists in public.users table
    // This is the only table we can reliably query from the client
    const { data: users, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username.toLowerCase())
      .limit(1);

    if (error) {
      return false;
    }

    return users && users.length > 0;
  } catch (error) {
    return false;
  }
};

export async function emailLogin(data: { email: string; password: string }) {
  // First, check if the user exists in the system
  const userExists = await checkExistingEmail(data.email);

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    // Handle "Invalid login credentials" based on whether user exists
    if (error.message === 'Invalid login credentials') {
      if (!userExists) {
        return {
          error:
            "We couldn't find an account with that email. Would you like to create a new account?",
        };
      } else {
        return {
          error: 'The password you entered is incorrect. Please try again.',
        };
      }
    }

    // Handle other specific error cases
    switch (error.message) {
      case 'Email not confirmed':
        return {
          error:
            'Please check your email and click the confirmation link to verify your account.',
        };
      case 'Too many requests':
        return {
          error:
            'Too many login attempts. Please wait a moment before trying again.',
        };
      default:
        return {
          error:
            'Something went wrong. Please check your connection and try again.',
        };
    }
  }
}

export async function signup(data: {
  email: string;
  password: string;
  username: string;
  full_name: string;
}): Promise<{ success?: boolean; error?: string }> {
  console.log('🔐 signup function called with:', {
    email: data.email,
    username: data.username,
    full_name: data.full_name,
    hasPassword: !!data.password
  });
  
  try {
    console.log('📡 Calling Supabase auth.signUp...');
    const username = data.username.toLowerCase().trim();
    const full_name = data.full_name.trim();

    // 1. Create user in Supabase Auth. `options.data` becomes raw_user_meta_data and is read by
    //    the DB trigger `handle_new_user()` (see migrations) to insert `public.users` — do not
    //    insert the profile again from the client or you get duplicate user_id (23505).
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.toLowerCase().trim(),
      password: data.password,
      options: {
        data: {
          username,
          full_name,
        },
      },
    });
    
    console.log('📡 Supabase auth.signUp response:', {
      hasUser: !!authData?.user,
      userId: authData?.user?.id,
      error: authError?.message
    });

    if (authError) {
      console.error('❌ Auth signup error:', authError.message);

      // Handle specific auth errors
      switch (authError.message) {
        case 'User already registered':
          return {
            error:
              'This email is already registered. Please use a different email or try signing in.',
          };
        case 'Password should be at least 6 characters':
          return { error: 'Password must be at least 6 characters long.' };
        case 'Invalid email':
          return { error: 'Please enter a valid email address.' };
        default:
          return { error: authError.message || 'Signup failed. Please try again.' };
      }
    }

    const userId = authData?.user?.id;
    if (!userId) {
      console.error('❌ No user ID returned from auth signup');
      return { error: 'Signup failed. Please try again.' };
    }

    console.log('✅ User created with ID:', userId);
    console.log('📝 Profile row is created by DB trigger from signup metadata.');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected signup error:', error);
    return { 
      error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.' 
    };
  }
}

export async function signout() {
  await supabase.auth.signOut();
}