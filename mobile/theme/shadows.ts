import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

/** White text on gradient hero bands (statistics, settings, etc.). */
export const heroTextShadow: TextStyle = {
  textShadowColor: "rgba(0,0,0,0.35)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

/**
 * Plain view shadows for spreading into other `StyleSheet.create` blocks.
 * (Registered `StyleSheet` values are numeric IDs and must not be spread.)
 */
export const shadowPresets = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  pill: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chip: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 6,
  },
  myDaySheet: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
  },
  modalSheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 28,
  },
} as const satisfies Record<string, ViewStyle>;

/**
 * RN shadow presets — use on `style={…}` or compose via `shadowPresets`.
 */
export const shadowStyles = StyleSheet.create({
  card: shadowPresets.card,
  pill: shadowPresets.pill,
  chip: shadowPresets.chip,
  myDaySheet: shadowPresets.myDaySheet,
  modalSheet: shadowPresets.modalSheet,
});

/** Profile menu cards use iOS continuous corners on top of the standard card shadow. */
export function profileGroupCardStyle(): ViewStyle[] {
  return [shadowPresets.card, { borderCurve: "continuous" }];
}
