import React from "react";
import { StyleSheet, Text, TouchableOpacity as RNTouchableOpacity, View } from "react-native";
import { NornColors, shadowPresets } from "@/theme";

export type TabId = "activity" | "mode" | "overview";

type SectionTabsProps = {
  tabs: ReadonlyArray<{ id: TabId; label: string }>;
  activeSection: TabId;
  onChange: (id: TabId) => void;
};

function RawTouchableOpacity(
  props: React.ComponentProps<typeof RNTouchableOpacity>,
): React.ReactElement {
  return React.createElement(RNTouchableOpacity, props);
}

const styles = StyleSheet.create({
  sectionTab: {
    flex: 1,
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sectionTabActive: {
    backgroundColor: NornColors.brandOrange,
    borderColor: "rgba(255, 255, 255, 0.2)",
    ...shadowPresets.pill,
  },
});

export function SectionTabs({ tabs, activeSection, onChange }: SectionTabsProps) {
  return (
    <View
      className="mt-4 overflow-hidden rounded-3xl border border-gray-200/90 bg-gray-100 p-1"
      style={shadowPresets.card}
    >
      <View className="flex-row">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <RawTouchableOpacity
              key={tab.id}
              activeOpacity={0.88}
              onPress={() => onChange(tab.id)}
              style={[styles.sectionTab, isActive && styles.sectionTabActive]}
            >
              <Text className={`text-sm font-hell-round-bold ${isActive ? "text-white" : "text-gray-500"}`}>
                {tab.label}
              </Text>
            </RawTouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
