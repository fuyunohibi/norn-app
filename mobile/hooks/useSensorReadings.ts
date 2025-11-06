import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { backendAPIService } from '../services/backend-api.service';
import { useModeStore } from '../stores/mode.store';

const IS_DEV = __DEV__;

/**
 * Hook to fetch real sensor readings from backend API
 */
export const useSensorReadings = (userId?: string) => {
  const { activeMode } = useModeStore();

  const mode = useMemo(
    () => activeMode?.id === 'sleep' ? 'sleep_detection' : 'fall_detection',
    [activeMode?.id]
  );

  return useQuery({
    queryKey: ['sensor-readings', mode, userId],
    queryFn: async () => {
      if (IS_DEV) console.log('🔍 Fetching sensor readings:', { mode, userId });
      try {
        // Only fetch 1 reading since we only need the latest
        const result = await backendAPIService.getLatestReadings(mode, userId, 1);
        if (IS_DEV) {
          console.log('✅ Received sensor readings:', {
            count: result.count,
            readingsCount: result.readings?.length || 0,
          });
        }
        return result;
      } catch (error: any) {
        if (IS_DEV) console.error('❌ Error fetching sensor readings:', error);
        throw error;
      }
    },
    refetchInterval: 3000, // Refetch every 3 seconds (reduced frequency)
    enabled: !!activeMode,
    staleTime: 2000, // Consider data stale after 2 seconds
    gcTime: 10000, // Keep in cache for 10 seconds (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Only refetch on reconnect
  });
};

/**
 * Hook to get the latest sensor reading (most recent)
 */
export const useLatestSensorReading = (userId?: string) => {
  const { data, isLoading, error } = useSensorReadings(userId);

  return useMemo(() => {
    const latestReading = data?.readings?.[0] || null;

    // Parse raw_data if it's a string (memoized)
    let parsedRawData = latestReading?.raw_data;
    if (latestReading?.raw_data) {
      if (typeof latestReading.raw_data === 'string') {
        try {
          parsedRawData = JSON.parse(latestReading.raw_data);
          if (IS_DEV) console.log('📦 Parsed raw_data from string');
        } catch (e) {
          if (IS_DEV) console.warn('⚠️ Failed to parse raw_data:', e);
          parsedRawData = latestReading.raw_data;
        }
      } else {
        // Already an object (JSONB from Supabase)
        parsedRawData = latestReading.raw_data;
        if (IS_DEV) {
          console.log('📦 Raw data is already an object:', {
            mode: parsedRawData?.mode,
            hasComprehensive: !!parsedRawData?.comprehensive,
            hasStatistics: !!parsedRawData?.statistics,
            keys: parsedRawData ? Object.keys(parsedRawData) : [],
          });
        }
      }
    }

    return {
      reading: latestReading,
      rawData: parsedRawData,
      isLoading,
      error,
      timestamp: latestReading?.timestamp,
      readingType: latestReading?.reading_type,
    };
  }, [data, isLoading, error]);
};

