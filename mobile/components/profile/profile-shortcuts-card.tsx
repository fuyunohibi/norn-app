import { Bell, ChevronRight, Info } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NornColors, profileGroupCardStyle } from "@/theme";

type ProfileShortcutsCardProps = {
  onNotifications: () => void;
  onAbout: () => void;
};

export function ProfileShortcutsCard({
  onNotifications,
  onAbout,
}: ProfileShortcutsCardProps) {
  return (
    <View
      className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
      style={profileGroupCardStyle()}
    >
      <TouchableOpacity
        className="flex-row items-center px-4 py-4 active:bg-gray-50"
        onPress={onNotifications}
        activeOpacity={0.92}
      >
        <View
          className="mr-3.5 h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/90"
          style={{ borderCurve: "continuous" }}
        >
          <Bell size={22} color={NornColors.brandOrange} strokeWidth={2.2} />
        </View>
        <View className="min-w-0 flex-1 pr-2">
          <Text className="text-base font-hell-round-bold text-gray-900">Notifications</Text>
          <Text className="mt-0.5 font-hell text-sm leading-5 text-gray-500">
            Manage alert preferences
          </Text>
        </View>
        <View className="h-9 w-9 items-center justify-center">
          <ChevronRight size={24} color="#9CA3AF" strokeWidth={2.5} />
        </View>
      </TouchableOpacity>

      <View className="mx-4 h-px bg-gray-100" />

      <TouchableOpacity
        className="flex-row items-center px-4 py-4 active:bg-gray-50"
        onPress={onAbout}
        activeOpacity={0.92}
      >
        <View
          className="mr-3.5 h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl border border-gray-200/80 bg-gray-50"
          style={{ borderCurve: "continuous" }}
        >
          <Info size={22} color="#52525B" strokeWidth={2.2} />
        </View>
        <View className="min-w-0 flex-1 pr-2">
          <Text className="text-base font-hell-round-bold text-gray-900">About NORN</Text>
          <Text className="mt-0.5 font-hell text-sm leading-5 text-gray-500">
            App version and information
          </Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-full">
          <ChevronRight size={24} color="#9CA3AF" strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
