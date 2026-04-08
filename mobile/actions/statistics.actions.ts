import type {
  DailyStatistic,
  DailyStatisticInsert,
  DailyStatisticUpdate,
} from '@/database/types';
import type { Json } from '@/types/database.types';
import type { ActivityStatistics } from '@/services/backend-api.service';
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

  if (__DEV__) {
    console.log('[daily_statistics] upsert success', {
      rows: payload.length,
      user_id: payload[0]?.user_id ?? null,
      stat_date: payload[0]?.stat_date ?? null,
    });
  }
};

export const upsertTodayDailySummaryFromActivity = async (
  userId: string,
  activityToday: ActivityStatistics,
) => {
  if (!userId) return;

  const totalEvents = activityToday.total_events ?? 0;
  const by = activityToday.by_activity ?? {};
  const criticalKeys = ['falling', 'after_fall', 'unstable_standing'] as const;

  const criticalCount = criticalKeys.reduce((sum, key) => sum + (by[key]?.count ?? 0), 0);
  const fallReadings = (by.falling?.count ?? 0) + (by.after_fall?.count ?? 0);
  const eventTimes = (activityToday.events ?? [])
    .map((e) => e.created_at)
    .filter((v): v is string => Boolean(v))
    .sort();
  const firstReadingAt = eventTimes[0] ?? null;
  const lastReadingAt = eventTimes[eventTimes.length - 1] ?? null;
  const lastFallReadingAt =
    (activityToday.events ?? [])
      .filter((e) => {
        const k = String(e.activity ?? '').toLowerCase();
        return k === 'f' || k === 'af' || k === 'falling' || k === 'after_fall';
      })
      .map((e) => e.created_at)
      .filter((v): v is string => Boolean(v))
      .sort()
      .at(-1) ?? null;

  const breakdown = Object.entries(by).reduce<Record<string, { count: number; total_seconds: number }>>(
    (acc, [k, v]) => {
      acc[k] = {
        count: v.count ?? 0,
        total_seconds: v.total_seconds ?? 0,
      };
      return acc;
    },
    {},
  );

  const entry: DailyStatisticInsert = {
    user_id: userId,
    stat_date: new Date().toISOString().slice(0, 10),
    total_readings: totalEvents,
    imu_activity_event_count: totalEvents,
    imu_critical_event_count: criticalCount,
    fall_readings: fallReadings,
    first_reading_at: firstReadingAt,
    last_reading_at: lastReadingAt,
    last_fall_reading_at: lastFallReadingAt,
    activity_class_breakdown: breakdown,
  };

  if (__DEV__) {
    console.log('[daily_statistics] upsert attempt', {
      user_id: entry.user_id,
      stat_date: entry.stat_date,
      total_readings: entry.total_readings,
      imu_activity_event_count: entry.imu_activity_event_count,
      imu_critical_event_count: entry.imu_critical_event_count,
      fall_readings: entry.fall_readings,
    });
  }

  await upsertDailyStatistics([entry]);
};

const CODE_TO_KEY: Record<string, string> = {
  w: 'walking',
  st: 'standing',
  si: 'sitting',
  r: 'running',
  f: 'falling',
  af: 'after_fall',
  nf: 'unstable_standing',
};

type ActivityEventLite = {
  activity: string | null;
  created_at: string | null;
  timestamp_device?: number | null;
};

export const fetchTodayActivityEvents = async (userId: string): Promise<ActivityEventLite[]> => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from('activity_events')
    .select('activity,created_at,timestamp_device')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[daily_statistics] today events fetch failed:', error);
    throw error;
  }

  return data ?? [];
};

