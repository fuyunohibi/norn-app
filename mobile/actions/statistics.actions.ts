import type {
  DailyStatistic,
  DailyStatisticInsert,
  DailyStatisticUpdate,
} from '@/database/types';
import { supabase } from '@/utils/supabase';
import { aggregateReadingsToDailyStatistics } from '@/utils/statistics-aggregator';
import { getMockFallData, getMockSleepData } from '@/utils/mock-statistics';

export const fetchDailyStatistics = async (userId: string, limit = 90): Promise<DailyStatistic[]> => {
  const { data, error } = await supabase
    .from('daily_statistics')
    .select('*')
    .eq('user_id', userId)
    .order('stat_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching daily statistics:', error);
    return [];
  }

  return data ?? [];
};

export const upsertDailyStatistics = async (
  entries: Array<DailyStatisticInsert | DailyStatisticUpdate>
) => {
  if (!entries.length) return;

  const payload = entries.map((entry) => ({
    ...entry,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('daily_statistics')
    .upsert(payload, { onConflict: 'user_id,stat_date' });

  if (error) {
    console.error('Error upserting daily statistics:', error);
    throw error;
  }
};

export const seedDailyStatisticsFromMock = async (userId: string): Promise<void> => {
  if (!__DEV__) return;

  const sleepReadings = getMockSleepData(userId).readings || [];
  const fallReadings = getMockFallData(userId).readings || [];
  const combinedReadings = [...sleepReadings, ...fallReadings];

  if (!combinedReadings.length) {
    return;
  }

  const aggregates = aggregateReadingsToDailyStatistics(combinedReadings);

  if (!aggregates.length) {
    return;
  }

  const rows: DailyStatisticInsert[] = aggregates.map((aggregate) => ({
    user_id: userId,
    stat_date: aggregate.stat_date,
    total_readings: aggregate.total_readings,
    sleep_readings: aggregate.sleep_readings,
    fall_readings: aggregate.fall_readings,
    respiration_sum: aggregate.respiration_sum,
    respiration_count: aggregate.respiration_count,
    hrv_sum: aggregate.hrv_sum,
    hrv_count: aggregate.hrv_count,
    first_reading_at: aggregate.first_reading_at,
    last_reading_at: aggregate.last_reading_at,
    last_sleep_reading_at: aggregate.last_sleep_reading_at,
    last_fall_reading_at: aggregate.last_fall_reading_at,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  await supabase
    .from('daily_statistics')
    .upsert(rows, { onConflict: 'user_id,stat_date', ignoreDuplicates: false });
};

