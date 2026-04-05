import type {
  DailyStatistic,
  DailyStatisticInsert,
  DailyStatisticUpdate,
} from '@/database/types';
import { supabase } from '@/utils/supabase';

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

