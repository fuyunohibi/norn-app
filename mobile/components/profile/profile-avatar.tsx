import React from "react";
import { Text, View } from "react-native";
import { NornColors } from "@/theme";

type ProfileAvatarProps = {
  fullName?: string | null;
  size: number;
};

export function ProfileAvatar({ fullName, size }: ProfileAvatarProps) {
  const radius = size / 2;
  const initial = fullName?.trim() ? fullName.charAt(0).toUpperCase() : "U";

  return (
    <View
      className="items-center justify-center"
      style={{
        backgroundColor: NornColors.brandOrange,
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 4,
        borderColor: "#ffffff",
      }}
    >
      <Text className="text-4xl font-hell-round-bold text-white">{initial}</Text>
    </View>
  );
}
