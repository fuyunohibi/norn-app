import type { ImuWearableStatusResponse } from './backend-api.service';
import { supabase } from '@/utils/supabase';

/** Short thesis codes → headline (matches FastAPI `get_imu_live_status`). */
const ACTIVITY_LABELS: Record<string, string> = {
  w: 'Walking',
  st: 'Standing',
  si: 'Sitting',
  r: 'Running',
  f: 'Falling',
  af: 'After fall',
  nf: 'Unstable',
};

/** Same long keys as `get_activity_statistics` / firmware aliases. */
const LONG_TO_SHORT: Record<string, string> = {
  walking: 'w',
  standing: 'st',
  sitting: 'si',
  running: 'r',
  falling: 'f',
  after_fall: 'af',
  unstable_standing: 'nf',
};

type EventRow = { activity: string; created_at: string; device_id: string | null };

function shortActivityCode(raw: string): string {
  const a = String(raw ?? '').trim().toLowerCase();
  if (!a || a === 'ping') return '';
  return LONG_TO_SHORT[a] ?? a;
}

/**
 * Same inference as GET /api/v1/sensor/imu/status, using RLS (`activity_events_select_own`).
 * Used when the phone cannot reach the LAN FastAPI but Supabase HTTPS still works.
 */
export async function getImuWearableStatusFromSupabase(
  userId: string,
  deviceId?: string,
  staleSeconds: number = 90,
): Promise<ImuWearableStatusResponse> {
  let qAny = supabase
    .from('activity_events')
    .select('activity, created_at, device_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  let qClass = supabase
    .from('activity_events')
    .select('activity, created_at, device_id')
    .eq('user_id', userId)
    .not('activity', 'eq', 'ping')
    .order('created_at', { ascending: false })
    .limit(1);

  if (deviceId) {
    qAny = qAny.eq('device_id', deviceId);
    qClass = qClass.eq('device_id', deviceId);
  }

  const [resAny, resClass] = await Promise.all([qAny, qClass]);

  if (resAny.error) {
    throw new Error(resAny.error.message);
  }
  if (resClass.error) {
    throw new Error(resClass.error.message);
  }

  const rowAny = (resAny.data ?? [])[0] as EventRow | undefined;
  const rowClass = (resClass.data ?? [])[0] as EventRow | undefined;

  if (!rowAny) {
    return {
      status: 'success',
      online: false,
      last_seen_at: null,
      age_seconds: null,
      activity_code: null,
      activity_label: null,
      device_id: deviceId ?? null,
      reason: 'no_events',
    };
  }

  const lastTsStr = rowAny.created_at;
  let ageSec: number;
  try {
    const lastMs = new Date(lastTsStr).getTime();
    ageSec = Math.max(0, (Date.now() - lastMs) / 1000);
  } catch {
    ageSec = Number.POSITIVE_INFINITY;
  }

  const online = ageSec <= staleSeconds;

  const rawClass = String(rowClass?.activity ?? '')
    .trim()
    .toLowerCase();
  const short =
    rawClass && rawClass !== 'ping' ? shortActivityCode(rawClass) : '';
  const activityLabel =
    short ? ACTIVITY_LABELS[short] ?? rawClass : null;

  return {
    status: 'success',
    online,
    last_seen_at: lastTsStr,
    age_seconds: Number.isFinite(ageSec) ? Math.floor(ageSec) : null,
    activity_code: short || null,
    activity_label: activityLabel,
    device_id: deviceId ?? rowAny.device_id,
    reason: null,
  };
}
