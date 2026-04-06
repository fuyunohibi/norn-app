import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Card } from "../ui/card";
import { NornColors } from "@/theme";

export type SensorConnectionCardProps = {
  signedIn: boolean;
  loading: boolean;
  error: boolean;
  online?: boolean;
  title: string;
  subtitle: string;
  hint: string | null;
  activityHeadline: string | null;
  lastSignalLine: string | null;
};

/**
 * Connection / IMU status block on the Sensor screen.
 */
export function SensorConnectionCard({
  signedIn,
  loading,
  error,
  online,
  title,
  subtitle,
  hint,
  activityHeadline,
  lastSignalLine,
}: SensorConnectionCardProps) {
  return (
    <Card variant="outlined" className="mt-5 border-gray-100 bg-gray-50/80">
      <View className="min-w-0">
        {signedIn && loading ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color={NornColors.brandOrange} />
            <Text className="text-lg font-hell-round-bold text-gray-900">Checking…</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            {signedIn && !loading ? (
              error ? (
                <View className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
              ) : (
                <View
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    online ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
              )
            ) : null}
            <Text className="shrink text-xl font-hell-round-bold text-gray-900">{title}</Text>
          </View>
        )}
        <Text
          className={`mt-2 font-hell text-base leading-6 ${
            signedIn && error ? "text-orange-700" : "text-gray-600"
          }`}
        >
          {subtitle}
        </Text>
        {hint ? (
          <View className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2.5">
            <Text className="text-xs font-hell leading-5 text-orange-800">{hint}</Text>
          </View>
        ) : null}
        {signedIn && !loading && !error && online && activityHeadline ? (
          <View className="mt-4 rounded-2xl border border-gray-200 bg-white px-3 py-3">
            <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-gray-400">
              Current activity
            </Text>
            <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">{activityHeadline}</Text>
            {lastSignalLine ? (
              <Text className="mt-2 text-xs font-hell leading-4 text-gray-500">{lastSignalLine}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}
