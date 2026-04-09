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
    balancedMovement: false,
  },
} as const;

