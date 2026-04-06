import { Shield, User } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { shadowStyles } from "@/theme";
import type { ActivityStatistics } from "@/services/backend-api.service";
import { formatActivityDisplayName } from "@/utils/imu-activity";
import { formatMinutesFromSeconds } from "@/utils/statistics.utils";

type ModeBreakdownSectionProps = {
  hasActivityData: boolean;
  activity30?: ActivityStatistics;
  safetySegments30: number;
};

export function ModeBreakdownSection({
  hasActivityData,
  activity30,
  safetySegments30,
}: ModeBreakdownSectionProps) {
  return (
    <View className="mb-2">
      <Text className="mb-1 text-xs font-hell-round-bold uppercase tracking-[0.08em] text-gray-400">
        Safety
      </Text>
      <Text className="mb-5 text-xl font-hell-round-bold text-gray-900">Activity breakdown (30 days)</Text>
      {!hasActivityData ? (
        <View className="rounded-3xl border border-gray-100 bg-gray-50/80 px-5 py-6">
          <Text className="text-center font-hell text-gray-600">No activity breakdown yet.</Text>
        </View>
      ) : (
        <View className="gap-4">
          <View className="flex-row gap-3">
            <View
              className="flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
              style={shadowStyles.card}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/90">
                  <User size={24} color="#306DEE" fill="#306DEE" strokeWidth={2.2} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-2xl font-hell-round-bold text-gray-900">
                    {activity30?.total_events ?? 0}
                  </Text>
                  <Text className="mt-0.5 font-hell text-xs leading-4 text-gray-500">
                    Posture / movement changes
                  </Text>
                </View>
              </View>
            </View>

            <View
              className="flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
              style={shadowStyles.card}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50/90">
                  <Shield size={24} color="#D97706" fill="#D97706" strokeWidth={2} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-2xl font-hell-round-bold text-gray-900">{safetySegments30}</Text>
                  <Text className="mt-0.5 font-hell text-xs leading-4 text-gray-500">
                    Near-fall, falling, after-fall
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {activity30?.by_activity && Object.keys(activity30.by_activity).length > 0 ? (
            <View
              className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
              style={shadowStyles.card}
            >
              <Text className="mb-3 text-base font-hell-round-bold text-gray-900">Time by activity</Text>
              {Object.entries(activity30.by_activity).map(([name, bucket]) => {
                const segmentCount = bucket.count ?? 0;
                const segmentLabel = segmentCount === 1 ? "segment" : "segments";
                return (
                  <View
                    key={name}
                    className="mb-2 flex-row items-center justify-between rounded-2xl bg-gray-50/90 px-3.5 py-3 last:mb-0"
                  >
                    <Text className="mr-2 flex-shrink font-hell text-gray-800">
                      {formatActivityDisplayName(name)}
                    </Text>
                    <Text className="font-hell-round-bold text-gray-900">
                      {formatMinutesFromSeconds(bucket.total_seconds ?? 0)} · {segmentCount} {segmentLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
