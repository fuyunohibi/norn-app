import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { NornColors, shadowStyles } from "@/theme";

type WearableStatusDot = "neutral" | "pending" | "error" | "ok" | "off";

type WearableStatusChipProps = {
  label: string;
  dot: WearableStatusDot;
  showLoadingSpinner: boolean;
  topInset: number;
};

export function WearableStatusChip({
  label,
  dot,
  showLoadingSpinner,
  topInset,
}: WearableStatusChipProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Wearable status: ${label}. Opens sensor details.`}
      onPress={() => router.push("/sensor")}
      activeOpacity={0.88}
      className="absolute z-20 flex-row items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-2"
      style={{
        right: 14,
        top: topInset + 8,
        ...shadowStyles.chip,
      }}
    >
      {showLoadingSpinner ? (
        <ActivityIndicator size="small" color={NornColors.brandOrange} />
      ) : (
        <View
          className={`h-2 w-2 rounded-full ${
            dot === "ok"
              ? "bg-green-500"
              : dot === "off" || dot === "error"
                ? "bg-red-500"
                : dot === "pending"
                  ? "bg-amber-400"
                  : "bg-gray-400"
          }`}
        />
      )}
      <Text className="text-xs font-hell-round-bold text-gray-900">{label}</Text>
    </TouchableOpacity>
  );
}
