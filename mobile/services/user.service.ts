import type {
  UserDashboard,
  UserPreferences,
  UserPreferencesUpdate,
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
} from '@/database/types';
import { supabase } from '@/utils/supabase';

// =============================================
// USER PROFILE ACTIONS
// =============================================

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const createProfile = async (profile: UserProfileInsert): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert(profile)
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return null;
  }
};

export const updateProfile = async (userId: string, updates: UserProfileUpdate): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
};

export const getDashboardData = async (userId: string): Promise<UserDashboard | null> => {
  try {
    const { data, error } = await supabase
      .from('user_dashboard')
      .select('*')
      .eq('profile_id', userId)
      .single();

    if (error) {
      console.error('Error fetching dashboard data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return null;
  }
};

// =============================================
// USER PREFERENCES ACTIONS
// =============================================

export const getPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return null;
  }
};

export const updatePreferences = async (userId: string, updates: UserPreferencesUpdate): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating preferences:', error);
    return null;
  }
};

export const createDefaultPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) {
      console.error('Error creating default preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating default preferences:', error);
    return null;
  }
};
