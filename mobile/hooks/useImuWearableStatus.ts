import { useQuery } from "@tanstack/react-query";
import { backendAPIService } from "../services/backend-api.service";
import { DEFAULT_IMU_DEVICE_ID } from "../constants/imu-wearable";

/**
 * Wearable on/off is inferred from the backend: last `activity_events` row (including `ping` heartbeats).
 */
export const useImuWearableStatus = (userId?: string, deviceId: string = DEFAULT_IMU_DEVICE_ID) => {
  return useQuery({
    queryKey: ["imu-wearable-status", userId, deviceId],
    queryFn: () => backendAPIService.getImuWearableStatus(userId!, deviceId),
    enabled: Boolean(userId),
    refetchInterval: 5000,
    staleTime: 2000,
  });
};
