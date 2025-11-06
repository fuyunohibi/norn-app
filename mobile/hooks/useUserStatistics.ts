import { useQuery } from '@tanstack/react-query';
import { backendAPIService } from '../services/backend-api.service';
import { getProfile } from '../services/user.service';

const IS_DEV = __DEV__;

/**p 
 * Hook to fetch user statistics and profile data
 */
export const useUserStatistics = (userId?: string) => {
  return useQuery({
    queryKey: ['user-statistics', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (IS_DEV) console.log('🔍 Fetching user statistics:', { userId });

      try {
        // Fetch user profile and statistics in parallel
        const [profile, statistics] = await Promise.all([
          getProfile(userId),
          backendAPIService.getUserStatistics(userId),
        ]);

        if (IS_DEV) {
          console.log('✅ Received user data:', {
            hasProfile: !!profile,
            totalReadings: statistics.totalReadings,
            sleepReadings: statistics.sleepReadings,
            fallReadings: statistics.fallReadings,
          });
        }

        return {
          profile,
          statistics,
        };
      } catch (error: any) {
        if (IS_DEV) console.error('❌ Error fetching user statistics:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 60000, // Keep in cache for 60 seconds
  });
};

