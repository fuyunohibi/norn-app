import type { UserPreferences, UserProfile } from '@/database/types';
import { supabase } from '@/utils/supabase';

/**
 * Database initialization and setup service
 */
export class DatabaseService {
  /**
   * Initialize database for a new user
   * This should be called after successful authentication
   */
  static async initializeUser(userId: string, userData: {
    username: string;
    full_name: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user profile already exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        console.log('User profile already exists');
        return { success: true };
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          user_id: userId,
          username: userData.username,
          full_name: userData.full_name,
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return { success: false, error: 'Failed to create user profile' };
      }

      // Create default user preferences
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
        });

      if (preferencesError) {
        console.error('Error creating user preferences:', preferencesError);
        // Don't fail the entire process for preferences
      }

      console.log('User database initialization completed');
      return { success: true };
    } catch (error) {
      console.error('Database initialization error:', error);
      return { success: false, error: 'Database initialization failed' };
    }
  }

  /**
   * Check if database is properly set up
   */
  static async checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Test basic database connectivity
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        return { healthy: false, error: 'Database connection failed' };
      }

      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: 'Database health check failed' };
    }
  }

  /**
   * Get user's complete profile with preferences
   */
  static async getUserProfile(userId: string): Promise<{
    profile: UserProfile | null;
    preferences: UserPreferences | null;
  }> {
    try {
      const [profileResult, preferencesResult] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single(),
      ]);

      return {
        profile: profileResult.data,
        preferences: preferencesResult.data,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        profile: null,
        preferences: null,
      };
    }
  }

  /**
   * Clean up user data (for testing or account deletion)
   */
  static async cleanupUserData(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete in order to respect foreign key constraints
      const tables = [
        'alerts',
        'monitoring_sessions',
        'sensor_readings',
        'sensor_configurations',
        'sensor_devices',
        'user_preferences',
        'users',
      ];

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error(`Error cleaning up ${table}:`, error);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error cleaning up user data:', error);
      return { success: false, error: 'Failed to clean up user data' };
    }
  }
}
