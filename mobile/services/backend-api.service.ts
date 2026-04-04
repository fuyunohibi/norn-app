import Constants from 'expo-constants';

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:8000';

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

/** Legacy sleep summary shape — backend ML sleep pipeline removed with IMU; mocks may still use this. */
export interface SleepSummary {
  overall_quality: number;
  sleep_score_grade: string;
  total_sleep_time_minutes: number;
  time_in_bed_minutes: number;
  sleep_efficiency_percent: number;
  sleep_stages: {
    deep_sleep_minutes: number;
    deep_sleep_percent: number;
    light_sleep_minutes: number;
    light_sleep_percent: number;
    awake_minutes: number;
    awake_percent: number;
  };
  vital_signs: {
    avg_heart_rate: number;
    min_heart_rate: number;
    max_heart_rate: number;
    avg_respiration: number;
    min_respiration: number;
    max_respiration: number;
  };
  sleep_patterns: {
    avg_body_movement: number;
    restlessness_score: number;
    apnea_events: number;
  };
  sleep_onset?: string;
  wake_time?: string;
  recommendations: string[];
  ml_model_version: string;
  user_id: string;
  date: string;
  session_start: string;
  session_end: string;
  total_readings: number;
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
  async changeMode(mode: 'sleep' | 'fall', _userId?: string): Promise<ModeChangeResponse> {
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

    const response = await fetch(url.toString(), {
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

    const response = await fetch(url.toString(), {
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
    const response = await fetch(`${this.baseUrl}/api/v1/health/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  async getUserStatistics(userId: string): Promise<{
    totalReadings: number;
    sleepReadings: number;
    fallReadings: number;
    latestReading: { timestamp: string | null; activity: string | null } | null;
    lastUpdated: string | null;
  }> {
    const [imu, statsRes] = await Promise.all([
      this.getImuWearableStatus(userId, undefined, 90).catch(() => null),
      this.getActivityStatistics(userId, 'today').catch(() => null),
    ]);

    const totalEvents = statsRes?.statistics?.total_events ?? 0;

    return {
      totalReadings: totalEvents,
      sleepReadings: 0,
      fallReadings: 0,
      latestReading: imu
        ? {
            timestamp: imu.last_seen_at,
            activity: imu.activity_label,
          }
        : null,
      lastUpdated: imu?.last_seen_at ?? null,
    };
  }

  /**
   * @deprecated No sleep-summary route on IMU backend; callers should treat as unavailable.
   */
  async getSleepSummary(_userId: string, _date?: string): Promise<{ status: string; summary: SleepSummary }> {
    throw new Error('Sleep summary API is not available for the IMU wearable backend.');
  }
}

export const backendAPIService = new BackendAPIService();
