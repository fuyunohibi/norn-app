import { Heart } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { Card } from "../ui/card";

export function AboutFooterCard() {
  return (
    <Card variant="outlined" className="mt-8 border-gray-100 bg-white">
      <View className="items-center px-2 py-4">
        <View className="flex-row flex-wrap items-center justify-center">
          <Text className="text-center font-hell text-sm text-gray-600">Made with</Text>
          <Heart
            size={14}
            color="#EF4444"
            fill="#EF4444"
            style={{ marginHorizontal: 6 }}
          />
          <Text className="text-center font-hell text-sm text-gray-600">
            for safer, clearer days at home.
          </Text>
        </View>
        <Text className="mt-3 text-center text-xs font-hell text-gray-500">
          © 2026 NORN. All rights reserved.
        </Text>
      </View>
    </Card>
  );
}
