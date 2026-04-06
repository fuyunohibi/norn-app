import { useQuery } from "@tanstack/react-query";
import type { ImuWearableStatusResponse } from "../services/backend-api.service";
import { backendAPIService } from "../services/backend-api.service";
import { getImuWearableStatusFromSupabase } from "../services/imu-wearable-supabase.service";

/**
 * In __DEV__, the wearable is mocked as Live (online) unless you set
 * `EXPO_PUBLIC_MOCK_IMU_ONLINE=0` in the environment and restart Metro.
 */
const MOCK_IMU_ONLINE =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_MOCK_IMU_ONLINE !== "0";

function mockImuWearableStatus(): ImuWearableStatusResponse {
  return {
    status: "success",
    online: true,
    last_seen_at: new Date().toISOString(),
    age_seconds: 12,
    activity_code: "f",
    activity_label: "Falling",
    device_id: null,
    reason: "mock",
  };
}

/**
 * Wearable on/off from last `activity_events` row (including `ping` heartbeats).
 * Tries FastAPI first; if the phone cannot reach the LAN backend, falls back to Supabase (HTTPS + RLS).
 */
export const useImuWearableStatus = (userId?: string, deviceId?: string) => {
  return useQuery({
    queryKey: ["imu-wearable-status", userId, deviceId ?? "any", MOCK_IMU_ONLINE ? "mock" : "live"],
    queryFn: async () => {
      if (MOCK_IMU_ONLINE) {
        return mockImuWearableStatus();
      }
      try {
        return await backendAPIService.getImuWearableStatus(userId!, deviceId);
      } catch (backendErr) {
        try {
          return await getImuWearableStatusFromSupabase(userId!, deviceId);
        } catch {
          throw backendErr;
        }
      }
    },
    enabled: Boolean(userId),
    refetchInterval: MOCK_IMU_ONLINE ? false : 5000,
    staleTime: MOCK_IMU_ONLINE ? Infinity : 2000,
  });
};
