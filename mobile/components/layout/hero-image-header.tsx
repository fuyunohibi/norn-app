import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { daytimeBackground } from "@/constants/images";
import { HERO_MIN_HEIGHT, heroTextShadow } from "@/theme";

const GRADIENT_COLORS = ["rgba(0,0,0,0.12)", "rgba(0,0,0,0.38)"] as const;

export type HeroImageHeaderProps = {
  title: string;
  subtitle: string;
  /** Min height before safe-area inset is added. Defaults to `HERO_MIN_HEIGHT`. */
  minHeightBase?: number;
  onBackPress?: () => void;
  backChevronStrokeWidth?: number;
};

export function HeroImageHeader({
  title,
  subtitle,
  minHeightBase = HERO_MIN_HEIGHT,
  onBackPress = () => router.back(),
  backChevronStrokeWidth = 2.5,
}: HeroImageHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={daytimeBackground}
      resizeMode="cover"
      className="w-full overflow-hidden rounded-b-[2.5rem]"
      style={{ minHeight: minHeightBase + insets.top }}
    >
      <LinearGradient
        colors={[...GRADIENT_COLORS]}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />
      <View
        className="flex-1 justify-end px-6 pb-6"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBackPress}
          activeOpacity={0.88}
          className="h-12 w-12 items-center justify-center rounded-xl bg-white"
        >
          <ChevronLeft size={24} color="#666" strokeWidth={backChevronStrokeWidth} />
        </TouchableOpacity>

        <Text
          className="mt-5 text-3xl font-hell-round-bold text-white"
          style={heroTextShadow}
        >
          {title}
        </Text>
        <Text
          className="mt-2 max-w-[92%] text-base font-hell leading-6 text-white/95"
          style={heroTextShadow}
        >
          {subtitle}
        </Text>
      </View>
    </ImageBackground>
  );
}
