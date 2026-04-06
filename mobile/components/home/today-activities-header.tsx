import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NornColors } from "@/theme";

type TodayActivitiesHeaderProps = {
  onSeeAll: () => void;
};

export function TodayActivitiesHeader({ onSeeAll }: TodayActivitiesHeaderProps) {
  return (
    <View className="mb-3 mt-9 flex-row items-center justify-between">
      <Text className="text-lg font-hell-round-bold text-gray-900">Today&apos;s activities</Text>
      <TouchableOpacity
        onPress={onSeeAll}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="flex-row items-center rounded-full"
      >
        <Text className="text-sm font-hell-round-bold" style={{ color: NornColors.brandOrange }}>
          See all
        </Text>
      </TouchableOpacity>
    </View>
  );
}
