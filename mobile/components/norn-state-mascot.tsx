import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { activityCodeForBackendKey, formatActivityDisplayName } from "../utils/imu-activity";

import nornAfterFalling from "../assets/logos/norn-icons/norn-after-falling.svg";
import nornFalling from "../assets/logos/norn-icons/norn-falling.svg";
import nornNearFall from "../assets/logos/norn-icons/norn-near-fall.svg";
import nornRunning from "../assets/logos/norn-icons/norn-running.svg";
import nornSitting from "../assets/logos/norn-icons/norn-sitting.svg";
import nornStanding from "../assets/logos/norn-icons/norn-standing.svg";
import nornWalking from "../assets/logos/norn-icons/norn-walking.svg";

type NornCode = "st" | "si" | "w" | "r" | "nf" | "f" | "af";
const RAIN_X_OFFSETS = [6, 12, 18, 24, 30, 36, 42, 50, 56, 62, 68, 74, 80, 86, 92, 96, 90, 84];
type RainMode = "nf" | "f" | "af";

type RainDropProps = {
  idx: number;
  totalDrops: number;
  rainProgress: SharedValue<number>;
  rainMode: RainMode;
  rainOpacity: number;
};

const RainDrop: React.FC<RainDropProps> = ({ idx, totalDrops, rainProgress, rainMode, rainOpacity }) => {
  const isFallMode = rainMode === "f";
  const isAfterFallMode = rainMode === "af";
  const dropLength = isFallMode ? 22 + (idx % 5) * 2 : isAfterFallMode ? 14 + (idx % 3) : 17 + (idx % 4);
  const dropWidth = isFallMode ? 2.8 : isAfterFallMode ? 1.8 : 2.2;

  const dropStyle = useAnimatedStyle(() => {
    const offset = idx / totalDrops;
    const local = (rainProgress.value + offset) % 1;
    const yEnd = isFallMode ? 260 : isAfterFallMode ? 210 : 235;
    const y = interpolate(local, [0, 1], [-28, yEnd]);
    const sway = interpolate(local, [0, 0.5, 1], [-1.2, 1.2, -1.2]);
    const stretchY = interpolate(local, [0, 0.55, 1], [0.85, 1.08, 0.9]);
    const op = interpolate(local, [0, 0.12, 0.82, 1], [0, 1, 0.95, 0]);
    return {
      opacity: op * rainOpacity,
      transform: [{ translateY: y }, { translateX: sway }, { scaleY: stretchY }],
    };
  }, [idx, totalDrops, rainOpacity, isFallMode, isAfterFallMode]);

  const leftPercent = RAIN_X_OFFSETS[idx] ?? ((idx * 11) % 96);
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: `${leftPercent}%`,
          top: 0,
          width: dropWidth,
          height: dropLength,
          borderRadius: 999,
          backgroundColor: isFallMode
            ? "rgba(190,225,255,0.97)"
            : isAfterFallMode
              ? "rgba(175,210,245,0.78)"
              : "rgba(182,218,250,0.88)",
          borderWidth: 0.5,
          borderColor: "rgba(255,255,255,0.72)",
        },
        dropStyle,
      ]}
    />
  );
};

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
 * State mascot: gradient panel + icon + labels.
 * The icon has a gentle floating/sway animation for a calm "alive" feel.
 */
