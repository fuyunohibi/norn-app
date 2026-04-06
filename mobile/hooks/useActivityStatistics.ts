import { useQuery } from '@tanstack/react-query';
import {
  backendAPIService,
  type ActivityPeriod,
  type ActivityStatisticsResponse,
} from '../services/backend-api.service';

/**
 * In __DEV__, today's activity summary (My day) is mocked unless you set
 * `EXPO_PUBLIC_MOCK_MY_DAY=0` in the environment and restart Metro.
 * Other periods (7d / 30d) always use the API.
 */
const MOCK_MY_DAY =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_MOCK_MY_DAY !== '0';

function mockActivityStatisticsToday(): ActivityStatisticsResponse {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const atToday = (h: number, m: number) => {
    const d = new Date(start);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const events: Array<{ activity: string; created_at: string | null }> = [
    { activity: 'si', created_at: atToday(7, 12) },
    { activity: 'st', created_at: atToday(7, 45) },
    { activity: 'w', created_at: atToday(8, 5) },
    { activity: 'st', created_at: atToday(9, 20) },
    { activity: 'si', created_at: atToday(10, 5) },
    { activity: 'w', created_at: atToday(11, 40) },
    { activity: 'r', created_at: atToday(14, 8) },
    { activity: 'st', created_at: atToday(15, 55) },
    { activity: 'w', created_at: atToday(17, 12) },
    { activity: 'si', created_at: atToday(18, 30) },
  ];

  const by_activity = {
    walking: { count: 18, total_seconds: 52 * 60 },
    sitting: { count: 14, total_seconds: 3 * 60 * 60 + 20 * 60 },
    standing: { count: 16, total_seconds: 95 * 60 },
    running: { count: 4, total_seconds: 18 * 60 },
  };

  const total_events = Object.values(by_activity).reduce((s, b) => s + b.count, 0);

  return {
    status: 'success',
    statistics: {
      period: 'today',
      from: start.toISOString(),
      to: now.toISOString(),
      by_activity,
      events,
      total_events,
    },
  };
}

export const useActivityStatistics = (
  userId: string | undefined,
  period: ActivityPeriod = 'today',
) => {
  const useMockToday = MOCK_MY_DAY && period === 'today';

  return useQuery({
    queryKey: ['activity-statistics', userId, period, useMockToday ? 'mock' : 'live'],
    queryFn: () => {
      if (useMockToday) {
        return Promise.resolve(mockActivityStatisticsToday());
      }
      return backendAPIService.getActivityStatistics(userId!, period);
    },
    enabled: Boolean(userId),
    staleTime: useMockToday ? Infinity : 15_000,
    refetchInterval: useMockToday ? false : 20_000,
  });
};
