import { LinearGradient } from "expo-linear-gradient";
import { Activity, BarChart3, User, Zap } from "lucide-react-native";
import React from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity as RNTouchableOpacity,
  View,
} from "react-native";
import { LineChart, type ChartLabel } from "./line-chart";
import type { ActivityStatistics } from "@/services/backend-api.service";
import { NornColors, heroTextShadow, shadowPresets, shadowStyles } from "@/theme";
import { formatActivityDisplayName } from "@/utils/imu-activity";
import { formatMinutesFromSeconds } from "@/utils/statistics.utils";

type ActivityMode = "trends" | "today";
type TimeRange = "7d" | "30d";

type ActivitySectionProps = {
  activityMode: ActivityMode;
  setActivityMode: (mode: ActivityMode) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  timeRangeOptions: Array<{ id: TimeRange; label: string }>;
  hasActivityData: boolean;
  showStatsSignedIn: boolean;
  chartDayCount: number;
  imuEventValues: number[];
  imuChartLabels: ChartLabel[];
  activityToday?: ActivityStatistics;
  topClassToday: string | null;
};

function RawTouchableOpacity(
  props: React.ComponentProps<typeof RNTouchableOpacity>,
): React.ReactElement {
  return React.createElement(RNTouchableOpacity, props);
}

