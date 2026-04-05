import { useQuery } from "@tanstack/react-query";
import { backendAPIService } from "../services/backend-api.service";
import { getImuWearableStatusFromSupabase } from "../services/imu-wearable-supabase.service";

/**
 * Wearable on/off from last `activity_events` row (including `ping` heartbeats).
 * Tries FastAPI first; if the phone cannot reach the LAN backend, falls back to Supabase (HTTPS + RLS).
 */
export const useImuWearableStatus = (userId?: string, deviceId?: string) => {
  return useQuery({
    queryKey: ["imu-wearable-status", userId, deviceId ?? "any"],
    queryFn: async () => {
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
    refetchInterval: 5000,
    staleTime: 2000,
  });
};
