import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { NornColors } from "@/theme";
import type { ActivityStatistics } from "@/services/backend-api.service";
import type { HomeActivityVisual } from "./home-activity-visual";

type MyDaySummaryCardProps = {
  showSignedIn: boolean;
  loading: boolean;
  hasError: boolean;
  activityToday?: ActivityStatistics;
  todayTrackedMinutes: number;
  todayActivityBreakdown: Array<[string, { count: number; total_seconds: number }]>;
  myDayGridKeys: string[];
  getVisual: (activityKey: string) => HomeActivityVisual;
  formatActivityLabel: (activityKey: string) => string;
};

export function MyDaySummaryCard({
  showSignedIn,
  loading,
  hasError,
  activityToday,
  todayTrackedMinutes,
  todayActivityBreakdown,
  myDayGridKeys,
  getVisual,
  formatActivityLabel,
}: MyDaySummaryCardProps) {
  return (
    <View
      className="mt-4 rounded-[28px] px-4 pb-5 pt-4"
      style={{ backgroundColor: NornColors.surfaceWarm }}
    >
      {!showSignedIn ? (
        <View
          className="items-center rounded-[24px] px-5 py-8"
          style={{ backgroundColor: NornColors.surfaceWarmMuted }}
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
            <MaterialIcons name="lock-outline" size={28} color="#A8A29E" />
          </View>
          <Text className="mt-3 text-center text-sm font-hell leading-5 text-stone-600">
            Sign in to see a summary of your clip activity for today.
          </Text>
        </View>
      ) : loading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={NornColors.brandOrange} />
        </View>
      ) : hasError ? (
        <View className="items-center rounded-[24px] px-5 py-6">
          <MaterialIcons name="cloud-off" size={26} color="#C2410C" />
          <Text className="mt-3 text-center text-sm font-hell leading-5 text-orange-900">
            Could not load today&apos;s summary. Open Statistics when your connection is back.
          </Text>
        </View>
      ) : (
        <>
          <Text className="mb-3 text-base font-hell-round-bold text-stone-800">
            Today at a glance
          </Text>
          <LinearGradient
            colors={[...NornColors.heroActivityGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "relative",
              borderRadius: 24,
              paddingHorizontal: 20,
              paddingVertical: 22,
              marginBottom: 4,
              overflow: "hidden",
            }}
          >
            <Text className="pr-16 text-xl font-hell-round-bold text-white">
              Your movement matters
            </Text>
            <Text className="mt-2 pr-14 text-sm font-hell leading-5 text-white/90">
              {(activityToday?.total_events ?? 0) > 0
                ? `You logged ${activityToday?.total_events ?? 0} state change${(activityToday?.total_events ?? 0) === 1 ? "" : "s"} and about ${Math.round(todayTrackedMinutes)} minutes of wear time today. Open Statistics for more detail.`
                : "When your clip reports walking, sitting, and other states, a fuller picture of your day will appear here."}
            </Text>
            <View
              style={{ position: "absolute", right: 12, bottom: 10, opacity: 0.38 }}
              pointerEvents="none"
            >
              <MaterialIcons name="auto-awesome" size={40} color="#FFFFFF" />
            </View>
          </LinearGradient>

          <Text className="mb-1 mt-5 text-base font-hell-round-bold text-stone-800">
            Activity mix
          </Text>
          {todayActivityBreakdown.length === 0 ? (
            <Text className="mb-3 text-xs font-hell leading-4 text-stone-500">
              Your clip hasn&apos;t reported class changes yet — these tiles will fill in as it learns your day.
            </Text>
          ) : null}
          <View className="gap-3">
            {[0, 2].map((start) => (
              <View key={start} className="flex-row gap-3">
                {myDayGridKeys.slice(start, start + 2).map((key) => {
                  const bucket = activityToday?.by_activity?.[key] ?? {
                    count: 0,
                    total_seconds: 0,
                  };
                  const v = getVisual(key);
                  const secs = bucket.total_seconds ?? 0;
                  const mins = Math.round(secs / 60);
                  const count = bucket.count ?? 0;
                  const sub =
                    count === 0
                      ? "No events yet"
                      : mins > 0
                        ? `${count} event${count === 1 ? "" : "s"} · ~${mins} min`
                        : `${count} event${count === 1 ? "" : "s"}`;
                  return (
                    <View
                      key={key}
                      className="min-h-[76px] flex-1 flex-row items-center gap-3 rounded-[24px] bg-[#F3EEE6] px-4 py-3.5"
                    >
                      <View
                        className="h-11 w-11 items-center justify-center rounded-full"
                        style={{ backgroundColor: v.accent }}
                      >
                        <MaterialIcons name={v.icon} size={22} color="#FFFFFF" />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-[15px] font-hell-round-bold text-stone-900"
                          numberOfLines={1}
                        >
                          {formatActivityLabel(key)}
                        </Text>
                        <Text
                          className="mt-0.5 text-xs font-hell text-stone-500"
                          numberOfLines={2}
                        >
                          {sub}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