const touchStyles = StyleSheet.create({
  trendsPill: {
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  trendsPillActive: {
    backgroundColor: NornColors.brandOrange,
  },
  rangePillActive: {
    backgroundColor: NornColors.brandOrange,
  },
});

export function ActivitySection({
  activityMode,
  setActivityMode,
  timeRange,
  setTimeRange,
  timeRangeOptions,
  hasActivityData,
  showStatsSignedIn,
  chartDayCount,
  imuEventValues,
  imuChartLabels,
  activityToday,
  topClassToday,
}: ActivitySectionProps) {
  return (
    <View className="gap-5">
      <View className="mb-1">
        <Text className="text-xs font-hell-round-bold uppercase tracking-[0.08em] text-gray-400">
          Activity
        </Text>
        <Text className="mt-1 text-xl font-hell-round-bold text-gray-900">Trends & today</Text>
      </View>

      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-row rounded-full bg-gray-100 p-1">
          {(["trends", "today"] as const).map((mode) => {
            const isActive = activityMode === mode;
            return (
              <RawTouchableOpacity
                key={mode}
                activeOpacity={0.88}
                onPress={() => setActivityMode(mode)}
                style={[touchStyles.trendsPill, isActive && touchStyles.trendsPillActive]}
              >
                <Text
                  className={`text-xs font-hell-round-bold ${isActive ? "text-white" : "text-gray-500"}`}
                >
                  {mode === "trends" ? "Trends" : "Today"}
                </Text>
              </RawTouchableOpacity>
            );
          })}
        </View>
        {activityMode === "trends" ? (
          <View className="flex-row rounded-full bg-gray-100 p-1">
            {timeRangeOptions.map((option) => {
              const isActive = timeRange === option.id;
              return (
                <RawTouchableOpacity
                  key={option.id}
                  activeOpacity={0.88}
                  onPress={() => setTimeRange(option.id)}
                  style={[touchStyles.trendsPill, isActive && touchStyles.rangePillActive]}
                >
                  <Text
                    className={`text-xs font-hell-round-bold ${isActive ? "text-white" : "text-gray-500"}`}
                  >
                    {option.label}
                  </Text>
                </RawTouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      {activityMode === "trends" ? (
        !hasActivityData ? (
          <View
            className="items-center overflow-hidden rounded-3xl border border-gray-100 bg-gray-50/90 px-6 py-10"
            style={shadowStyles.card}
          >
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <BarChart3 size={30} color="#9CA3AF" strokeWidth={2} />
            </View>
            <Text className="mt-5 text-lg font-hell-round-bold text-gray-900">No events yet</Text>
            <Text className="mt-2 max-w-xs text-center font-hell text-sm leading-5 text-gray-600">
              Daily trends appear once your clip starts posting activity changes.
            </Text>
          </View>
        ) : (
          <View
            className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
            style={shadowStyles.card}
          >
            <ImageBackground
              source={require("../../assets/images/backgrounds/daytime-bg.png")}
              resizeMode="cover"
              className="w-full overflow-hidden rounded-t-3xl"
              style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}
            >
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: "rgba(255, 255, 255, 0.82)" },
                ]}
              />
              <View>
                <Text className="text-lg font-hell-round-bold text-gray-900">Events per day</Text>
                <Text className="mt-1.5 font-hell text-sm leading-5 text-gray-600">
                  {`How often your clip reported a change in movement or posture — last ${chartDayCount} days in this range`}
                </Text>
              </View>
            </ImageBackground>
            <View className="px-4 pb-6 pt-1">
              <LineChart values={imuEventValues} color={NornColors.brandOrange} labels={imuChartLabels} />
              {imuChartLabels.length > 0 ? (
                <View className="mt-5 flex-row justify-between border-t border-gray-100 pt-4">
                  {imuChartLabels.map((label) => (
                    <View key={label.key} className="flex-1 items-center">
                      <Text className="text-xs font-hell-round-bold text-gray-700">
                        {label.weekday.charAt(0)}
                      </Text>
                      <Text className="mt-0.5 text-[10px] font-hell text-gray-400">{label.day}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <View className="border-t border-gray-100 bg-gray-50/80 px-5 py-3.5">
              <Text className="text-center text-xs font-hell leading-4 text-gray-500">
                14-day view plots the last 14 days; 7-day shows the full week.
              </Text>
            </View>
          </View>
        )
      ) : !showStatsSignedIn ? (
        <View className="rounded-3xl border border-orange-100/80 bg-orange-50/35 px-5 py-8">
          <Text className="text-center font-hell text-base text-gray-600">
            Sign in to see today&apos;s activity.
          </Text>
        </View>
      ) : (
        <View
          className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
          style={shadowStyles.card}
        >
          <ImageBackground
            source={require("../../assets/images/backgrounds/daytime-bg.png")}
            resizeMode="cover"
            className="w-full overflow-hidden rounded-t-3xl"
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.22)", "rgba(0,0,0,0.48)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View className="px-5 pb-3.5 pt-[18px]">
              <Text className="text-lg font-hell-round-bold text-white" style={heroTextShadow}>
                Today
              </Text>
              <Text className="mt-1 font-hell text-xs leading-4 text-white/90" style={heroTextShadow}>
                Snapshot from your clip so far today
              </Text>
            </View>
          </ImageBackground>
          <View className="flex-row flex-wrap gap-3 px-4 pb-5 pt-1">
            <View className="min-w-[108px] flex-1 rounded-2xl border border-gray-200/70 bg-white px-3.5 py-4 shadow-sm">
              <View className="mx-auto mb-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-blue-100/90 bg-blue-50">
                <User size={22} color="#306DEE" strokeWidth={2.2} fill="#306DEE" />
              </View>
              <Text className="text-center text-[10px] font-hell-round-bold uppercase tracking-[0.06em] text-gray-400">
                Events
              </Text>
              <Text className="mt-1.5 text-center text-2xl font-hell-round-bold text-gray-900">
                {activityToday?.total_events ?? 0}
              </Text>
            </View>
            <View className="min-w-[108px] flex-1 rounded-2xl border border-gray-200/70 bg-white px-3.5 py-4 shadow-sm">
              <View className="mx-auto mb-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100/90 bg-emerald-50">
                <Activity size={22} color="#059669" strokeWidth={2.2} />
              </View>
              <Text className="text-center text-[10px] font-hell-round-bold uppercase tracking-[0.06em] text-gray-400">
                Top activity
              </Text>
              <Text
                className="mt-1.5 min-h-[40px] text-center text-sm font-hell-round-bold leading-5 text-gray-900"
                numberOfLines={2}
              >
                {topClassToday ? formatActivityDisplayName(topClassToday) : "—"}
              </Text>
            </View>
            <View className="min-w-[108px] flex-1 rounded-2xl border border-gray-200/70 bg-white px-3.5 py-4 shadow-sm">
              <View className="mx-auto mb-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-orange-100/90 bg-orange-50/90">
                <Zap size={22} color={NornColors.brandOrange} strokeWidth={2.2} />
              </View>
              <Text className="text-center text-[10px] font-hell-round-bold uppercase tracking-[0.06em] text-gray-400">
                Tracked time
              </Text>
              <Text className="mt-1.5 text-center text-lg font-hell-round-bold text-gray-900">
                {activityToday?.by_activity
                  ? formatMinutesFromSeconds(
                      Object.values(activityToday.by_activity).reduce(
                        (s, b) => s + (b.total_seconds ?? 0),
                        0,
                      ),
                    )
                  : "—"}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
