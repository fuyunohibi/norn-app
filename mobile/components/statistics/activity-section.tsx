import { LinearGradient } from "expo-linear-gradient";
import { Activity, BarChart3, User, Zap } from "lucide-react-native";
import React from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart, type ChartLabel } from "./line-chart";
import type { ActivityStatistics } from "@/services/backend-api.service";
import { NornColors, heroTextShadow, shadowStyles } from "@/theme";
import { formatActivityDisplayName } from "@/utils/imu-activity";
import { formatMinutesFromSeconds } from "@/utils/statistics.utils";

type ActivityMode = "trends" | "today";
type TimeRange = "7d" | "30d";

type ActivitySectionProps = {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  timeRangeOptions: Array<{ id: TimeRange; label: string }>;
  hasActivityData: boolean;
  chartDayCount: number;
  imuEventValues: number[];
  imuChartLabels: ChartLabel[];
};

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
  timeRange,
  setTimeRange,
  timeRangeOptions,
  hasActivityData,
  chartDayCount,
  imuEventValues,
  imuChartLabels,
}: ActivitySectionProps) {
  return (
    <View className="gap-5">
      <View className="flex-row justify-between">

      
      <View className="mb-1">
        <Text className="text-xs font-hell-round-bold uppercase tracking-[0.08em] text-gray-400">
          Activity
        </Text>
        <Text className="mt-1 text-xl font-hell-round-bold text-gray-900">Trends & today</Text>
      </View>

      <View className="flex-row flex-wrap items-center justify-end gap-3">
        <View className="flex-row rounded-full bg-gray-100 p-1">
          {timeRangeOptions.map((option) => {
            const isActive = timeRange === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setTimeRange(option.id)}
                style={[touchStyles.trendsPill, isActive && touchStyles.rangePillActive]}
              >
                <Text
                  className={`text-xs font-hell-round-bold ${isActive ? "text-white" : "text-gray-500"}`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      </View>

      {!hasActivityData ? (
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
        )}
    </View>
  );
}
