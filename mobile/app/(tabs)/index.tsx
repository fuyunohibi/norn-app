import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmergencyQuickActionsModal } from "../../components/emergency-quick-actions-modal";
import { NornIcon } from "../../components/norn-icon";
import { NornStateMascot } from "../../components/norn-state-mascot";
import { Card } from "../../components/ui/card";
import { useAuth } from "../../contexts/auth-context";
import { useActivityStatistics } from "../../hooks/useActivityStatistics";
import { useEmergencyContacts } from "../../hooks/useEmergencyContacts";
import { useImuWearableStatus } from "../../hooks/useImuWearableStatus";
import { backendAPIService } from "../../services/backend-api.service";
import { formatActivityDisplayName } from "../../utils/imu-activity";
/**
 * Dev-only: set to a short code (e.g. `"r"`) to preview the mascot; `null` uses live IMU class.
 * Ignored in production builds.
 */
const DEV_MASCOT_ACTIVITY_OVERRIDE: string | null = __DEV__ ? "s" : null;

const styles = StyleSheet.create({
  bannerLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerLayerMascot: {
    backgroundColor: "#f5f5f5",
  },
});

const HomeScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const {
    data: imuStatus,
    isLoading: imuStatusLoading,
    error: imuStatusError,
  } = useImuWearableStatus(userId);
  const {
    data: todayStatsRes,
    isLoading: todayStatsLoading,
    isError: todayStatsError,
  } = useActivityStatistics(userId, "today");
  const activityToday = todayStatsRes?.statistics;
  const insets = useSafeAreaInsets();
  const lastFallAlertRef = useRef<string | null>(null);
  const [fallQuickActionMessage, setFallQuickActionMessage] = useState<string | null>(null);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  /** When true, banner shows `NornStateMascot` instead of the illustration. */
  const [bannerShowsMascot, setBannerShowsMascot] = useState(false);
  const bannerBlend = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bannerBlend, {
      toValue: bannerShowsMascot ? 1 : 0,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [bannerShowsMascot, bannerBlend]);

  const bannerSceneOpacity = useMemo(
    () =>
      bannerBlend.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    [bannerBlend],
  );
  const bannerSceneScale = useMemo(
    () =>
      bannerBlend.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.97],
      }),
    [bannerBlend],
  );
  const bannerMascotOpacity = useMemo(
    () =>
      bannerBlend.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [bannerBlend],
  );
  const bannerMascotScale = useMemo(
    () =>
      bannerBlend.interpolate({
        inputRange: [0, 1],
        outputRange: [0.97, 1],
      }),
    [bannerBlend],
  );

  const {
    contacts,
    isLoading: contactsLoading,
  } = useEmergencyContacts(userId);

  const primaryContact = useMemo(
    () => contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null,
    [contacts],
  );

  const presentFallQuickActions = useCallback((message?: string) => {
    setFallQuickActionMessage(
      message ??
        "A fall was detected. Let us know how to help or call an emergency contact.",
    );
    setShowQuickActionsModal(true);
  }, []);

  const dismissFallQuickActions = useCallback(() => {
    setShowQuickActionsModal(false);
  }, []);

  const handleFallSheetDismiss = useCallback(() => {
    setFallQuickActionMessage(null);
    setShowQuickActionsModal(false);
  }, []);

  const callPhoneNumber = useCallback(
    async (phoneNumber: string, label?: string) => {
      const sanitized = phoneNumber.replace(/[^+\d]/g, "");
      if (!sanitized) {
        Alert.alert("Invalid number", "This phone number cannot be dialed.");
        return;
      }

      const telUrl = `tel:${sanitized}`;
      try {
        const canOpen = await Linking.canOpenURL(telUrl);
        if (!canOpen) {
          Alert.alert(
            "Call not supported",
            "This device cannot initiate calls automatically.",
          );
          return;
        }

        dismissFallQuickActions();
        await Linking.openURL(telUrl);
      } catch (error) {
        console.error("Error placing call:", error);
        Alert.alert(
          "Call failed",
          `Unable to call ${label ?? "this contact"}. Please try again.`,
        );
      }
    },
    [dismissFallQuickActions],
  );

  const handleNeedHelp = useCallback(() => {
    if (!primaryContact) {
      Alert.alert(
        "No emergency contacts",
        "Add at least one emergency contact in Settings to place a quick call.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add Contact",
            onPress: () => router.push("/settings"),
          },
        ],
      );
      return;
    }

    callPhoneNumber(primaryContact.phone_number, primaryContact.full_name);
  }, [callPhoneNumber, primaryContact]);

  const handleImOk = useCallback(() => {
    dismissFallQuickActions();
    Alert.alert("Status updated", "Thanks for letting us know you are safe.");
  }, [dismissFallQuickActions]);

  const handleManageContacts = useCallback(() => {
    dismissFallQuickActions();
    router.push("/settings");
  }, [dismissFallQuickActions]);

  /** Short label for the banner status chip (detail copy lives on /sensor). */
  const wearableChipLabel = useMemo(() => {
    if (!userId) return "Sign in";
    if (imuStatusLoading) return "Updating…";
    if (imuStatusError) return "Unavailable";
    if (imuStatus?.online) return "Live";
    return "Offline";
  }, [userId, imuStatusLoading, imuStatusError, imuStatus?.online]);

  const wearableStatusDot = useMemo(() => {
    if (!userId) return "neutral" as const;
    if (imuStatusLoading) return "pending" as const;
    if (imuStatusError) return "error" as const;
    return imuStatus?.online ? ("ok" as const) : ("off" as const);
  }, [userId, imuStatusLoading, imuStatusError, imuStatus?.online]);

  const myDayDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const todayTrackedMinutes = useMemo(() => {
    const by = activityToday?.by_activity;
    if (!by) return 0;
    return Object.values(by).reduce((s, b) => s + (b.total_seconds ?? 0) / 60, 0);
  }, [activityToday?.by_activity]);

  const todayActivityBreakdown = useMemo(() => {
    const by = activityToday?.by_activity;
    if (!by) return [];
    return Object.entries(by)
      .filter(([, v]) => (v.count ?? 0) > 0 || (v.total_seconds ?? 0) > 0)
      .sort((a, b) => (b[1].total_seconds ?? 0) - (a[1].total_seconds ?? 0))
      .slice(0, 6);
  }, [activityToday?.by_activity]);

  const todayTimelineEvents = useMemo(() => {
    const list = activityToday?.events ?? [];
    return [...list]
      .filter((e) => e.activity && String(e.activity).toLowerCase() !== "ping")
      .slice(0, 24);
  }, [activityToday?.events]);

  // Monitor for fall detection alerts (failures surface to React Query for backoff — avoid 3s spam when backend is down)
  const { data: unreadAlerts = [] } = useQuery({
    queryKey: ["unread-alerts", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await backendAPIService.listAlerts(userId, {
        limit: 100,
        isRead: false,
      });
      return res.alerts ?? [];
    },
    enabled: !!userId,
    retry: 2,
    retryDelay: 4_000,
    refetchInterval: (query) => (query.state.error ? 45_000 : 3_000),
  });

  // Track shown alerts to prevent duplicate notifications
  const shownAlertIds = useRef<Set<string>>(new Set());

  // IMU / backend fall alerts: show whenever critical alerts arrive (device always monitors).
  useEffect(() => {
    if (!unreadAlerts || unreadAlerts.length === 0) return;

    // Find critical fall alerts that haven't been shown yet
    // Also verify they're recent (within last 2 minutes) and actually detected as falls
    const now = new Date().getTime();
    const twoMinutesAgo = now - 2 * 60 * 1000;

    const fallAlerts = unreadAlerts.filter((alert) => {
      const isImuSafety =
        (alert.alert_type === "fall" && alert.severity === "critical") ||
        (alert.alert_type === "fall_risk" &&
          (alert.severity === "high" || alert.severity === "critical"));
      if (!isImuSafety) return false;
      if (shownAlertIds.current.has(alert.id)) return false;

      // Check if alert is recent (within last 2 minutes)
      const alertTime = alert.created_at ? new Date(alert.created_at).getTime() : null;
      if (!alertTime || alertTime < twoMinutesAgo) return false;

      // Verify ML actually detected a fall (check alert_data for ml_detected or ml_pattern)
      const alertDataRaw = alert.alert_data;
      const alertData =
        typeof alertDataRaw === "object" && alertDataRaw !== null
          ? (alertDataRaw as Record<string, unknown>)
          : {};
      const mlAnalysisRaw = alertData["ml_analysis"];
      const mlAnalysis =
        typeof mlAnalysisRaw === "object" && mlAnalysisRaw !== null
          ? (mlAnalysisRaw as Record<string, unknown>)
          : null;
      const mlAnalysisPattern =
        mlAnalysis && typeof mlAnalysis["pattern"] === "string"
          ? (mlAnalysis["pattern"] as string)
          : null;
      const mlPatternSource = alertData["ml_pattern"];
      const mlPattern =
        typeof mlPatternSource === "string" ? mlPatternSource : mlAnalysisPattern;
      const mlDetectedValue = alertData["ml_detected"];
      const imuSource = alertData["source"] === "imu";
      const isRealFall =
        imuSource ||
        mlPattern === "real_fall_likely" ||
        (typeof mlDetectedValue === "boolean" && mlDetectedValue);

      return isRealFall;
    });

    if (fallAlerts.length > 0) {
      const latestFall = fallAlerts[0]; // Most recent fall alert
      shownAlertIds.current.add(latestFall.id);

      const latestFallDataRaw = latestFall.alert_data;
      const latestFallData =
        typeof latestFallDataRaw === "object" && latestFallDataRaw !== null
          ? (latestFallDataRaw as Record<string, unknown>)
          : {};
      const confidenceSource =
        latestFallData["ml_confidence"] ?? latestFallData["confidence"];
      const confidenceValue =
        typeof confidenceSource === "number"
          ? confidenceSource
          : typeof confidenceSource === "string" && !Number.isNaN(Number(confidenceSource))
            ? Number(confidenceSource)
            : null;
      const confidence = confidenceValue
        ? `${Math.round(confidenceValue * 100)}%`
        : "High";

      const isNearFall = latestFall.alert_type === "fall_risk";
      presentFallQuickActions(
        isNearFall
          ? `Unstable standing was reported (${confidence} confidence if available). Check in if needed.`
          : `We detected a fall with ${confidence} confidence. Check in and choose a quick action.`,
      );
    }
  }, [unreadAlerts, presentFallQuickActions]);

  // Live IMU critical classes (f / af / nf) from latest activity_events row
  useEffect(() => {
    const code = imuStatus?.activity_code?.toLowerCase();
    if (!code || !["f", "af", "nf"].includes(code)) return;

    const fallIdentifier = `${code}-${imuStatus?.last_seen_at ?? ""}`;
    if (lastFallAlertRef.current === fallIdentifier) return;

    lastFallAlertRef.current = fallIdentifier;

    const msg =
      code === "f"
        ? "The wearable reported a fall. Let us know if you need assistance."
        : code === "af"
          ? "The wearable reports you may still be down after a fall."
          : "The wearable reports unstable standing — you may be at risk of falling.";

    presentFallQuickActions(msg);
  }, [imuStatus?.activity_code, imuStatus?.last_seen_at, presentFallQuickActions]);

  const mascotProps = {
    signedIn: Boolean(userId),
    activityCode: DEV_MASCOT_ACTIVITY_OVERRIDE ?? imuStatus?.activity_code ?? null,
    loading: Boolean(userId) && imuStatusLoading,
    statusError: Boolean(userId) && Boolean(imuStatusError),
  };

  const chipShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 6,
  } as const;

  const fabShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 8,
  } as const;

  return (
    <View className="flex-1 bg-gray-900">

      {/* Banner: crossfade + light scale between scene and mascot (native driver). */}
      <View className="relative h-[25rem] w-full overflow-hidden rounded-b-[2.5rem]">
        <Animated.View
          pointerEvents={bannerShowsMascot ? "none" : "auto"}
          style={[
            styles.bannerLayer,
            {
              opacity: bannerSceneOpacity,
              transform: [{ scale: bannerSceneScale }],
            },
          ]}
        >
          <ImageBackground
            source={require("../../assets/images/backgrounds/daytime-bg.png")}
            resizeMode="cover"
            className="h-full w-full justify-center items-center"
            style={{
              paddingTop: insets.top,
            }}
          >
            <View className="mb-4 mt-2 flex-row items-center justify-center">
              <NornIcon size={48} />
              <Text className="ml-[0.5rem] text-lg font-hell-round-bold text-white">
                NORN
              </Text>
            </View>
          </ImageBackground>
        </Animated.View>
        <Animated.View
          pointerEvents={bannerShowsMascot ? "auto" : "none"}
          style={[
            styles.bannerLayer,
            styles.bannerLayerMascot,
            {
              opacity: bannerMascotOpacity,
              transform: [{ scale: bannerMascotScale }],
            },
          ]}
        >
          <NornStateMascot {...mascotProps} />
        </Animated.View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Wearable status: ${wearableChipLabel}. Opens sensor details.`}
          onPress={() => router.push("/sensor")}
          activeOpacity={0.88}
          className="absolute z-20 flex-row items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-2"
          style={{
            right: 14,
            top: insets.top + 8,
            ...chipShadow,
          }}
        >
          {userId && imuStatusLoading ? (
            <ActivityIndicator size="small" color="#FF7300" />
          ) : (
            <View
              className={`h-2 w-2 rounded-full ${
                wearableStatusDot === "ok"
                  ? "bg-green-500"
                  : wearableStatusDot === "off" || wearableStatusDot === "error"
                    ? "bg-red-500"
                    : wearableStatusDot === "pending"
                      ? "bg-amber-400"
                      : "bg-gray-400"
              }`}
            />
          )}
          <Text className="text-xs font-hell-round-bold text-gray-900">
            {wearableChipLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            bannerShowsMascot
              ? "Show scene banner with NORN logo"
              : "Show activity mascot in the banner"
          }
          onPress={() => setBannerShowsMascot((v) => !v)}
          activeOpacity={0.88}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="absolute z-30 h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white"
          style={{
            right: 14,
            bottom: 16,
            ...fabShadow,
          }}
        >
          <MaterialIcons
            name={bannerShowsMascot ? "landscape" : "pets"}
            size={22}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      <View className="flex-1 bg-gray-900">
        <ScrollView
          className="flex-1 rounded-t-[2.5rem] bg-white p-6 mt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 28,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-2xl font-hell-round-bold text-gray-900">My day</Text>
          <Text className="mt-1 text-sm font-hell text-gray-500">{myDayDateLabel}</Text>

          <Card variant="outlined" className="mt-4">
            <View className="p-4">
              {!userId ? (
                <Text className="text-center font-hell text-gray-600">
                  Sign in to see a summary of your clip activity for today.
                </Text>
              ) : todayStatsLoading ? (
                <View className="items-center py-4">
                  <ActivityIndicator color="#FF7300" />
                </View>
              ) : todayStatsError ? (
                <Text className="text-center font-hell text-orange-600">
                  Could not load today&apos;s summary. Open Statistics when your connection is
                  back.
                </Text>
              ) : (
                <>
                  <View className="flex-row flex-wrap gap-4">
                    <View className="min-w-[100px] flex-1">
                      <Text className="text-2xl font-hell-round-bold text-gray-900">
                        {activityToday?.total_events ?? 0}
                      </Text>
                      <Text className="text-xs font-hell text-gray-600">
                        State changes today
                      </Text>
                    </View>
                    <View className="min-w-[100px] flex-1">
                      <Text className="text-2xl font-hell-round-bold text-gray-900">
                        {Math.round(todayTrackedMinutes)}
                      </Text>
                      <Text className="text-xs font-hell text-gray-600">
                        Est. tracked minutes
                      </Text>
                    </View>
                  </View>
                  {todayActivityBreakdown.length > 0 ? (
                    <View className="mt-4 flex-row flex-wrap gap-2">
                      {todayActivityBreakdown.map(([key, bucket]) => (
                        <View
                          key={key}
                          className="rounded-full bg-gray-100 px-3 py-1.5"
                        >
                          <Text className="text-xs font-hell-round-bold text-gray-800">
                            {formatActivityDisplayName(key)}{" "}
                            <Text className="font-hell text-gray-600">
                              · {bucket.count ?? 0}
                            </Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="mt-3 text-sm font-hell text-gray-500">
                      No class breakdown yet — your clip will add walking, sitting, and other
                      states as it reports.
                    </Text>
                  )}
                </>
              )}
            </View>
          </Card>

          <View className="mb-3 mt-8 flex-row items-center justify-between">
            <Text className="text-lg font-hell-round-bold text-gray-900">
              Today&apos;s activities
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/statistics")}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-sm font-hell-round-bold text-[#FF7300]">See all</Text>
            </TouchableOpacity>
          </View>

          {!userId ? (
            <Text className="font-hell text-gray-600">
              Sign in to see a live timeline from your wearable.
            </Text>
          ) : todayStatsLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#FF7300" />
            </View>
          ) : todayStatsError ? (
            <Text className="font-hell text-gray-600">
              Timeline unavailable right now. Try again from the Statistics screen.
            </Text>
          ) : todayTimelineEvents.length === 0 ? (
            <Card variant="outlined">
              <View className="p-4">
                <Text className="text-center font-hell text-gray-600">
                  No activity events yet today. When your clip sends class changes, they will
                  show up here.
                </Text>
              </View>
            </Card>
          ) : (
            <View className="gap-0">
              {todayTimelineEvents.map((ev, index) => (
                <View
                  key={`${ev.created_at ?? ""}-${index}`}
                  className="flex-row items-center border-b border-gray-100 py-3"
                >
                  <View className="mr-3 h-2 w-2 rounded-full bg-[#FF7300]" />
                  <View className="flex-1">
                    <Text className="font-hell-round-bold text-gray-900">
                      {formatActivityDisplayName(ev.activity)}
                    </Text>
                    {ev.created_at ? (
                      <Text className="mt-0.5 text-xs font-hell text-gray-500">
                        {new Date(ev.created_at).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <EmergencyQuickActionsModal
        visible={showQuickActionsModal}
        message={fallQuickActionMessage}
        contacts={contacts}
        contactsLoading={contactsLoading}
        primaryContact={primaryContact}
        onDismiss={handleFallSheetDismiss}
        onImOk={handleImOk}
        onCallPrimary={handleNeedHelp}
        onManageContacts={handleManageContacts}
        onCallContact={callPhoneNumber}
      />
    </View>

  );
};

export default HomeScreen;
