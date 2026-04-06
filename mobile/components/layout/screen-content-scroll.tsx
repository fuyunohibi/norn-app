import React from "react";
import {
  ScrollView,
  type ScrollViewProps,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/utils/cn";

export type ScreenContentScrollProps = {
  children: React.ReactNode;
  /** Extra classes on the `ScrollView` (merged with defaults). */
  className?: string;
  contentContainerStyle?: ViewStyle;
} & Omit<
  ScrollViewProps,
  "children" | "className" | "contentContainerStyle"
>;

const DEFAULT_SCROLL_CLASS =
  "mt-6 flex-1 rounded-t-[2.5rem] bg-white px-6 pt-6";

/**
 * White rounded sheet + scroll area used under the hero on stack screens (About, Sensor, Settings, …).
 */
export function ScreenContentScroll({
  children,
  className,
  contentContainerStyle,
  ...scrollProps
}: ScreenContentScrollProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-900">
      <ScrollView
        className={cn(DEFAULT_SCROLL_CLASS, className)}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + 28 },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </View>
  );
}
