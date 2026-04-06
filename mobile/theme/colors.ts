/**
 * Brand and UI palette — prefer these over hard-coded hex in screens.
 * Tailwind `primary.accent` matches `brandOrange`.
 */
export const NornColors = {
  brandOrange: "#FF7300",
  brandOrangeDeep: "#E85D04",
  brandOrangeLight: "#FF9F4A",
  /** Home “Your movement matters” gradient (start → end). */
  heroActivityGradient: ["#E85D04", "#FF7300", "#FF9F4A"] as const,
  /** Banner mascot strip behind `NornStateMascot`. */
  mascotBackground: "#f5f5f5",
  /** Warm surfaces (My day card, etc.). */
  surfaceWarm: "#FAF8F4",
  surfaceWarmMuted: "#F3EEE6",
} as const;

/** `Switch` track colors used across Settings / Notifications. */
export const switchTrackColors = {
  false: "#E5E7EB",
  true: NornColors.brandOrange,
} as const;
