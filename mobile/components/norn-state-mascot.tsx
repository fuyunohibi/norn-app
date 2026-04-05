import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { activityCodeForBackendKey, formatActivityDisplayName } from "../utils/imu-activity";

import nornAfterFalling from "../assets/logos/norn-icons/norn-after-falling.svg";
import nornFalling from "../assets/logos/norn-icons/norn-falling.svg";
import nornNearFall from "../assets/logos/norn-icons/norn-near-fall.svg";
import nornRunning from "../assets/logos/norn-icons/norn-running.svg";
import nornSitting from "../assets/logos/norn-icons/norn-sitting.svg";
import nornStanding from "../assets/logos/norn-icons/norn-standing.svg";
import nornWalking from "../assets/logos/norn-icons/norn-walking.svg";

type NornCode = "st" | "si" | "w" | "r" | "nf" | "f" | "af";

const NORNS: Record<NornCode, ImageSourcePropType> = {
  st: nornStanding,
  si: nornSitting,
  w: nornWalking,
  r: nornRunning,
  nf: nornNearFall,
  f: nornFalling,
  af: nornAfterFalling,
};

const CODES: NornCode[] = ["st", "si", "w", "r", "nf", "f", "af"];

const BACKGROUND: Record<
  NornCode,
  { colors: [string, string]; textClass: string; subtextClass: string }
> = {
  st: {
    colors: ["#E6F2FA", "#B9D9F0"],
    textClass: "text-gray-900",
    subtextClass: "text-gray-600",
  },
  si: {
    colors: ["#FFF6E0", "#F5D78A"],
    textClass: "text-gray-900",
    subtextClass: "text-gray-600",
  },
  w: {
    colors: ["#E4F5EA", "#A8DCC0"],
    textClass: "text-gray-900",
    subtextClass: "text-gray-600",
  },
  r: {
    colors: ["#FFE4E4", "#F5A8A8"],
    textClass: "text-gray-900",
    subtextClass: "text-gray-600",
  },
  nf: {
    colors: ["#A8BCC9", "#6E8798"],
    textClass: "text-gray-900",
    subtextClass: "text-gray-800",
  },
  f: {
    colors: ["#6B7780", "#3D454C"],
    textClass: "text-white",
    subtextClass: "text-gray-200",
  },
  af: {
    colors: ["#2A3036", "#12161A"],
    textClass: "text-white",
    subtextClass: "text-gray-400",
  },
};

function resolveNornCode(raw?: string | null): NornCode {
  if (!raw) return "st";
  const k = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (CODES.includes(k as NornCode)) return k as NornCode;
  const mapped = activityCodeForBackendKey(k);
  if (mapped && CODES.includes(mapped as NornCode)) return mapped as NornCode;
  return "st";
}

export interface NornStateMascotProps {
  activityCode?: string | null;
  loading?: boolean;
  statusError?: boolean;
  signedIn?: boolean;
}

/**
 * State mascot: gradient panel + static icon + labels.
 * Rain and float animation were removed pending a simpler approach (e.g. Lottie, or Reanimated in a dev build).
 */
export const NornStateMascot: React.FC<NornStateMascotProps> = ({
  activityCode,
  loading = false,
  statusError = false,
  signedIn = true,
}) => {
  const code = useMemo(() => resolveNornCode(activityCode), [activityCode]);
  const theme = BACKGROUND[code];

  const headline = formatActivityDisplayName(code);
  const subtitle = !signedIn
    ? "Sign in to see live activity from your clip."
    : statusError
      ? "Could not load wearable status."
      : loading
        ? "Checking your clip…"
        : "Live activity from NORN";

  return (
    <View className="rounded-[2.5rem] h-full w-full overflow-hidden border border-gray-200/80">
      <LinearGradient
        colors={theme.colors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-1 items-center justify-center px-6 pt-4 pb-4">
        {loading ? (
          <View
            className="absolute items-center justify-center"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <ActivityIndicator color="#FF7300" size="large" />
          </View>
        ) : null}

        <View style={{ opacity: loading ? 0.35 : 1 }}>
          <Image
            source={NORNS[code]}
            style={{ width: 200, height: 200 }}
            contentFit="contain"
            accessibilityLabel={headline}
          />
        </View>

        <Text
          className={`mt-1 text-center text-lg font-hell-round-bold ${theme.textClass}`}
        >
          {headline}
        </Text>
        <Text
          className={`mt-1 text-center text-sm font-hell px-2 ${theme.subtextClass}`}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
};
