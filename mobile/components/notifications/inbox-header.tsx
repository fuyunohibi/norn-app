import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type InboxHeaderProps = {
  unreadCount: number;
  markAllPending: boolean;
  onMarkAllRead: () => void;
};

export function InboxHeader({
  unreadCount,
  markAllPending,
  onMarkAllRead,
}: InboxHeaderProps) {
  return (
    <View className="mb-2 mt-10 flex-row items-center justify-between">
      <View>
        <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-gray-400">
          Inbox
        </Text>
        <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">Recent alerts</Text>
      </View>
      {unreadCount > 0 ? (
        <TouchableOpacity
          onPress={onMarkAllRead}
          disabled={markAllPending}
          activeOpacity={0.88}
          className="rounded-full bg-gray-900 px-3 py-2"
        >
          <Text className="text-xs font-hell-round-bold text-white">
            Mark all read ({unreadCount})
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
