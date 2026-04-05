import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
import { useAuth } from "../../contexts/auth-context";
import { useImuWearableStatus } from "../../hooks/useImuWearableStatus";
import { imuLiveActivityHeadlineOnline } from "../../utils/imu-activity";
import { MOCK_HOME_IMU_STATUS } from "../../utils/mock-home-screen-data";

/**
 * Dev-only: when true, uses the same IMU mock as the home screen and skips the status API.
 */
const SENSOR_SCREEN_USE_MOCK_DATA = __DEV__ && true;

const HERO_MIN_HEIGHT = 200;

export default function SensorScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const insets = useSafeAreaInsets();
  const sensorMock = SENSOR_SCREEN_USE_MOCK_DATA;
  const dataUserId = sensorMock ? undefined : userId;
  const showSensorSignedIn = Boolean(userId || sensorMock);

  const {
    data: imuStatus,
    isLoading: imuStatusLoading,
    error: imuStatusError,
  } = useImuWearableStatus(dataUserId);

  const imuStatusEffective = sensorMock ? MOCK_HOME_IMU_STATUS : imuStatus;
  const imuStatusLoadingEffective = sensorMock ? false : imuStatusLoading;
  const imuStatusErrorEffective = sensorMock ? false : Boolean(imuStatusError);

  const wearableStatusTitle = useMemo(() => {
    if (!showSensorSignedIn) return "Sign in required";
    if (imuStatusLoadingEffective) return "Checking status…";
    if (imuStatusErrorEffective) return "Status unavailable";
    return imuStatusEffective?.online ? "Clip online" : "Clip offline";
  }, [
    showSensorSignedIn,
    imuStatusLoadingEffective,
    imuStatusErrorEffective,
    imuStatusEffective?.online,
  ]);

  const wearableStatusSubtitle = useMemo(() => {
    if (!showSensorSignedIn) return "Sign in to see whether your clip is reporting.";
    if (imuStatusLoadingEffective) return "Loading the latest reading from your wearable.";
    if (imuStatusErrorEffective) return "We could not reach the service. Check your connection.";
    return imuStatusEffective?.online
      ? "Your clip has reported recently (within about the last 90 seconds)."
      : "No recent signal from your clip. It may be off, out of range, or idle.";
  }, [
    showSensorSignedIn,
    imuStatusLoadingEffective,
    imuStatusErrorEffective,
    imuStatusEffective?.online,
  ]);

  const sensorStatusHint = useMemo(() => {
    if (!showSensorSignedIn || sensorMock || !imuStatusError) return null;
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
  }, [showSensorSignedIn, sensorMock, imuStatusError]);

  const heroTextShadow = {
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  } as const;

  return (
    <View className="flex-1 bg-gray-900">
      <ImageBackground
        source={require("../../assets/images/backgrounds/daytime-bg.png")}
        resizeMode="cover"
        className="w-full overflow-hidden rounded-b-[2.5rem]"
        style={{ minHeight: HERO_MIN_HEIGHT + insets.top }}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.12)", "rgba(0,0,0,0.38)"]}
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
            onPress={() => router.back()}
            activeOpacity={0.88}
            className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-white"
          >
            <ChevronLeft size={24} color="#666" strokeWidth={3} />
          </TouchableOpacity>

          <Text
            className="mt-5 text-3xl font-hell-round-bold text-white"
            style={heroTextShadow}
          >
            Clip & sensor
          </Text>
          <Text
            className="mt-2 max-w-[92%] text-base font-hell leading-6 text-white/95"
            style={heroTextShadow}
          >
            See whether your NORN clip is connected and what it last reported.
          </Text>
        </View>
      </ImageBackground>

      <View className="flex-1 bg-gray-900">
        <ScrollView
          className="mt-6 flex-1 rounded-t-[2.5rem] bg-white px-6 pt-6"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 28,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-gray-400">
            Connection
          </Text>
          <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">
            Wearable status
          </Text>
          <Text className="mt-1 text-sm font-hell leading-5 text-gray-500">
            Live updates when your clip checks in with NORN.
          </Text>

          <Card variant="outlined" className="mt-5 border-gray-100 bg-gray-50/80">
            <View className="min-w-0">
              {showSensorSignedIn && imuStatusLoadingEffective ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#FF7300" />
                  <Text className="text-lg font-hell-round-bold text-gray-900">Checking…</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-3">
                  {showSensorSignedIn && !imuStatusLoadingEffective ? (
                    imuStatusErrorEffective ? (
                      <View className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                    ) : (
                      <View
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          imuStatusEffective?.online ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                    )
                  ) : null}
                  <Text className="shrink text-xl font-hell-round-bold text-gray-900">
                    {wearableStatusTitle}
                  </Text>
                </View>
              )}
              <Text
                className={`mt-2 font-hell text-base leading-6 ${
                  showSensorSignedIn && imuStatusErrorEffective ? "text-orange-700" : "text-gray-600"
                }`}
              >
                {wearableStatusSubtitle}
              </Text>
              {sensorStatusHint ? (
                <View className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2.5">
                  <Text className="text-xs font-hell leading-5 text-orange-800">
                    {sensorStatusHint}
                  </Text>
                </View>
              ) : null}
              {showSensorSignedIn &&
              !imuStatusLoadingEffective &&
              !imuStatusErrorEffective &&
              imuStatusEffective?.online ? (
                <View className="mt-4 rounded-2xl border border-gray-200 bg-white px-3 py-3">
                  <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-gray-400">
                    Current activity
                  </Text>
                  <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">
                    {imuLiveActivityHeadlineOnline(imuStatusEffective)}
                  </Text>
                  {imuStatusEffective.last_seen_at ? (
                    <Text className="mt-2 text-xs font-hell leading-4 text-gray-500">
                      Last signal: {new Date(imuStatusEffective.last_seen_at).toLocaleString()}
                      {typeof imuStatusEffective.age_seconds === "number"
                        ? ` (${imuStatusEffective.age_seconds}s ago)`
                        : ""}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Card>
        </ScrollView>
      </View>
    </View>
  );
}
