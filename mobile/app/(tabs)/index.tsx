import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useAuth } from "../../contexts/auth-context";
import { useActivityStatistics } from "../../hooks/useActivityStatistics";
import { useCareBackupContacts } from "../../hooks/useCareBackupContacts";
import { useCareRecipientProfile } from "../../hooks/useCareRecipientProfile";
import { useImuWearableStatus } from "../../hooks/useImuWearableStatus";
import { backendAPIService } from "../../services/backend-api.service";
import { formatActivityDisplayName } from "../../utils/imu-activity";

const BRAND_ORANGE = "#FF7300";

const styles = StyleSheet.create({
  bannerLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerLayerMascot: {
    backgroundColor: "#f5f5f5",
  },
  myDaySheet: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
  },
  timelineStripe: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 4,
  },
});

/** Map raw activity / short codes → icon + accent for home timeline & chips. */
function homeActivityVisual(raw: string): {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  accent: string;
  chipBg: string;
} {
  const k = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const kind =
    (
      {
        w: "walking",
        st: "standing",
        si: "sitting",
        r: "running",
        f: "falling",
        af: "after_fall",
        nf: "unstable_standing",
      } as Record<string, string>
    )[k] ?? k;

  const table: Record<
    string,
    { icon: React.ComponentProps<typeof MaterialIcons>["name"]; accent: string; chipBg: string }
  > = {
    walking: { icon: "directions-walk", accent: "#2563EB", chipBg: "bg-blue-50" },
    standing: { icon: "accessibility-new", accent: "#0D9488", chipBg: "bg-teal-50" },
    sitting: { icon: "weekend", accent: "#7C3AED", chipBg: "bg-violet-50" },
    running: { icon: "directions-run", accent: "#DC2626", chipBg: "bg-red-50" },
    falling: { icon: "personal-injury", accent: "#B45309", chipBg: "bg-amber-50" },
    after_fall: { icon: "medical-services", accent: "#C2410C", chipBg: "bg-orange-50" },
    unstable_standing: { icon: "balance", accent: "#CA8A04", chipBg: "bg-yellow-50" },
  };

  return (
    table[kind] ?? {
      icon: "motion-photos-on",
      accent: BRAND_ORANGE,
      chipBg: "bg-orange-50",
    }
  );
}

function formatTimelineTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const HomeScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const showAsSignedIn = Boolean(userId);

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
  const imuStatusErrorBool = Boolean(imuStatusError);
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

  const { contacts, isLoading: contactsLoading } = useCareBackupContacts(userId);

  const { profile: careRecipientProfile } = useCareRecipientProfile(userId);

  const monitoredPersonName = careRecipientProfile?.full_name?.trim() || null;
  const monitoredPersonPhone = careRecipientProfile?.phone_number?.trim() || null;
  const monitoredCallLabel = monitoredPersonName ?? "the person you monitor";

  const primaryBackupContact = useMemo(
    () => contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null,
    [contacts],
  );

  const primaryCallLabel = useMemo(() => {
    if (monitoredPersonPhone) {
      return `Call ${monitoredCallLabel}`;
    }
    if (primaryBackupContact) {
      return `Call ${primaryBackupContact.full_name}`;
    }
    return "Add a number in Settings";
  }, [monitoredCallLabel, monitoredPersonPhone, primaryBackupContact]);

  const primaryCallDisabled = useMemo(() => {
    if (monitoredPersonPhone) return false;
    if (contactsLoading) return true;
    if (primaryBackupContact) return false;
    return true;
  }, [contactsLoading, monitoredPersonPhone, primaryBackupContact]);

  const presentFallQuickActions = useCallback((message?: string) => {
    setFallQuickActionMessage(
      message ??
        "A fall or safety event was reported for the person wearing the sensor. Check on them or use the actions below.",
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

  const handlePrimaryQuickCall = useCallback(() => {
    if (monitoredPersonPhone) {
      callPhoneNumber(monitoredPersonPhone, monitoredCallLabel);
      return;
    }
    if (!primaryBackupContact) {
      Alert.alert(
        "No number to call",
        "Add the monitored person's phone number or a backup contact in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => router.push("/settings"),
          },
        ],
      );
      return;
    }

    callPhoneNumber(primaryBackupContact.phone_number, primaryBackupContact.full_name);
  }, [
    callPhoneNumber,
    monitoredCallLabel,
    monitoredPersonPhone,
    primaryBackupContact,
  ]);

  const handleAcknowledgeFallAlert = useCallback(() => {
    dismissFallQuickActions();
  }, [dismissFallQuickActions]);

  const handleManageContacts = useCallback(() => {
    dismissFallQuickActions();
    router.push("/settings");
  }, [dismissFallQuickActions]);

  /** Short label for the banner status chip (detail copy lives on /sensor). */
  const wearableChipLabel = useMemo(() => {
    if (!showAsSignedIn) return "Sign in";
    if (imuStatusLoading) return "Updating…";
    if (imuStatusErrorBool) return "Unavailable";
    if (imuStatus?.online) return "Live";
    return "Offline";
  }, [
    showAsSignedIn,
    imuStatusLoading,
    imuStatusErrorBool,
    imuStatus?.online,
  ]);

  const wearableStatusDot = useMemo(() => {
    if (!showAsSignedIn) return "neutral" as const;
    if (imuStatusLoading) return "pending" as const;
    if (imuStatusErrorBool) return "error" as const;
    return imuStatus?.online ? ("ok" as const) : ("off" as const);
  }, [
    showAsSignedIn,
    imuStatusLoading,
    imuStatusErrorBool,
    imuStatus?.online,
  ]);

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

  /** Up to four activity keys for the home 2×2 grid: real data first, then common defaults. */
  const myDayGridKeys = useMemo(() => {
    const fromData = todayActivityBreakdown.map(([k]) => k);
    const preferred = ["walking", "sitting", "standing", "running"];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const k of fromData) {
      if (out.length >= 4) break;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    for (const k of preferred) {
      if (out.length >= 4) break;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    return out;
  }, [todayActivityBreakdown]);

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
          ? `Unstable standing was reported for the person you monitor (${confidence} confidence if available). Consider checking on them.`
          : `A fall was detected (${confidence} confidence) for the person wearing the sensor. Check on them or call using the actions below.`,
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
        ? "The wearable reported a fall for the person you monitor. Check on them or call below."
        : code === "af"
          ? "The wearable suggests they may still be down after a fall. Please check on them."
          : "The wearable reports unstable standing — they may be at higher risk of falling.";

    presentFallQuickActions(msg);
  }, [imuStatus?.activity_code, imuStatus?.last_seen_at, presentFallQuickActions]);

  const mascotProps = {
    signedIn: showAsSignedIn,
    activityCode: imuStatus?.activity_code ?? null,
    loading: showAsSignedIn && imuStatusLoading,
    statusError: showAsSignedIn && imuStatusErrorBool,
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
          {showAsSignedIn && imuStatusLoading ? (
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
          <View>
            <Text className="text-2xl font-hell-round-bold text-gray-900">My day</Text>
            <Text className="mt-0.5 text-sm font-hell text-gray-500">{myDayDateLabel}</Text>
          </View>

          <View className="mt-4 rounded-[28px] bg-[#FAF8F4] px-4 pb-5 pt-4">
            {!showAsSignedIn ? (
              <View className="items-center rounded-[24px] bg-[#F3EEE6] px-5 py-8">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
                  <MaterialIcons name="lock-outline" size={28} color="#A8A29E" />
                </View>
                <Text className="mt-3 text-center text-sm font-hell leading-5 text-stone-600">
                  Sign in to see a summary of your clip activity for today.
                </Text>
              </View>
            ) : todayStatsLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color={BRAND_ORANGE} />
              </View>
            ) : todayStatsError ? (
              <View className="items-center rounded-[24px] px-5 py-6">
                  <MaterialIcons name="cloud-off" size={26} color="#C2410C" />
                <Text className="mt-3 text-center text-sm font-hell leading-5 text-orange-900">
                  Could not load today&apos;s summary. Open Statistics when your connection is back.
                </Text>
              </View>
            ) : (
              <>
                <Text className="mb-3 text-base font-hell-round-bold text-stone-800">
                  Today at a glance
                </Text>
                <LinearGradient
                  colors={["#E85D04", "#FF7300", "#FF9F4A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    position: "relative",
                    borderRadius: 24,
                    paddingHorizontal: 20,
                    paddingVertical: 22,
                    marginBottom: 4,
                    overflow: "hidden",
                  }}
                >
                  <Text className="pr-16 text-xl font-hell-round-bold text-white">
                    Your movement matters
                  </Text>
                  <Text className="mt-2 pr-14 text-sm font-hell leading-5 text-white/90">
                    {(activityToday?.total_events ?? 0) > 0
                      ? `You logged ${activityToday?.total_events ?? 0} state change${(activityToday?.total_events ?? 0) === 1 ? "" : "s"} and about ${Math.round(todayTrackedMinutes)} minutes of wear time today. Open Statistics for more detail.`
                      : "When your clip reports walking, sitting, and other states, a fuller picture of your day will appear here."}
                  </Text>
                  <View
                    style={{ position: "absolute", right: 12, bottom: 10, opacity: 0.38 }}
                    pointerEvents="none"
                  >
                    <MaterialIcons name="auto-awesome" size={40} color="#FFFFFF" />
                  </View>
                </LinearGradient>

                <Text className="mb-1 mt-5 text-base font-hell-round-bold text-stone-800">
                  Activity mix
                </Text>
                {todayActivityBreakdown.length === 0 ? (
                  <Text className="mb-3 text-xs font-hell leading-4 text-stone-500">
                    Your clip hasn&apos;t reported class changes yet — these tiles will fill in as
                    it learns your day.
                  </Text>
                ) : null}
                <View className="gap-3">
                  {[0, 2].map((start) => (
                    <View key={start} className="flex-row gap-3">
                      {myDayGridKeys.slice(start, start + 2).map((key) => {
                        const bucket = activityToday?.by_activity?.[key] ?? {
                          count: 0,
                          total_seconds: 0,
                        };
                        const v = homeActivityVisual(key);
                        const secs = bucket.total_seconds ?? 0;
                        const mins = Math.round(secs / 60);
                        const count = bucket.count ?? 0;
                        const sub =
                          count === 0
                            ? "No events yet"
                            : mins > 0
                              ? `${count} event${count === 1 ? "" : "s"} · ~${mins} min`
                              : `${count} event${count === 1 ? "" : "s"}`;
                        return (
                          <View
                            key={key}
                            className="min-h-[76px] flex-1 flex-row items-center gap-3 rounded-[24px] bg-[#F3EEE6] px-4 py-3.5"
                          >
                            <View
                              className="h-11 w-11 items-center justify-center rounded-full"
                              style={{ backgroundColor: v.accent }}
                            >
                              <MaterialIcons name={v.icon} size={22} color="#FFFFFF" />
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text
                                className="text-[15px] font-hell-round-bold text-stone-900"
                                numberOfLines={1}
                              >
                                {formatActivityDisplayName(key)}
                              </Text>
                              <Text
                                className="mt-0.5 text-xs font-hell text-stone-500"
                                numberOfLines={2}
                              >
                                {sub}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View className="mb-3 mt-9 flex-row items-center justify-between">
              <Text className="text-lg font-hell-round-bold text-gray-900">
                Today&apos;s activities
              </Text>
            <TouchableOpacity
              onPress={() => router.push("/statistics")}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="flex-row items-center rounded-full"
            >
              <Text className="text-sm font-hell-round-bold" style={{ color: BRAND_ORANGE }}>
                See all
              </Text>
            </TouchableOpacity>
          </View>

          {!showAsSignedIn ? (
            <View className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6">
              <Text className="text-center text-sm font-hell leading-5 text-gray-600">
                Sign in to see a live timeline from your wearable.
              </Text>
            </View>
          ) : todayStatsLoading ? (
            <View className="items-center rounded-3xl border border-gray-100 bg-white py-10">
              <ActivityIndicator color={BRAND_ORANGE} />
            </View>
          ) : todayStatsError ? (
            <View className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5">
              <Text className="text-center text-sm font-hell text-gray-600">
                Timeline unavailable right now. Try again from the Statistics screen.
              </Text>
            </View>
          ) : todayTimelineEvents.length === 0 ? (
            <View
              className="items-center rounded-3xl border border-gray-100 bg-white px-5 py-8"
              style={styles.myDaySheet}
            >
              <View className="h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <MaterialIcons name="timeline" size={28} color="#9CA3AF" />
              </View>
              <Text className="mt-3 text-center text-sm font-hell leading-5 text-gray-600">
                No activity events yet today. When your clip sends class changes, they will show
                up here.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {todayTimelineEvents.map((ev, index) => {
                const v = homeActivityVisual(ev.activity);
                const timeLabel = formatTimelineTime(ev.created_at);
                return (
                  <View
                    key={`${ev.created_at ?? ""}-${index}`}
                    className="flex-row overflow-hidden rounded-2xl border border-gray-100 bg-white"
                    style={styles.myDaySheet}
                  >
                    <View style={[styles.timelineStripe, { backgroundColor: v.accent }]} />
                    <View className="flex-1 flex-row items-center gap-3 py-3.5 pl-3 pr-4">
                      <View
                        className="h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${v.accent}18` }}
                      >
                        <MaterialIcons name={v.icon} size={22} color={v.accent} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-hell-round-bold text-gray-900">
                          {formatActivityDisplayName(ev.activity)}
                        </Text>
                        {timeLabel ? (
                          <Text className="mt-1 text-xs font-hell text-gray-500">{timeLabel}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      <EmergencyQuickActionsModal
        visible={showQuickActionsModal}
        message={fallQuickActionMessage}
        contacts={contacts}
        contactsLoading={contactsLoading}
        primaryCallLabel={primaryCallLabel}
        primaryCallDisabled={primaryCallDisabled}
        onDismiss={handleFallSheetDismiss}
        onAcknowledge={handleAcknowledgeFallAlert}
        onPrimaryCall={handlePrimaryQuickCall}
        onManageContacts={handleManageContacts}
        onCallContact={callPhoneNumber}
      />
    </View>

  );
};

export default HomeScreen;
