import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { NornColors, shadowStyles } from "@/theme";

type TimelineEvent = {
  activity: string;
  created_at: string | null;
};

type ActivityVisual = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  accent: string;
};

type TodayTimelineListProps = {
  showSignedIn: boolean;
  loading: boolean;
  hasError: boolean;
  events: TimelineEvent[];
  getVisual: (activity: string) => ActivityVisual;
  formatActivityLabel: (activity: string) => string;
  formatTimeLabel: (iso: string | null | undefined) => string;
};

export function TodayTimelineList({
  showSignedIn,
  loading,
  hasError,
  events,
  getVisual,
  formatActivityLabel,
  formatTimeLabel,
}: TodayTimelineListProps) {
  if (!showSignedIn) {
    return (
      <View className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6">
        <Text className="text-center text-sm font-hell leading-5 text-gray-600">
          Sign in to see a live timeline from your wearable.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="items-center rounded-3xl border border-gray-100 bg-white py-10">
        <ActivityIndicator color={NornColors.brandOrange} />
      </View>
    );
  }

  if (hasError) {
    return (
      <View className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5">
        <Text className="text-center text-sm font-hell text-gray-600">
          Timeline unavailable right now. Try again from the Statistics screen.
        </Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View
        className="items-center rounded-3xl border border-gray-100 bg-white px-5 py-8"
        style={shadowStyles.myDaySheet}
      >
        <View className="h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <MaterialIcons name="timeline" size={28} color="#9CA3AF" />
        </View>
        <Text className="mt-3 text-center text-sm font-hell leading-5 text-gray-600">
          No activity events yet today. When your clip sends class changes, they will show up here.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2.5">
      {events.map((ev, index) => {
        const v = getVisual(ev.activity);
        const timeLabel = formatTimeLabel(ev.created_at);
        return (
          <View
            key={`${ev.created_at ?? ""}-${index}`}
            className="flex-row overflow-hidden rounded-3xl border border-gray-100 bg-white"
            style={shadowStyles.myDaySheet}
          >
            <View className="flex-1 flex-row items-center gap-3 py-3.5 pl-3 pr-4">
              <View
                className="h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${v.accent}` }}
              >
                <MaterialIcons name={v.icon} size={22} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-hell-round-bold text-gray-900">
                  {formatActivityLabel(ev.activity)}
                </Text>
                {timeLabel ? (
                  <Text className="mt-1 text-xs font-hell text-gray-500">{timeLabel}</Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
