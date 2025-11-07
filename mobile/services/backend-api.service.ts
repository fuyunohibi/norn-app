import Constants from 'expo-constants';

// Get API URL from environment or use default
const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export interface ModeChangeRequest {
  mode: 'sleep' | 'fall';
  user_id?: string;
}

export interface ModeChangeResponse {
  status: string;
  mode: string;
  timestamp?: string;
}

export interface SensorReadingResponse {
  status: string;
  mode: string;
  count: number;
  readings: Array<{
    id: string;
    reading_type: 'sleep' | 'fall' | 'movement' | 'presence';
    timestamp: string;
    raw_data: any;
    is_person_detected?: boolean;
    is_movement_detected?: boolean;
    is_fall_detected?: boolean;
    sleep_quality_score?: number;
  }>;
}

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

export interface SleepSummaryResponse {
  status: string;
  summary: SleepSummary;
}

class BackendAPIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
    if (__DEV__) {
      console.log('🔌 Backend API Service initialized with URL:', this.baseUrl);
      
      // Warn if using localhost (won't work on physical devices)
      if (this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')) {
        console.warn('⚠️  WARNING: Using localhost/127.0.0.1 will not work on physical devices!');
        console.warn('   Use your computer\'s IP address instead (e.g., http://192.168.1.100:8000)');
        console.warn('   Set EXPO_PUBLIC_API_URL in your .env file');
      }
    }
  }

  /**
   * Change ESP32 sensor mode
   */
  async changeMode(mode: 'sleep' | 'fall', userId?: string): Promise<ModeChangeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/mode/change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error changing mode:', error);
      throw error;
    }
  }

  /**
   * Get latest sensor readings
   */
  async getLatestReadings(mode: 'sleep_detection' | 'fall_detection', userId?: string, limit = 10): Promise<SensorReadingResponse> {
    try {
      const url = new URL(`${this.baseUrl}/api/v1/sensor/readings/${mode}`);
      if (userId) url.searchParams.set('user_id', userId);
      url.searchParams.set('limit', limit.toString());

      if (__DEV__) console.log('📡 Fetching from:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (__DEV__) console.error('❌ Error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { detail: errorText || response.statusText };
        }
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (__DEV__) {
        console.log('✅ Received data:', {
          status: data.status,
          mode: data.mode,
          count: data.count,
          readingsLength: data.readings?.length || 0,
        });
      }
      return data;
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      if (__DEV__) {
        console.error('❌ Error fetching readings:', errorMessage);
        
        // Provide helpful error messages
        if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
          console.error('');
          console.error('🔧 TROUBLESHOOTING:');
          console.error('   1. Is the backend running? Check: curl ' + this.baseUrl + '/health');
          console.error('   2. Is the IP address correct? Current: ' + this.baseUrl);
          console.error('   3. Are you on the same network?');
          console.error('   4. Is the backend bound to 0.0.0.0? (not just localhost)');
          console.error('   5. Check firewall settings');
          console.error('');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/health/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching health status:', error);
      throw error;
    }
  }

  /**
   * Get user statistics (total readings, latest reading, etc.)
   */
  async getUserStatistics(userId: string): Promise<{
    totalReadings: number;
    sleepReadings: number;
    fallReadings: number;
    latestReading: any;
    lastUpdated: string | null;
  }> {
    try {
      // Fetch both sleep and fall readings to calculate statistics
      const [sleepData, fallData] = await Promise.all([
        this.getLatestReadings('sleep_detection', userId, 100).catch(() => ({ readings: [] })),
        this.getLatestReadings('fall_detection', userId, 100).catch(() => ({ readings: [] })),
      ]);

      const allReadings = [
        ...(sleepData.readings || []),
        ...(fallData.readings || []),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        totalReadings: allReadings.length,
        sleepReadings: sleepData.readings?.length || 0,
        fallReadings: fallData.readings?.length || 0,
        latestReading: allReadings[0] || null,
        lastUpdated: allReadings[0]?.timestamp || null,
      };
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw error;
    }
  }

  /**
   * Get sleep summary for a specific date
   * @param userId User ID to get sleep data for
   * @param date Optional date (YYYY-MM-DD) to analyze. Defaults to previous night.
   */
  async getSleepSummary(userId: string, date?: string): Promise<SleepSummaryResponse> {
    try {
      const url = new URL(`${this.baseUrl}/api/v1/sensor/sleep-summary/${userId}`);
      if (date) {
        url.searchParams.set('date', date);
      }

      if (__DEV__) console.log('🌙 Fetching sleep summary from:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (__DEV__) console.error('❌ Error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { detail: errorText || response.statusText };
        }
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (__DEV__) {
        console.log('✅ Received sleep summary:', {
          status: data.status,
          grade: data.summary?.sleep_score_grade,
          quality: data.summary?.overall_quality,
          date: data.summary?.date,
        });
      }
      return data;
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      if (__DEV__) {
        console.error('❌ Error fetching sleep summary:', errorMessage);
      }
      throw error;
    }
  }
}

export const backendAPIService = new BackendAPIService();

