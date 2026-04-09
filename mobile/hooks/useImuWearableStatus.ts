import { useQuery } from "@tanstack/react-query";
import type { ImuWearableStatusResponse } from "../services/backend-api.service";
import { backendAPIService } from "../services/backend-api.service";
import { getImuWearableStatusFromSupabase } from "../services/imu-wearable-supabase.service";
import { MOCK_FLAGS, MOCK_IMU_WEARABLE_BODY } from "../mock";

/**
 * Manual local toggle for mocking wearable online status.
 * Set to `true` to use mock data, `false` to use live backend/Supabase.
 */
const MOCK_IMU_ONLINE = MOCK_FLAGS.imuOnline;

function mockImuWearableStatus(): ImuWearableStatusResponse {
  return {
    ...MOCK_IMU_WEARABLE_BODY,
    last_seen_at: new Date().toISOString(),
  };
}

/**
 * Wearable on/off from last `activity_events` row (including `ping` heartbeats).
 * Tries FastAPI first; if the phone cannot reach the LAN backend, falls back to Supabase (HTTPS + RLS).
 */
export const useImuWearableStatus = (userId?: string, deviceId?: string) => {
  return useQuery({
    queryKey: [
      "imu-wearable-status",
      userId,
      deviceId ?? "any",
      MOCK_IMU_ONLINE ? "mock" : "live",
      // New key when MOCK_IMU_WEARABLE_BODY changes → immediate UI update on save (no refetch interval).
      ...(MOCK_IMU_ONLINE ? [JSON.stringify(MOCK_IMU_WEARABLE_BODY)] : []),
    ],
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
    // Poll faster so UI state tracks backend activity changes with less lag.
    refetchInterval: MOCK_IMU_ONLINE ? false : 2000,
    staleTime: MOCK_IMU_ONLINE ? Infinity : 1000,
  });
};
