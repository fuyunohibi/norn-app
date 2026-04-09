import { useQuery } from '@tanstack/react-query';
import {
  backendAPIService,
  type ActivityPeriod,
  type ActivityStatisticsResponse,
} from '../services/backend-api.service';
import { MOCK_FLAGS } from '../mock';

/**
 * Manual local toggle for mocking today's activity summary (My day).
 * Other periods (7d / 30d) always use the API.
 */
const MOCK_MY_DAY = MOCK_FLAGS.myDayToday;
const MOCK_MY_DAY_AT_A_GLANCE = MOCK_FLAGS.myDayTodayAtAGlance;

type TodayAtAGlanceMockState =
  | "noEvents"
  | "safetyWatch"
  | "sedentaryTrend"
  | "activeTrend"
  | "balancedMovement";

function resolveTodayAtAGlanceMockState(): TodayAtAGlanceMockState {
  // Priority order if multiple flags are true at once.
  if (MOCK_MY_DAY_AT_A_GLANCE.noEvents) return "noEvents";
  if (MOCK_MY_DAY_AT_A_GLANCE.safetyWatch) return "safetyWatch";
  if (MOCK_MY_DAY_AT_A_GLANCE.sedentaryTrend) return "sedentaryTrend";
  if (MOCK_MY_DAY_AT_A_GLANCE.activeTrend) return "activeTrend";
  return "balancedMovement";
}

function mockActivityStatisticsToday(): ActivityStatisticsResponse {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const atToday = (h: number, m: number) => {
    const d = new Date(start);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const state = resolveTodayAtAGlanceMockState();

  const presets: Record<
    TodayAtAGlanceMockState,
    {
      by_activity: Record<string, { count: number; total_seconds: number }>;
      events: Array<{ activity: string; created_at: string | null }>;
    }
  > = {
    noEvents: {
      by_activity: {
        walking: { count: 0, total_seconds: 0 },
        sitting: { count: 0, total_seconds: 0 },
        standing: { count: 0, total_seconds: 0 },
        running: { count: 0, total_seconds: 0 },
      },
      events: [],
    },
    safetyWatch: {
      by_activity: {
        walking: { count: 6, total_seconds: 20 * 60 },
        sitting: { count: 8, total_seconds: 95 * 60 },
        standing: { count: 7, total_seconds: 64 * 60 },
        running: { count: 1, total_seconds: 6 * 60 },
        falling: { count: 1, total_seconds: 25 },
        after_fall: { count: 1, total_seconds: 90 },
        unstable_standing: { count: 2, total_seconds: 5 * 60 },
      },
      events: [
        { activity: 'si', created_at: atToday(7, 20) },
        { activity: 'st', created_at: atToday(8, 5) },
        { activity: 'w', created_at: atToday(9, 14) },
        { activity: 'nf', created_at: atToday(10, 2) },
        { activity: 'f', created_at: atToday(10, 4) },
        { activity: 'af', created_at: atToday(10, 8) },
        { activity: 'si', created_at: atToday(11, 45) },
        { activity: 'nf', created_at: atToday(14, 12) },
      ],
    },
    sedentaryTrend: {
      by_activity: {
        walking: { count: 3, total_seconds: 14 * 60 },
        sitting: { count: 18, total_seconds: 4 * 60 * 60 + 5 * 60 },
        standing: { count: 14, total_seconds: 2 * 60 * 60 + 15 * 60 },
        running: { count: 0, total_seconds: 0 },
      },
      events: [
        { activity: 'si', created_at: atToday(7, 10) },
        { activity: 'st', created_at: atToday(8, 5) },
        { activity: 'si', created_at: atToday(8, 40) },
        { activity: 'st', created_at: atToday(9, 15) },
        { activity: 'si', created_at: atToday(10, 2) },
        { activity: 'si', created_at: atToday(10, 40) },
        { activity: 'st', created_at: atToday(11, 30) },
        { activity: 'si', created_at: atToday(13, 50) },
        { activity: 'st', created_at: atToday(14, 25) },
        { activity: 'si', created_at: atToday(15, 2) },
        { activity: 'st', created_at: atToday(15, 35) },
      ],
    },
    activeTrend: {
      by_activity: {
        walking: { count: 22, total_seconds: 95 * 60 },
        sitting: { count: 4, total_seconds: 40 * 60 },
        standing: { count: 4, total_seconds: 34 * 60 },
        running: { count: 9, total_seconds: 42 * 60 },
      },
      events: [
        { activity: 'w', created_at: atToday(6, 58) },
        { activity: 'r', created_at: atToday(7, 20) },
        { activity: 'w', created_at: atToday(8, 2) },
        { activity: 'r', created_at: atToday(9, 18) },
        { activity: 'w', created_at: atToday(11, 14) },
        { activity: 'st', created_at: atToday(12, 42) },
        { activity: 'w', created_at: atToday(15, 7) },
        { activity: 'r', created_at: atToday(16, 3) },
      ],
    },
    balancedMovement: {
      by_activity: {
        walking: { count: 18, total_seconds: 52 * 60 },
        sitting: { count: 14, total_seconds: 3 * 60 * 60 + 20 * 60 },
        standing: { count: 16, total_seconds: 95 * 60 },
        running: { count: 4, total_seconds: 18 * 60 },
      },
      events: [
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
      ],
    },
  };

  const { by_activity, events } = presets[state];

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
  const todayAtAGlanceMockState = useMockToday ? resolveTodayAtAGlanceMockState() : 'live';

  return useQuery({
    queryKey: ['activity-statistics', userId, period, useMockToday ? 'mock' : 'live', todayAtAGlanceMockState],
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
