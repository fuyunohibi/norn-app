import React from "react";
import { Text, View } from "react-native";
import { cn } from "@/utils/cn";

export type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** `muted` = gray eyebrow (sensor); `brand` = orange eyebrow (settings). */
  tone?: "muted" | "brand";
  className?: string;
};

const eyebrowTone: Record<NonNullable<SectionHeadingProps["tone"]>, string> = {
  muted: "text-gray-400",
  brand: "text-orange-600",
};

/**
 * Repeated “eyebrow + title + description” block on white sheets.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "muted",
  className,
}: SectionHeadingProps) {
  return (
    <View className={cn(className)}>
      {eyebrow ? (
        <Text
          className={cn(
            "text-xs font-hell-round-bold uppercase tracking-wide",
            eyebrowTone[tone],
          )}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">{title}</Text>
      {description ? (
        <Text className="mt-1 text-sm font-hell leading-5 text-gray-500">{description}</Text>
      ) : null}
    </View>
  );
}
