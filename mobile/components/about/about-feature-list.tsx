import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { shadowStyles } from "@/theme";

export type AboutFeatureItem = {
  key: string;
  icon: LucideIcon;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  title: string;
  body: string;
};

type AboutFeatureListProps = {
  items: readonly AboutFeatureItem[];
};

export function AboutFeatureList({ items }: AboutFeatureListProps) {
  return (
    <View
      className="mt-4 overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
      style={shadowStyles.card}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <React.Fragment key={item.key}>
            {index > 0 ? <View className="mx-4 h-px bg-gray-100" /> : null}
            <View className="flex-row gap-3 px-4 py-4">
              <View
                className={`h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${item.iconBg} ${item.iconBorder}`}
              >
                <Icon size={22} color={item.iconColor} strokeWidth={2.2} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-hell-round-bold text-gray-900">{item.title}</Text>
                <Text className="mt-1.5 font-hell text-sm leading-5 text-gray-600">{item.body}</Text>
              </View>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}
