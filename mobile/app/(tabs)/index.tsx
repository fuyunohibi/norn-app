import { useQuery } from "@tanstack/react-query";
import { Audio } from "expo-av";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ImageBackground,
  Linking,
  ScrollView,
  Text,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmergencyQuickActionsModal } from "../../components/emergency-quick-actions-modal";
import { homeActivityVisual } from "../../components/home/home-activity-visual";
import { homeScreenStyles } from "../../components/home/home-screen.styles";
import { MyDaySummaryCard } from "../../components/home/my-day-summary-card";
import { TodayActivitiesHeader } from "../../components/home/today-activities-header";
import { TodayTimelineList } from "../../components/home/today-timeline-list";
import { WearableStatusChip } from "../../components/home/wearable-status-chip";
import { NornIcon } from "../../components/norn-icon";
import { NORN_ALERT_ENTRY_ANIMATION_MS, NornStateMascot } from "../../components/norn-state-mascot";
import { ScreenSectionHeader } from "../../components/ui/screen-section-header";
import { useAuth } from "../../contexts/auth-context";
import { useActivityStatistics } from "../../hooks/useActivityStatistics";
import { upsertTodayDailySummaryFromActivity } from "../../actions/statistics.actions";
import { upsertTodayDailySummaryFromEventsFallback } from "../../actions/statistics.actions";
import { fetchDailyStatistics } from "../../actions/statistics.actions";
import { fetchTodayActivityEvents, buildTodayStatsFromEvents } from "../../actions/statistics.actions";
import { useCareBackupContacts } from "../../hooks/useCareBackupContacts";
import { useCareRecipientProfile } from "../../hooks/useCareRecipientProfile";
import { useImuWearableStatus } from "../../hooks/useImuWearableStatus";
import { backendAPIService } from "../../services/backend-api.service";
import { formatActivityDisplayName, imuActivityCodeIsFallClass } from "../../utils/imu-activity";
import { formatTimelineTime } from "../../utils/time.utils";

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
  const { data: persistedTodayRows = [] } = useQuery({
    queryKey: ["daily-statistics-home-today", userId],
    queryFn: () => fetchDailyStatistics(userId!, 1),
    enabled: Boolean(userId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const { data: todayFallbackEvents = [] } = useQuery({
    queryKey: ["today-activity-events-fallback", userId],
    queryFn: () => fetchTodayActivityEvents(userId!),
    enabled: Boolean(userId),
    staleTime: 8_000,
    refetchInterval: 10_000,
  });
  const persistedToday = persistedTodayRows[0] ?? null;
  const fallbackTodayStats = useMemo(() => {
    if (!persistedToday) return undefined;
    const raw = persistedToday.activity_class_breakdown;
    const source =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, { count?: number; total_seconds?: number }>)
        : {};
    const byActivity = Object.entries(source).reduce<
      Record<string, { count: number; total_seconds: number }>
    >((acc, [k, v]) => {
      acc[k] = {
        count: v?.count ?? 0,
        total_seconds: v?.total_seconds ?? 0,
      };
      return acc;
    }, {});
    return {
      period: "today",
      from: `${persistedToday.stat_date}T00:00:00.000Z`,
      to: `${persistedToday.stat_date}T23:59:59.999Z`,
      by_activity: byActivity,
      events: [],
      total_events: persistedToday.imu_activity_event_count ?? persistedToday.total_readings ?? 0,
    };
  }, [persistedToday]);
  const eventsDerivedTodayStats = useMemo(
    () => (todayFallbackEvents.length ? buildTodayStatsFromEvents(todayFallbackEvents) : undefined),
    [todayFallbackEvents],
  );
  const effectiveActivityToday = activityToday ?? eventsDerivedTodayStats ?? fallbackTodayStats;
  const showTodayLoadingSpinner = todayStatsLoading && !effectiveActivityToday;
  const showTodaySummaryError = todayStatsError && !effectiveActivityToday;
  const lastPersistedSummaryRef = useRef<string | null>(null);
  const lastFallbackPersistAtRef = useRef<number>(0);
  const insets = useSafeAreaInsets();
  const lastFallAlertRef = useRef<string | null>(null);
  const [fallQuickActionMessage, setFallQuickActionMessage] = useState<string | null>(null);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const fallVibrationLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallAlarmSoundRef = useRef<Audio.Sound | null>(null);
  const fallAlarmOpRef = useRef(0);
  /** Mascot when the clip looks Live, scene when offline/loading; fall sheet forces mascot. */
  const bannerShowsMascotUi = useMemo(() => {
    if (showQuickActionsModal) return true;
    if (!showAsSignedIn) return false;
    if (imuStatusLoading) return false;
    return Boolean(imuStatus?.online);
  }, [showQuickActionsModal, showAsSignedIn, imuStatusLoading, imuStatus?.online]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[Home][MascotVisibility]", {
      showQuickActionsModal,
      showAsSignedIn,
      imuStatusLoading,
      imuOnline: Boolean(imuStatus?.online),
      bannerShowsMascotUi,
    });
  }, [
    showQuickActionsModal,
    showAsSignedIn,
    imuStatusLoading,
    imuStatus?.online,
    bannerShowsMascotUi,
  ]);

  const bannerBlend = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bannerBlend, {
      toValue: bannerShowsMascotUi ? 1 : 0,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [bannerShowsMascotUi, bannerBlend]);

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

  const triggerFallVibration = useCallback(() => {
    // Urgent pattern for critical fall alerts.
    Vibration.vibrate([0, 250, 120, 250, 120, 450]);
  }, []);

  const stopFallVibrationLoop = useCallback(() => {
    if (fallVibrationLoopRef.current) {
      clearInterval(fallVibrationLoopRef.current);
      fallVibrationLoopRef.current = null;
    }
    Vibration.cancel();
  }, []);

  const startFallAlarmLoop = useCallback(async () => {
    try {
      const opId = ++fallAlarmOpRef.current;
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      let sound = fallAlarmSoundRef.current;
      if (!sound) {
        sound = new Audio.Sound();
        await sound.loadAsync(require("../../assets/sounds/alarm-sound.mp3"), {
          isLooping: true,
          volume: 1.0,
        });
        fallAlarmSoundRef.current = sound;
      }

      // A newer stop/start op happened while loading.
      if (opId !== fallAlarmOpRef.current) return;
      await sound.playAsync();
    } catch (err) {
      console.error("Failed to start fall alarm sound:", err);
    }
  }, []);

  const stopFallAlarmLoop = useCallback(async () => {
    try {
      fallAlarmOpRef.current += 1;
      const sound = fallAlarmSoundRef.current;
      if (!sound) return;
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await sound.stopAsync();
      }
      await sound.unloadAsync();
      fallAlarmSoundRef.current = null;
    } catch (err) {
      // Safe to ignore race-y stop/unload audio interruptions.
    }
  }, []);

  const startFallVibrationLoop = useCallback(() => {
    if (fallVibrationLoopRef.current) return;
    triggerFallVibration();
    // Repeat urgently until caregiver acknowledges or starts calling.
    fallVibrationLoopRef.current = setInterval(() => {
      triggerFallVibration();
    }, 1400);
  }, [triggerFallVibration]);

  const presentFallQuickActions = useCallback((message?: string) => {
    triggerFallVibration();
    setFallQuickActionMessage(
      message ??
        "A fall or safety event was reported for the person wearing the sensor. Check on them or use the actions below.",
    );
    setShowQuickActionsModal(true);
  }, [triggerFallVibration]);

  const dismissFallQuickActions = useCallback(() => {
    stopFallVibrationLoop();
    void stopFallAlarmLoop();
    setShowQuickActionsModal(false);
  }, [stopFallVibrationLoop, stopFallAlarmLoop]);

  const handleFallSheetDismiss = useCallback(() => {
    stopFallVibrationLoop();
    void stopFallAlarmLoop();
    setFallQuickActionMessage(null);
    setShowQuickActionsModal(false);
  }, [stopFallVibrationLoop, stopFallAlarmLoop]);

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
    stopFallVibrationLoop();
    void stopFallAlarmLoop();
    dismissFallQuickActions();
  }, [dismissFallQuickActions, stopFallVibrationLoop, stopFallAlarmLoop]);

  const handleManageContacts = useCallback(() => {
    stopFallVibrationLoop();
    void stopFallAlarmLoop();
    dismissFallQuickActions();
    router.push("/settings");
  }, [dismissFallQuickActions, stopFallVibrationLoop, stopFallAlarmLoop]);

  useEffect(() => {
    if (showQuickActionsModal) {
      startFallVibrationLoop();
      void startFallAlarmLoop();
    } else {
      stopFallVibrationLoop();
      void stopFallAlarmLoop();
    }

    return () => {
      stopFallVibrationLoop();
      void stopFallAlarmLoop();
    };
  }, [
    showQuickActionsModal,
    startFallVibrationLoop,
    stopFallVibrationLoop,
    startFallAlarmLoop,
    stopFallAlarmLoop,
  ]);

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
    const by = effectiveActivityToday?.by_activity;
    if (!by) return 0;
    return Object.values(by).reduce((s, b) => s + (b.total_seconds ?? 0) / 60, 0);
  }, [effectiveActivityToday?.by_activity]);

  const todayActivityBreakdown = useMemo(() => {
    const by = effectiveActivityToday?.by_activity;
    if (!by) return [];
    return Object.entries(by)
      .filter(([, v]) => (v.count ?? 0) > 0 || (v.total_seconds ?? 0) > 0)
      .sort((a, b) => (b[1].total_seconds ?? 0) - (a[1].total_seconds ?? 0))
      .slice(0, 6);
  }, [effectiveActivityToday?.by_activity]);

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
    const list = effectiveActivityToday?.events ?? [];
    return [...list]
      .filter((e) => e.activity && String(e.activity).toLowerCase() !== "ping")
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 20);
  }, [effectiveActivityToday?.events]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[Home] Daily summary precheck", {
        hasUserId: Boolean(userId),
        todayStatsLoading,
        todayStatsError,
        hasActivityToday: Boolean(activityToday),
        totalEvents: activityToday?.total_events ?? null,
      });
    }

    if (!userId || !activityToday) {
      if (__DEV__) {
        console.log("[Home] Daily summary skipped", {
          reason: !userId ? "missing-user-id" : "missing-activity-today",
        });
      }
      return;
    }
    const signature = JSON.stringify({
      total_events: activityToday.total_events ?? 0,
      by_activity: activityToday.by_activity ?? {},
      last_event_at: (activityToday.events ?? [])
        .map((e) => e.created_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null,
    });
    if (lastPersistedSummaryRef.current === signature) return;
    lastPersistedSummaryRef.current = signature;

    if (__DEV__) {
      console.log("[Home] Persist daily summary trigger", {
        userId,
        total_events: activityToday.total_events ?? 0,
      });
    }

    upsertTodayDailySummaryFromActivity(userId, activityToday).catch((err) => {
      console.error("Failed to persist daily summary:", err);
      lastPersistedSummaryRef.current = null;
    });
  }, [userId, activityToday, todayStatsLoading, todayStatsError]);

  useEffect(() => {
    if (!userId || !todayStatsError || todayStatsLoading) return;
    const now = Date.now();
    // Avoid hammering when API is flapping: try fallback at most every 30s.
    if (now - lastFallbackPersistAtRef.current < 30_000) return;
    lastFallbackPersistAtRef.current = now;

    if (__DEV__) {
      console.log("[Home] Daily summary fallback trigger", { userId });
    }

    upsertTodayDailySummaryFromEventsFallback(userId).catch((err) => {
      console.error("Failed to persist daily summary via fallback:", err);
    });
  }, [userId, todayStatsError, todayStatsLoading]);

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

  // IMU / backend fall alerts: show only when actual fall state is reported.
  useEffect(() => {
    if (!unreadAlerts || unreadAlerts.length === 0) return;

    // Find critical fall alerts that haven't been shown yet.
    // Also verify they're recent (within last 2 minutes) and actually detected as falls.
    const now = new Date().getTime();
    const twoMinutesAgo = now - 2 * 60 * 1000;

    const fallAlerts = unreadAlerts.filter((alert) => {
      const isActualFall = alert.alert_type === "fall" && alert.severity === "critical";
      if (!isActualFall) return false;
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

      presentFallQuickActions(
        `A fall was detected (${confidence} confidence) for the person wearing the sensor. Check on them or call using the actions below.`,
      );
    }
  }, [unreadAlerts, presentFallQuickActions]);

  // Live IMU fall class (short code `f`, or mock-friendly `fall` / `falling`) from wearable status
  useEffect(() => {
    const raw = imuStatus?.activity_code;
    const trimmed = raw?.trim();
    // Clear dedupe after we leave fall state so si→f / r→f can open the sheet again even if
    // `last_seen_at` is unchanged (mock saves or backend row timestamp).
    if (trimmed && !imuActivityCodeIsFallClass(raw)) {
      lastFallAlertRef.current = null;
      return;
    }
    if (!imuActivityCodeIsFallClass(raw)) return;

    const code = raw!.trim().toLowerCase();
    const fallIdentifier = `${code}-${imuStatus?.last_seen_at ?? ""}`;
    if (lastFallAlertRef.current === fallIdentifier) return;

    const msg =
      "The wearable reported a fall for the person you monitor. Check on them or call below.";

    const t = setTimeout(() => {
      lastFallAlertRef.current = fallIdentifier;
      presentFallQuickActions(msg);
    }, NORN_ALERT_ENTRY_ANIMATION_MS);

    return () => clearTimeout(t);
  }, [imuStatus?.activity_code, imuStatus?.last_seen_at, presentFallQuickActions]);

  const mascotProps = {
    signedIn: showAsSignedIn,
    activityCode: imuStatus?.activity_code ?? null,
    loading: showAsSignedIn && imuStatusLoading,
    statusError: showAsSignedIn && imuStatusErrorBool,
  };

  return (
    <View className="flex-1 bg-gray-900">

      {/* Banner: crossfade + light scale between scene and mascot (native driver). */}
      <View className="relative h-[25rem] w-full overflow-hidden rounded-b-[2.5rem]">
        <Animated.View
          pointerEvents={bannerShowsMascotUi ? "none" : "auto"}
          style={[
            homeScreenStyles.bannerLayer,
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
          pointerEvents={bannerShowsMascotUi ? "auto" : "none"}
          style={[
            homeScreenStyles.bannerLayer,
            homeScreenStyles.bannerLayerMascot,
            {
              opacity: bannerMascotOpacity,
              transform: [{ scale: bannerMascotScale }],
            },
          ]}
        >
          <NornStateMascot {...mascotProps} />
        </Animated.View>

        <WearableStatusChip
          label={wearableChipLabel}
          dot={wearableStatusDot}
          showLoadingSpinner={showAsSignedIn && imuStatusLoading}
          topInset={insets.top}
        />
      </View>

      <View className="flex-1 bg-gray-900">
        <ScrollView
          className="flex-1 rounded-t-[2.5rem] bg-white p-6 mt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 150,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenSectionHeader title="My day" subtitle={myDayDateLabel} />

          <MyDaySummaryCard
            showSignedIn={showAsSignedIn}
            loading={showTodayLoadingSpinner}
            hasError={showTodaySummaryError}
            activityToday={effectiveActivityToday}
            todayTrackedMinutes={todayTrackedMinutes}
            todayActivityBreakdown={todayActivityBreakdown}
            myDayGridKeys={myDayGridKeys}
            getVisual={homeActivityVisual}
            formatActivityLabel={formatActivityDisplayName}
          />

          <TodayActivitiesHeader onSeeAll={() => router.push("/statistics")} />

          <TodayTimelineList
            showSignedIn={showAsSignedIn}
            loading={showTodayLoadingSpinner}
            hasError={showTodaySummaryError}
            events={todayTimelineEvents}
            getVisual={homeActivityVisual}
            formatActivityLabel={formatActivityDisplayName}
            formatTimeLabel={formatTimelineTime}
          />
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
