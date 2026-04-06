import React from "react";
import { Text, View } from "react-native";
import { NornIcon } from "../norn-icon";
import { Card } from "../ui/card";
import { NornColors, shadowStyles } from "@/theme";

type AboutIntroCardProps = {
  version: string;
};

export function AboutIntroCard({ version }: AboutIntroCardProps) {
  return (
    <Card
      variant="outlined"
      className="border-gray-100 bg-gray-50/90"
      style={shadowStyles.card}
    >
      <View className="items-center px-2 py-6">
        <View
          className="mb-4 h-[5.5rem] w-[5.5rem] items-center justify-center rounded-3xl shadow-sm"
          style={{ backgroundColor: NornColors.brandOrange }}
        >
          <NornIcon size={56} />
        </View>
        <Text className="text-center text-2xl font-hell-round-bold text-gray-900">NORN</Text>
        <Text className="mt-2 text-center font-hell text-sm leading-5 text-gray-600">
          Home activity and fall safety with your wearable clip. Calm UI when you need it most.
        </Text>
        <View
          className="mt-5 rounded-full border border-gray-200/90 bg-white px-5 py-2.5"
          style={shadowStyles.pill}
        >
          <Text className="text-center text-sm font-hell-round-bold text-gray-800">
            Version {version}
          </Text>
        </View>
      </View>
    </Card>
  );
}
