import { useQuery } from '@tanstack/react-query';
import { backendAPIService, SleepSummary } from '../services/backend-api.service';

/**
 * Hook to fetch sleep summaries for multiple dates
 */
export const useSleepSummaries = (
  userId: string | undefined,
  dates: string[] = []
) => {
  return useQuery({
    queryKey: ['sleep-summaries', userId, dates.join(',')],
    queryFn: async () => {
      if (!userId || dates.length === 0) return [];

      const summaries = await Promise.allSettled(
        dates.map((date) => backendAPIService.getSleepSummary(userId, date))
      );

      const results: Array<{ date: string; summary: SleepSummary | null }> = [];

      summaries.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.summary) {
          results.push({
            date: dates[index],
            summary: result.value.summary,
          });
        } else {
          // If summary not found for this date, add null
          results.push({
            date: dates[index],
            summary: null,
          });
        }
      });

      return results;
    },
    enabled: !!userId && dates.length > 0,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
};

/**
 * Hook to fetch the latest sleep summary (previous night)
 */
export const useLatestSleepSummary = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['sleep-summary', 'latest', userId],
    queryFn: async () => {
      if (!userId) return null;

      try {
        const response = await backendAPIService.getSleepSummary(userId);
        return response.summary;
      } catch (error: any) {
        // If 404, no sleep data available (not an error)
        if (error.message?.includes('404') || error.message?.includes('No sleep data')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
};

