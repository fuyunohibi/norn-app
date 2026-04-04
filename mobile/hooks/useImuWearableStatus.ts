import { useQuery } from "@tanstack/react-query";
import { backendAPIService } from "../services/backend-api.service";

/**
 * Wearable on/off is inferred from the backend: last `activity_events` row (including `ping` heartbeats).
 * Omit `deviceId` to include any device for this user (recommended unless you filter to one clip).
 */
export const useImuWearableStatus = (userId?: string, deviceId?: string) => {
  return useQuery({
    queryKey: ["imu-wearable-status", userId, deviceId ?? "any"],
    queryFn: () => backendAPIService.getImuWearableStatus(userId!, deviceId),
    enabled: Boolean(userId),
    refetchInterval: 5000,
    staleTime: 2000,
  });
};