export const buildTodayStatsFromEvents = (
  events: ActivityEventLite[],
): ActivityStatistics => {
  const by: Record<string, { count: number; total_seconds: number }> = {};
  const nowMs = Date.now();
  const MAX_SEGMENT_SECONDS_WITHOUT_HEARTBEAT = 20 * 60;
  const allEvents = events
    .filter((e) => e.created_at)
    .map((e) => ({
      activity: String(e.activity ?? '').toLowerCase(),
      created_at: e.created_at as string,
      timestamp_device:
        typeof e.timestamp_device === 'number' && Number.isFinite(e.timestamp_device)
          ? e.timestamp_device
          : null,
    }))
    .filter((e) => e.activity);

  const normalizedEvents = allEvents.filter((e) => e.activity !== 'ping');
  const pingTimesSec = allEvents
    .filter((e) => e.activity === 'ping')
    .map((e) => new Date(e.created_at).getTime() / 1000)
    .sort((a, b) => a - b);

  // Build an adaptive heartbeat threshold from observed ping cadence.
  // This keeps continuity detection reliable across different firmware rates.
  const pingIntervals = pingTimesSec
    .slice(1)
    .map((t, i) => t - pingTimesSec[i])
    .filter((d) => Number.isFinite(d) && d > 0 && d < 10 * 60)
    .sort((a, b) => a - b);
  const medianPingInterval =
    pingIntervals.length > 0
      ? pingIntervals[Math.floor(pingIntervals.length / 2)]
      : null;
  const heartbeatGapSeconds = Math.max(
    25,
    Math.min(
      180,
      medianPingInterval != null ? Math.round(medianPingInterval * 2.5) : 90,
    ),
  );

  for (let i = 0; i < normalizedEvents.length; i++) {
    const row = normalizedEvents[i];
    const key = CODE_TO_KEY[row.activity] ?? row.activity;
    if (!key) continue;
    const bucket = by[key] ?? { count: 0, total_seconds: 0 };
    bucket.count += 1;

    const curCreatedMs = new Date(row.created_at).getTime();
    const next = normalizedEvents[i + 1];
    const nextCreatedMs = next ? new Date(next.created_at).getTime() : nowMs;
    const createdDeltaSec = Math.max(0, Math.floor((nextCreatedMs - curCreatedMs) / 1000));

    // Prefer device-side timing when both rows have sane, increasing device timestamps.
    const deviceDeltaSec =
      next && row.timestamp_device != null && next.timestamp_device != null
        ? Math.floor((next.timestamp_device - row.timestamp_device) / 1000)
        : null;
    const useDeviceDelta =
      deviceDeltaSec != null &&
      Number.isFinite(deviceDeltaSec) &&
      deviceDeltaSec >= 0 &&
      deviceDeltaSec <= 12 * 60 * 60;

    const rawDeltaSec = useDeviceDelta ? deviceDeltaSec : createdDeltaSec;

    // Heartbeat-aware continuity:
    // only trust full gap when heartbeat covers the whole segment at expected cadence.
    const startSec = curCreatedMs / 1000;
    const endSec = next ? nextCreatedMs / 1000 : nowMs / 1000;
    const pingsBetween = pingTimesSec.filter((ts) => ts > startSec && ts < endSec);
    const hasHealthyHeartbeat =
      pingsBetween.length > 0 &&
      pingsBetween.every((ts, idx) =>
        idx === 0
          ? ts - startSec <= heartbeatGapSeconds
          : ts - pingsBetween[idx - 1] <= heartbeatGapSeconds,
      ) &&
      endSec - pingsBetween[pingsBetween.length - 1] <= heartbeatGapSeconds;

    const deltaSec = hasHealthyHeartbeat
      ? rawDeltaSec
      : Math.min(rawDeltaSec, MAX_SEGMENT_SECONDS_WITHOUT_HEARTBEAT);
    bucket.total_seconds += Math.max(0, deltaSec);
    by[key] = bucket;
  }

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  return {
    period: 'today',
    from: from.toISOString(),
    to: new Date().toISOString(),
    by_activity: by,
    events: normalizedEvents.map((e) => ({ activity: e.activity, created_at: e.created_at })),
    total_events: normalizedEvents.length,
  };
};

export const upsertTodayDailySummaryFromEventsFallback = async (userId: string) => {
  if (!userId) return;
  const rows = await fetchTodayActivityEvents(userId);
  const stats = buildTodayStatsFromEvents(rows);
  const breakdown = stats.by_activity ?? {};
  const start = new Date(stats.from);

  const criticalCount =
    (breakdown.falling?.count ?? 0) +
    (breakdown.after_fall?.count ?? 0) +
    (breakdown.unstable_standing?.count ?? 0);
  const fallReadings = (breakdown.falling?.count ?? 0) + (breakdown.after_fall?.count ?? 0);
  const eventTimes = stats.events
    .map((r) => r.created_at)
    .filter((v): v is string => Boolean(v));

  const entry: DailyStatisticInsert = {
    user_id: userId,
    stat_date: start.toISOString().slice(0, 10),
    total_readings: stats.total_events ?? 0,
    imu_activity_event_count: stats.total_events ?? 0,
    imu_critical_event_count: criticalCount,
    fall_readings: fallReadings,
    first_reading_at: eventTimes[0] ?? null,
    last_reading_at: eventTimes[eventTimes.length - 1] ?? null,
    last_fall_reading_at:
      stats.events
        .filter((r) => {
          const k = String(r.activity ?? '').toLowerCase();
          return k === 'f' || k === 'af' || k === 'falling' || k === 'after_fall';
        })
        .map((r) => r.created_at)
        .filter((v): v is string => Boolean(v))
        .at(-1) ?? null,
    activity_class_breakdown: breakdown as unknown as Json,
  };

  if (__DEV__) {
    console.log('[daily_statistics] fallback upsert attempt', {
      user_id: entry.user_id,
      stat_date: entry.stat_date,
      total_readings: entry.total_readings,
      rowsFetched: rows.length,
    });
  }

  await upsertDailyStatistics([entry]);
};

