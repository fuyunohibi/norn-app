import { router } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
import Header from "../../components/ui/header";
import { useAuth } from "../../contexts/auth-context";
import { useImuWearableStatus } from "../../hooks/useImuWearableStatus";
import { imuLiveActivityHeadlineOnline } from "../../utils/imu-activity";

export default function SensorScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const insets = useSafeAreaInsets();
  const {
    data: imuStatus,
    isLoading: imuStatusLoading,
    error: imuStatusError,
  } = useImuWearableStatus(userId);

  const wearableStatusTitle = useMemo(() => {
    if (!userId) return "Sign in required";
    if (imuStatusLoading) return "Checking status…";
    if (imuStatusError) return "Status unavailable";
    return imuStatus?.online ? "Clip online" : "Clip offline";
  }, [userId, imuStatusLoading, imuStatusError, imuStatus?.online]);

  const wearableStatusSubtitle = useMemo(() => {
    if (!userId) return "Sign in to see whether your clip is reporting.";
    if (imuStatusLoading) return "Loading the latest reading from your wearable.";
    if (imuStatusError) return "We could not reach the service. Check your connection.";
    return imuStatus?.online
      ? "Your clip has reported recently (within about the last 90 seconds)."
      : "No recent signal from your clip. It may be off, out of range, or idle.";
  }, [userId, imuStatusLoading, imuStatusError, imuStatus?.online]);

  const sensorStatusHint = useMemo(() => {
    if (!userId || !imuStatusError) return null;
    const msg =
      imuStatusError instanceof Error
        ? imuStatusError.message
        : String(imuStatusError);
    if (
      msg.includes("Network request failed") ||
      msg.includes("Failed to fetch") ||
      msg.includes("timed out")
    ) {
      return "Check Wi‑Fi and EXPO_PUBLIC_API_URL, or rely on cloud sync if configured.";
    }
    return msg;
  }, [userId, imuStatusError]);

  const wearableStatusDot = useMemo(() => {
    if (!userId) return "neutral" as const;
    if (imuStatusLoading) return "pending" as const;
    if (imuStatusError) return "error" as const;
    return imuStatus?.online ? ("ok" as const) : ("off" as const);
  }, [userId, imuStatusLoading, imuStatusError, imuStatus?.online]);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Header title="Clip & sensor" showBackButton onBackPress={() => router.back()} />

        <Card variant="outlined" className="mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm text-gray-500 font-hell mb-1">Wearable</Text>
              {userId && imuStatusLoading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#FF7300" />
                  <Text className="text-lg font-hell-round-bold text-gray-900">
                    Checking…
                  </Text>
                </View>
              ) : (
                <Text className="text-lg font-hell-round-bold text-gray-900">
                  {wearableStatusTitle}
                </Text>
              )}
              <Text
                className={`text-sm font-hell mt-1 ${
                  userId && imuStatusError ? "text-orange-600" : "text-gray-600"
                }`}
              >
                {wearableStatusSubtitle}
              </Text>
              {sensorStatusHint ? (
                <Text className="text-orange-500 text-xs font-hell mt-1">
                  {sensorStatusHint}
                </Text>
              ) : null}
              {userId && !imuStatusLoading && !imuStatusError && imuStatus?.online ? (
                <>
                  <Text className="text-gray-700 text-sm font-hell mt-3">
                    Current activity:{" "}
                    <Text className="font-hell-round-bold">
                      {imuLiveActivityHeadlineOnline(imuStatus)}
                    </Text>
                  </Text>
                  {imuStatus.last_seen_at ? (
                    <Text className="text-gray-500 text-xs font-hell mt-2">
                      Last signal: {new Date(imuStatus.last_seen_at).toLocaleString()}
                      {typeof imuStatus.age_seconds === "number"
                        ? ` (${imuStatus.age_seconds}s ago)`
                        : ""}
                    </Text>
                  ) : null}
                </>
              ) : null}
              {userId && !imuStatusLoading && !imuStatusError && !imuStatus?.online ? (
                <Text className="text-gray-600 text-sm font-hell mt-3">
                  The clip may be powered off, out of Wi‑Fi range, or has not reported in the
                  last ~90 seconds.
                </Text>
              ) : null}
            </View>
            <View
              className={`w-3 h-3 rounded-full shrink-0 ${
                wearableStatusDot === "ok"
                  ? "bg-green-500"
                  : wearableStatusDot === "off" || wearableStatusDot === "error"
                    ? "bg-red-500"
                    : wearableStatusDot === "pending"
                      ? "bg-amber-400"
                      : "bg-gray-300"
              }`}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
