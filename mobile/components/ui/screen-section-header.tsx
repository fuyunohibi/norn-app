import React from "react";
import { Text, View } from "react-native";
import { cn } from "@/utils/cn";
import { NornText } from "@/theme";

type ScreenSectionHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

/**
 * Standard “screen section” title + optional muted line (e.g. My day + date).
 */
export function ScreenSectionHeader({
  title,
  subtitle,
  className,
}: ScreenSectionHeaderProps) {
  return (
    <View className={cn(className)}>
      <Text className={NornText.screenTitle}>{title}</Text>
      {subtitle ? (
        <Text className={NornText.screenSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
