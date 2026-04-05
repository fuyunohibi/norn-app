import type { Alert } from '@/database/types';
import Constants from 'expo-constants';

function trimTrailingSlash(url: string) {
  return url.replace(/\/$/, '');
}

/** Same machine as Metro in dev when you omit EXPO_PUBLIC_API_URL (LAN IP, not localhost). */
function devBackendHostFromExpo(): string | null {
  const dbg =
    Constants.expoGoConfig?.debuggerHost ??
    (typeof Constants.expoConfig?.hostUri === 'string' ? Constants.expoConfig.hostUri : undefined);
  if (!dbg) return null;
  const host = dbg.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

const resolvedApiUrlRaw =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_API_URL ||
  (() => {
    const h = __DEV__ ? devBackendHostFromExpo() : null;
    return h ? `http://${h}:8000` : '';
  })() ||
  'http://localhost:8000';

const API_URL = trimTrailingSlash(resolvedApiUrlRaw);

const DEFAULT_FETCH_TIMEOUT_MS = 18_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error(
        `Backend request timed out (${Math.round(timeoutMs / 1000)}s). Check EXPO_PUBLIC_API_URL and that the phone can reach your computer on the same Wi‑Fi.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Backend no longer exposes mmWave mode switching; kept for UI compatibility. */
export interface ModeChangeResponse {
  status: string;
  mode: string;
  timestamp?: string;
}

export type ActivityPeriod = 'today' | '7d' | '30d';

export interface ActivityBucket {
  count: number;
  total_seconds: number;
}

export interface ActivityStatistics {
  period: string;
  from: string;
  to: string;
  by_activity: Record<string, ActivityBucket>;
  events: Array<{ activity: string; created_at: string | null }>;
  total_events: number;
  error?: string;
}

export interface ActivityStatisticsResponse {
  status: string;
  statistics: ActivityStatistics;
}

export interface ImuWearableStatusResponse {
  status: string;
  online: boolean;
  last_seen_at: string | null;
  age_seconds: number | null;
  activity_code: string | null;
  activity_label: string | null;
  device_id?: string | null;
  reason?: string | null;
  error?: string;
}

/** IMU + legacy alerts; rows match Supabase `alerts` (served via FastAPI + service role). */
export interface AlertsListResponse {
  status: string;
  count: number;
  alerts: Alert[];
}

export interface PatchAlertResponse {
  status: string;
  alert: Alert;
}

class BackendAPIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
    if (__DEV__) {
      console.log('🔌 Backend API Service initialized with URL:', this.baseUrl);
      if (this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')) {
        console.warn(
          '⚠️  localhost will not work on a physical device; set EXPO_PUBLIC_API_URL to your LAN IP.',
        );
      }
    }
  }

  /**
   * MPU6050 firmware has no server-side mode API; we only update app UI state.
   */
  async changeMode(mode: 'activity' | 'fall', _userId?: string): Promise<ModeChangeResponse> {
    return {
      status: 'ok',
      mode,
      timestamp: new Date().toISOString(),
    };
  }

  async getActivityStatistics(
    userId: string,
    period: ActivityPeriod,
  ): Promise<ActivityStatisticsResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/sensor/activity/statistics`);
    url.searchParams.set('user_id', userId);
    url.searchParams.set('period', period);

    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const j = JSON.parse(text);
        detail = j.detail ?? text;
      } catch {
        /* keep */
      }
      throw new Error(detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getImuWearableStatus(
    userId: string,
    deviceId?: string,
    staleSeconds: number = 90,
  ): Promise<ImuWearableStatusResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/sensor/imu/status`);
    url.searchParams.set('user_id', userId);
    if (deviceId) {
      url.searchParams.set('device_id', deviceId);
    }
    url.searchParams.set('stale_seconds', String(staleSeconds));

    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const j = JSON.parse(text);
        detail = j.detail ?? text;
      } catch {
        /* keep */
      }
      throw new Error(detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getHealthStatus(): Promise<unknown> {
    const response = await fetchWithTimeout(`${this.baseUrl}/api/v1/health/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * List alerts for a user (same data as Supabase `alerts`; uses backend service role — avoids client RLS issues).
   */
  async listAlerts(
    userId: string,
    options?: { limit?: number; isRead?: boolean; isResolved?: boolean },
  ): Promise<AlertsListResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/alerts/`);
    url.searchParams.set('user_id', userId);
    if (options?.limit != null) {
      url.searchParams.set('limit', String(options.limit));
    }
    if (options?.isRead !== undefined) {
      url.searchParams.set('is_read', String(options.isRead));
    }
    if (options?.isResolved !== undefined) {
      url.searchParams.set('is_resolved', String(options.isResolved));
    }

    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const j = JSON.parse(text);
        detail = j.detail ?? text;
      } catch {
        /* keep */
      }
      throw new Error(detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async patchAlert(
    alertId: string,
    body: { is_read?: boolean; is_resolved?: boolean },
  ): Promise<PatchAlertResponse> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/api/v1/alerts/${encodeURIComponent(alertId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const j = JSON.parse(text);
        detail = j.detail ?? text;
      } catch {
        /* keep */
      }
      throw new Error(detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getUserStatistics(userId: string): Promise<{
    totalReadings: number;
    fallReadings: number;
    latestReading: { timestamp: string | null; activity: string | null } | null;
    lastUpdated: string | null;
  }> {
    const [imu, statsRes] = await Promise.all([
      this.getImuWearableStatus(userId, undefined, 90).catch(() => null),
      this.getActivityStatistics(userId, 'today').catch(() => null),
    ]);

    const totalEvents = statsRes?.statistics?.total_events ?? 0;
    const by = statsRes?.statistics?.by_activity ?? {};
    let criticalCount = 0;
    for (const k of ['falling', 'after_fall', 'unstable_standing'] as const) {
      criticalCount += by[k]?.count ?? 0;
    }

    return {
      totalReadings: totalEvents,
      fallReadings: criticalCount,
      latestReading: imu
        ? {
            timestamp: imu.last_seen_at,
            activity: imu.activity_label,
          }
        : null,
      lastUpdated: imu?.last_seen_at ?? null,
    };
  }
}

export const backendAPIService = new BackendAPIService();
