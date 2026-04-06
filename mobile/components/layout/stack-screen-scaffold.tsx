import React from "react";
import { View } from "react-native";
import { HeroImageHeader, type HeroImageHeaderProps } from "./hero-image-header";
import { ScreenContentScroll, type ScreenContentScrollProps } from "./screen-content-scroll";

export type StackScreenScaffoldProps = {
  /** Passed to `HeroImageHeader`. */
  hero: Pick<
    HeroImageHeaderProps,
    "title" | "subtitle" | "minHeightBase" | "onBackPress" | "backChevronStrokeWidth"
  >;
  children: React.ReactNode;
  /** Extra props for the inner `ScrollView` (e.g. `refreshControl`). */
  scrollProps?: Omit<ScreenContentScrollProps, "children">;
};

/**
 * Full-screen stack layout: daytime hero band + white scroll sheet.
 */
export function StackScreenScaffold({ hero, children, scrollProps }: StackScreenScaffoldProps) {
  return (
    <View className="flex-1 bg-gray-900">
      <HeroImageHeader {...hero} />
      <ScreenContentScroll {...scrollProps}>{children}</ScreenContentScroll>
    </View>
  );
}
