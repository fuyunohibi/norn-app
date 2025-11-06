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
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.toLowerCase().trim(),
      password: data.password,
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
    console.log('📝 Inserting user profile...');
    
    // 2. Insert user profile via normal query
    const { error: profileError } = await supabase.from('users').insert({
      user_id: userId,
      username: data.username.toLowerCase().trim(),
      full_name: data.full_name.trim(),
    });
    
    console.log('📝 Profile insert result:', {
      error: profileError?.message,
      code: profileError?.code
    });

    if (profileError) {
      console.error('❌ Profile insert error:', profileError.message);

      // Handle specific profile errors
      if (
        profileError.message.includes('duplicate key') ||
        profileError.message.includes('already exists') ||
        profileError.code === '23505'
      ) {
        return {
          error: 'This username is already taken. Please choose a different one.',
        };
      }

      return { 
        error: profileError.message || 'Signup failed. Please try again.' 
      };
    }

    // 3. Success
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