import { Activity, Shield, Zap } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { NornColors, shadowStyles } from "@/theme";

type OverviewSectionProps = {
  hasActivityData: boolean;
  totalEvents30: number;
  safetySegments30: number;
  trackedMinutes30: number;
};

export function OverviewSection({
  hasActivityData,
  totalEvents30,
  safetySegments30,
  trackedMinutes30,
}: OverviewSectionProps) {
  return (
    <View className="mb-2">
      <Text className="mb-1 text-xs font-hell-round-bold uppercase tracking-[0.08em] text-gray-400">
        Summary
      </Text>
      <Text className="mb-5 text-xl font-hell-round-bold text-gray-900">Overview</Text>
      {!hasActivityData ? (
        <View
          className="overflow-hidden rounded-3xl border border-orange-100/80 bg-orange-50/35 px-5 py-8"
          style={shadowStyles.card}
        >
          <Text className="text-center font-hell text-base leading-6 text-gray-600">
            No activity from your clip in the last 30 days. When it picks up changes in how you move
            or rest, those moments will appear here.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          <View
            className="min-w-[140px] flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
            style={shadowStyles.card}
          >
            <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/90">
              <Activity size={22} color={NornColors.brandOrange} strokeWidth={2.2} />
            </View>
            <Text className="text-3xl font-hell-round-bold text-gray-900">{totalEvents30}</Text>
            <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">State changes (30 days)</Text>
          </View>

          <View
            className="min-w-[140px] flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
            style={shadowStyles.card}
          >
            <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50/90">
              <Shield size={22} color="#D97706" strokeWidth={2.2} />
            </View>
            <Text className="text-3xl font-hell-round-bold text-gray-900">{safetySegments30}</Text>
            <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">
              Safety segments (near-fall, falling, after-fall)
            </Text>
          </View>

          <View
            className="min-w-[140px] flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
            style={shadowStyles.card}
          >
            <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/90">
              <Zap size={22} color="#306DEE" strokeWidth={2.2} />
            </View>
            <Text className="text-3xl font-hell-round-bold text-gray-900">{Math.round(trackedMinutes30)}</Text>
            <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">Est. tracked minutes</Text>
          </View>
        </View>
      )}
    </View>
  );
}
