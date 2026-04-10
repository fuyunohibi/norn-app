import type { ImuWearableStatusResponse } from "../services/backend-api.service";

/**
 * Centralized local mock toggles for quick manual testing.
 * Flip these booleans and restart Metro to ensure fresh values.
 */
export const MOCK_FLAGS = {
  imuOnline: false,
  myDayToday: false,
  myDayTodayAtAGlance: {
    noEvents: false,
    safetyWatch: false,
    sedentaryTrend: false,
    activeTrend: false,
    balancedMovement: true,
  },
} as const;

/** Editable IMU status fields (minus `last_seen_at`, set at fetch time). Included in the React Query key so edits hot-reload into the UI without waiting on refetch. */
export const MOCK_IMU_WEARABLE_BODY = {
  status: "success",
  online: true,
  age_seconds: 5,
  /** Falling: API uses `f`; `fall` / `falling` also open the home fall sheet when mocking. */
  activity_code: "f",
  activity_label: "After fall",
  device_id: null,
  reason: "mock",
} as const satisfies Omit<ImuWearableStatusResponse, "last_seen_at">;

