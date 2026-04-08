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
  const nowHour = new Date().getHours();
  const periodLabel = nowHour < 12 ? "this morning" : nowHour < 18 ? "this afternoon" : "this evening";
  const totalEvents = activityToday?.total_events ?? 0;
  const recentEvents = (activityToday?.events ?? [])
    .filter((e) => e.activity && String(e.activity).toLowerCase() !== "ping")
    .slice(0, 20);
  const recentCounts = recentEvents.reduce<Record<string, number>>((acc, e) => {
    const k = String(e.activity).toLowerCase();
    const mapped =
      k === "st"
        ? "standing"
        : k === "si"
          ? "sitting"
          : k === "w"
            ? "walking"
            : k === "r"
              ? "running"
              : k === "f"
                ? "falling"
                : k === "af"
                  ? "after_fall"
                  : k === "nf"
                    ? "unstable_standing"
                    : k;
    acc[mapped] = (acc[mapped] ?? 0) + 1;
    return acc;
  }, {});
  const recentSedentary = (recentCounts.sitting ?? 0) + (recentCounts.standing ?? 0);
  const recentActive = (recentCounts.walking ?? 0) + (recentCounts.running ?? 0);
  const safetyEvents =
    (activityToday?.by_activity?.falling?.count ?? 0) +
    (activityToday?.by_activity?.after_fall?.count ?? 0) +
    (activityToday?.by_activity?.unstable_standing?.count ?? 0);

  const todayInsight =
    totalEvents === 0
      ? "When your clip reports walking, sitting, and other states, a fuller picture of your day will appear here."
      : safetyEvents > 0
        ? `Safety note ${periodLabel}: ${safetyEvents} alert-related event${safetyEvents === 1 ? "" : "s"} detected today. Check the Safety tab and monitor closely.`
        : recentSedentary >= Math.max(10, recentActive * 2)
          ? `Trend ${periodLabel}: the clip wearer has been mostly sedentary recently. A short guided walk or posture reset may help.`
          : recentActive >= Math.max(6, recentSedentary)
            ? `Trend ${periodLabel}: movement has been active and varied. Keep this steady pace with short hydration breaks.`
            : `Trend ${periodLabel}: movement is mixed. Consider alternating brief sitting, standing, and walking blocks to keep balance.`;
  const todayTitle =
    totalEvents === 0
      ? "Clip wearer movement"
      : safetyEvents > 0
        ? "Safety watch"
        : recentSedentary >= Math.max(10, recentActive * 2)
          ? "Sedentary trend"
          : recentActive >= Math.max(6, recentSedentary)
            ? "Active trend"
            : "Balanced movement";

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
            <Text className="pr-16 text-xl font-hell-round-bold text-white">{todayTitle}</Text>
            <Text className="mt-2 pr-14 text-sm font-hell leading-5 text-white/90">
              {todayInsight}
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
                  const countLabel = `${count} event${count === 1 ? "" : "s"}`;
                  const durationLabel = mins > 0 ? `~${mins} min` : "";
                  return (
                    <View key={key} className="flex-1 flex-column">
                      <View
                      
                      className="min-h-[76px] flex-1 flex-row items-center gap-3 rounded-t-[24px] bg-[#F3EEE6] px-4 py-3.5"
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
                        {count === 0 ? (
                          <Text className="mt-1 text-xs font-hell text-stone-500">No events yet</Text>
                        ) : (
                              <Text className="mt-1 text-[11px] font-hell-round-bold text-stone-700">
                                {countLabel}
                              </Text>
                        )}
                      </View>
                      
                    </View>
                      {durationLabel ? (
                              <View className="rounded-b-[24px] bg-white px-2.5 py-1">
                                <Text className="text-[11px] font-hell-round-bold text-amber-700 text-center">
                                  {durationLabel}
                                </Text>
                              </View>
                            ) : null}
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
