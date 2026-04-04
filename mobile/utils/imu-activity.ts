import type { ActivityStatistics } from '../services/backend-api.service';

/**
 * Backend `by_activity` keys (from firmware codes w, st, si, r, f, af, nf).
 * Critical alerts: f, af, nf per thesis.
 */
export const IMU_CRITICAL_ACTIVITY_KEYS = new Set([
  'falling',
  'after_fall',
  'unstable_standing',
]);

/** Map backend aggregate keys → short thesis codes (for display). */
const BACKEND_KEY_TO_CODE: Record<string, string> = {
  walking: 'w',
  standing: 'st',
  sitting: 'si',
  running: 'r',
  falling: 'f',
  after_fall: 'af',
  unstable_standing: 'nf',
};

const CODE_TO_LABEL: Record<string, string> = {
  w: 'Walking',
  st: 'Standing',
  si: 'Sitting',
  r: 'Running',
  f: 'Falling',
  af: 'After fall (on floor)',
  nf: 'Near-fall (unstable)',
};

/** Human-readable label for backend snake_case keys or raw short codes. */
export function formatActivityDisplayName(key: string): string {
  const k = key.trim().toLowerCase().replace(/\s+/g, '_');
  if (CODE_TO_LABEL[k]) return CODE_TO_LABEL[k];
  const code = BACKEND_KEY_TO_CODE[k];
  if (code && CODE_TO_LABEL[code]) return CODE_TO_LABEL[code];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function activityCodeForBackendKey(key: string): string | null {
  const k = key.trim().toLowerCase();
  if (BACKEND_KEY_TO_CODE[k]) return BACKEND_KEY_TO_CODE[k];
  if (CODE_TO_LABEL[k]) return k;
  return null;
}

export function criticalActivityTotals(
  byActivity: Record<string, { count?: number; total_seconds?: number }> | undefined,
): { count: number; totalSeconds: number } {
  if (!byActivity) return { count: 0, totalSeconds: 0 };
  let count = 0;
  let totalSeconds = 0;
  for (const k of IMU_CRITICAL_ACTIVITY_KEYS) {
    const b = byActivity[k];
    if (b) {
      count += b.count ?? 0;
      totalSeconds += b.total_seconds ?? 0;
    }
  }
  return { count, totalSeconds };
}

export type DailyEventBucket = {
  key: string;
  date: Date;
  count: number;
  weekday: string;
  day: string;
};

/**
 * Bucket activity `events` into local-calendar days for the last `dayCount` days (ending today).
 */
export function bucketActivityEventsByDay(
  events: NonNullable<ActivityStatistics['events']>,
  dayCount: number,
): DailyEventBucket[] {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const keys: string[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(utcMidnight);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k, 0);

  for (const ev of events) {
    const raw = ev.created_at;
    if (!raw) continue;
    const dayKey = raw.slice(0, 10);
    if (counts.has(dayKey)) {
      counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
    }
  }

  return keys.map((key) => {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return {
      key,
      date,
      count: counts.get(key) ?? 0,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      day: date.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'UTC' }),
    };
  });
}