export const NornStateMascot: React.FC<NornStateMascotProps> = ({
  activityCode,
  loading = false,
  statusError = false,
  signedIn = true,
}) => {
  const code = useMemo(() => resolveNornCode(activityCode), [activityCode]);
  const theme = BACKGROUND[code];
  const entranceOpacity = useSharedValue(0);
  const entranceScale = useSharedValue(0.92);
  const floatY = useSharedValue(0);
  const tilt = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const transitionSpin = useSharedValue(0);
  const transitionX = useSharedValue(0);
  const transitionY = useSharedValue(0);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const rainProgress = useSharedValue(0);
  const prevCodeRef = useRef<NornCode | null>(null);
  const isRainState = code === "nf" || code === "f" || code === "af";
  const rainMode: RainMode = code === "f" ? "f" : code === "af" ? "af" : "nf";
  const rainDropCount = rainMode === "f" ? 34 : rainMode === "nf" ? 24 : 14;
  const rainDurationMs = rainMode === "f" ? 760 : rainMode === "nf" ? 980 : 1350;
  const rainOpacity = code === "f" ? 0.95 : code === "af" ? 0.75 : 0.65;

  useEffect(() => {
    entranceOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    entranceScale.value = withSpring(1, { damping: 15, stiffness: 110 });

    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    tilt.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
        withTiming(-2, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.005, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.995, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [entranceOpacity, entranceScale, floatY, tilt, pulseScale]);

  useEffect(() => {
    const prev = prevCodeRef.current;
    prevCodeRef.current = code;
    if (!prev || prev === code) return;

    const toAlert = code === "nf" || code === "f" || code === "af";
    const fromAlert = prev === "nf" || prev === "f" || prev === "af";

    if (toAlert) {
      // Entering safety-related states: energetic sweep across the container.
      transitionSpin.value = 0;
      transitionX.value = withSequence(
        withTiming(-30, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(34, { duration: 240, easing: Easing.inOut(Easing.cubic) }),
        withTiming(-22, { duration: 210, easing: Easing.inOut(Easing.cubic) }),
        withTiming(12, { duration: 170, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
      );
      transitionY.value = withSequence(
        withTiming(-22, { duration: 170, easing: Easing.out(Easing.quad) }),
        withTiming(14, { duration: 220, easing: Easing.inOut(Easing.quad) }),
        withTiming(-8, { duration: 170, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
      );
      entranceScale.value = withSequence(
        withSpring(1.24, { damping: 9, stiffness: 220 }),
        withSpring(1, { damping: 13, stiffness: 180 }),
      );
      transitionSpin.value = withSequence(
        withTiming(24, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(-18, { duration: 210, easing: Easing.inOut(Easing.quad) }),
        withTiming(10, { duration: 170, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }),
      );
      squashX.value = withSequence(
        withTiming(1.14, { duration: 120 }),
        withTiming(0.9, { duration: 160 }),
        withTiming(1.06, { duration: 140 }),
        withTiming(1, { duration: 150 }),
      );
      squashY.value = withSequence(
        withTiming(0.9, { duration: 120 }),
        withTiming(1.16, { duration: 160 }),
        withTiming(0.96, { duration: 140 }),
        withTiming(1, { duration: 150 }),
      );
      return;
    }

    if (fromAlert) {
      // Leaving alert states: smooth rebound back to center.
      transitionX.value = withSequence(
        withTiming(24, { duration: 170, easing: Easing.out(Easing.quad) }),
        withTiming(-16, { duration: 220, easing: Easing.inOut(Easing.quad) }),
        withTiming(8, { duration: 160, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
      );
      transitionY.value = withSequence(
        withTiming(-16, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(10, { duration: 210, easing: Easing.inOut(Easing.quad) }),
        withTiming(-4, { duration: 150, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }),
      );
      transitionSpin.value = withSequence(
        withTiming(-12, { duration: 180, easing: Easing.inOut(Easing.quad) }),
        withTiming(8, { duration: 160, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }),
      );
      squashX.value = withSequence(
        withTiming(1.1, { duration: 130 }),
        withTiming(0.94, { duration: 150 }),
        withTiming(1.02, { duration: 130 }),
        withTiming(1, { duration: 130 }),
      );
      squashY.value = withSequence(
        withTiming(0.92, { duration: 130 }),
        withTiming(1.1, { duration: 150 }),
        withTiming(0.98, { duration: 130 }),
        withTiming(1, { duration: 130 }),
      );
      return;
    }

    // Normal-to-normal transitions: lively drift around container.
    transitionX.value = withSequence(
      withTiming(-18, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(20, { duration: 200, easing: Easing.inOut(Easing.quad) }),
      withTiming(-10, { duration: 170, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
    );
    transitionY.value = withSequence(
      withTiming(-12, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(8, { duration: 190, easing: Easing.inOut(Easing.quad) }),
      withTiming(-4, { duration: 150, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }),
    );
    transitionSpin.value = withSequence(
      withTiming(16, { duration: 160, easing: Easing.inOut(Easing.quad) }),
      withTiming(-10, { duration: 170, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }),
    );
    squashX.value = withSequence(
      withTiming(1.08, { duration: 110 }),
      withTiming(0.96, { duration: 130 }),
      withTiming(1, { duration: 120 }),
    );
    squashY.value = withSequence(
      withTiming(0.94, { duration: 110 }),
      withTiming(1.06, { duration: 130 }),
      withTiming(1, { duration: 120 }),
    );
  }, [code, transitionSpin, transitionX, transitionY, entranceScale, squashX, squashY]);

  useEffect(() => {
    if (isRainState) {
      rainProgress.value = 0;
      rainProgress.value = withRepeat(
        withTiming(1, { duration: rainDurationMs, easing: Easing.linear }),
        -1,
        false,
      );
      return;
    }
    rainProgress.value = withTiming(0, { duration: 220 });
  }, [isRainState, rainProgress, rainDurationMs]);

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value * (loading ? 0.35 : 1),
    transform: [
      { scaleX: entranceScale.value * pulseScale.value * squashX.value },
      { scaleY: entranceScale.value * pulseScale.value * squashY.value },
      { translateX: transitionX.value },
      { translateY: floatY.value + transitionY.value },
      { rotate: `${tilt.value + transitionSpin.value}deg` },
    ],
  }), [loading]);

  const headline = formatActivityDisplayName(code);
  const subtitle = !signedIn
    ? "Sign in to see live activity from your clip."
    : statusError
      ? "Could not load wearable status."
      : loading
        ? "Checking your clip…"
        : "Live activity from NORN";

  return (
    <View className="rounded-[2.5rem] h-full w-full overflow-hidden">
      <LinearGradient
        colors={theme.colors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-1 items-center justify-center px-6 pt-4 pb-4">
        {isRainState ? (
          <View
            pointerEvents="none"
            className="absolute left-8 right-8"
            style={{ top: 20, bottom: 20 }}
          >
            {Array.from({ length: rainDropCount }).map((_, i) => {
              return (
                <RainDrop
                  key={`rain-${i}`}
                  idx={i}
                  totalDrops={rainDropCount}
                  rainProgress={rainProgress}
                  rainMode={rainMode}
                  rainOpacity={rainOpacity}
                />
              );
            })}
          </View>
        ) : null}

        {loading ? (
          <View
            className="absolute items-center justify-center"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <ActivityIndicator color="#FF7300" size="large" />
          </View>
        ) : null}

        <Animated.View style={mascotAnimatedStyle}>
          <Image
            source={NORNS[code]}
            style={{ width: 200, height: 200 }}
            contentFit="contain"
            accessibilityLabel={headline}
          />
        </Animated.View>

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
