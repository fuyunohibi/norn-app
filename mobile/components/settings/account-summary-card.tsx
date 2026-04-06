import { LogOut } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Card } from "../ui/card";
import { shadowStyles } from "@/theme";

type AccountSummaryCardProps = {
  email?: string | null;
  onSignOut: () => void;
};

export function AccountSummaryCard({ email, onSignOut }: AccountSummaryCardProps) {
  return (
    <Card
      variant="outlined"
      className="mt-4 border-gray-100 bg-white"
      style={shadowStyles.card}
    >
      <View className="flex-row gap-4">
        <View className="flex-1 justify-center items-start">
          <Text className="text-base font-hell-round-bold text-gray-900" numberOfLines={2}>
            {email || "Guest"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onSignOut}
          className="flex-row items-center justify-center self-start rounded-2xl border border-red-200 bg-white px-4 py-3 active:opacity-90"
          activeOpacity={0.88}
        >
          <LogOut size={18} color="#dc2626" strokeWidth={2.2} />
          <Text className="ml-2 font-hell-round-bold text-sm text-red-600">Sign out</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}
