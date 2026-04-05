import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Activity,
  Shield,
  Star,
  User,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NornIcon } from "../../components/norn-icon";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useAuth } from "../../contexts/auth-context";
import { useActivityStatistics } from "../../hooks/useActivityStatistics";
import { useEmergencyContacts } from "../../hooks/useEmergencyContacts";
import { useImuWearableStatus } from "../../hooks/useImuWearableStatus";
import { backendAPIService } from "../../services/backend-api.service";
import { formatActivityDisplayName } from "../../utils/imu-activity";

/** Last ML class for UI; pings-only shows an explicit heartbeat line (not “waiting forever”). */
function imuLiveActivityHeadlineOnline(status: {
  activity_label?: string | null;
  activity_code?: string | null;
}): string {
  if (status.activity_label) return status.activity_label;
  if (status.activity_code) return formatActivityDisplayName(status.activity_code);
  return "Heartbeat (no class change stored yet)";
}

const HomeScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const {
    data: imuStatus,
    isLoading: imuStatusLoading,
    error: imuStatusError,
  } = useImuWearableStatus(userId);
  const {
    data: activityStatsRes,
    isLoading: activityStatsLoading,
    error: activityStatsError,
  } = useActivityStatistics(userId, "today");
  const activityStats = activityStatsRes?.statistics;
  /** Only IMU status gates the main wearable block; activity stats load in the section below. */
  const wearableMainLoading = imuStatusLoading;

  const topClassToday = useMemo(() => {
    const by = activityStats?.by_activity;
    if (!by || !Object.keys(by).length) return null;
    const sorted = Object.entries(by).sort(
      (a, b) => (b[1].total_seconds ?? 0) - (a[1].total_seconds ?? 0),
    );
    return sorted[0]?.[0] ?? null;
  }, [activityStats?.by_activity]);

  const trackedTodayMinutes = useMemo(() => {
    const by = activityStats?.by_activity;
    if (!by) return 0;
    return Math.round(
      Object.values(by).reduce((s, b) => s + (b.total_seconds ?? 0), 0) / 60,
    );
  }, [activityStats?.by_activity]);
  const imuDataError = imuStatusError ?? null;
  const insets = useSafeAreaInsets();
  const lastFallAlertRef = useRef<string | null>(null);
  const [fallQuickActionMessage, setFallQuickActionMessage] = useState<string | null>(null);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);

  const {
    contacts,
    isLoading: contactsLoading,
  } = useEmergencyContacts(userId);

  const primaryContact = useMemo(
    () => contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null,
    [contacts],
  );

  const otherContacts = useMemo(
    () =>
      primaryContact
        ? contacts.filter((contact) => contact.id !== primaryContact.id)
        : contacts,
    [contacts, primaryContact],
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

  const handleViewSettings = () => {
    router.push("/settings");
  };

  const wearableStatusTitle = useMemo(() => {
    if (!userId) return "Sign in";
    if (imuStatusLoading) return "Checking…";
    if (imuStatusError) return "Status unavailable";
    return imuStatus?.online ? "Connected" : "Disconnected";
  }, [userId, imuStatusLoading, imuStatusError, imuStatus?.online]);

  const wearableStatusSubtitle = useMemo(() => {
    if (!userId) return "Sign in to see whether your clip is reporting.";
    if (imuStatusLoading) return "Loading wearable status…";
    if (imuStatusError) return "Could not load wearable status.";
    return imuStatus?.online
      ? "Wearable online — recent data from your clip"
      : "No recent wearable signal (~90s).";
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

  return (
    <View className="flex-1 bg-white">
      <View
        className="w-full justify-center items-center h-[11rem] bg-gray-900 rounded-b-[4rem]"
        style={{
          paddingTop: insets.top,
        }}
      >
        <View className="flex-row items-center justify-center">
          <NornIcon size={48} />
          <Text className="text-lg font-hell-round-bold text-white ml-1.5">
            NORN
          </Text>
        </View>
      </View>
      <ScrollView className="flex-1 bg-white p-6">
        {/* IMU clip: connected / disconnected from recent activity_events (incl. ping), plus live details */}
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
                  The clip may be off, out of Wi‑Fi range, or has not reported in the last ~90
                  seconds.
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

        {userId && !imuStatusLoading && !imuStatusError && (
          <>
            <Card variant="outlined" className="mb-6 bg-primary-accent/5 border-primary-accent/20">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-3">
                    <Star size={24} color="white" fill="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-hell-round-bold text-gray-900">Current activity</Text>
                    <Text className="text-xs text-gray-600 font-hell">
                      Last class from on-device model (st · si · w · r · nf · f · af)
                    </Text>
                  </View>
                </View>
                <Text className="text-3xl font-hell-round-bold text-gray-900">
                  {imuStatus?.online
                    ? imuLiveActivityHeadlineOnline(imuStatus)
                    : "—"}
                </Text>
                {imuStatus?.online && imuStatus.activity_code ? (
                  <Text className="text-gray-500 text-xs font-hell mt-2">
                    Code: {imuStatus.activity_code.toUpperCase()}
                  </Text>
                ) : null}
              </View>
            </Card>

            <Card variant="outlined" className="mb-6">
              <Text className="text-lg font-hell-round-bold text-gray-900 mb-3">Today</Text>
              {activityStatsLoading ? (
                <ActivityIndicator color="#FF7300" />
              ) : activityStatsError ? (
                <Text className="text-orange-600 text-sm font-hell">
                  Could not load today&apos;s summary.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-3">
                  <View className="flex-1 min-w-[100px] bg-gray-50 rounded-xl p-3 items-center">
                    <User size={20} color="#6B7280" />
                    <Text className="text-xs text-gray-600 font-hell mt-2">Events</Text>
                    <Text className="text-lg font-hell-round-bold text-gray-900">
                      {activityStats?.total_events ?? 0}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[100px] bg-gray-50 rounded-xl p-3 items-center">
                    <Activity size={20} color="#6B7280" />
                    <Text className="text-xs text-gray-600 font-hell mt-2">Top class</Text>
                    <Text className="text-sm font-hell-round-bold text-gray-900 text-center">
                      {topClassToday ? formatActivityDisplayName(topClassToday) : "—"}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[100px] bg-gray-50 rounded-xl p-3 items-center">
                    <Zap size={20} color="#6B7280" />
                    <Text className="text-xs text-gray-600 font-hell mt-2">Tracked</Text>
                    <Text className="text-sm font-hell-round-bold text-gray-900">
                      {trackedTodayMinutes > 0 ? `${trackedTodayMinutes}m` : "—"}
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          </>
        )}

        {!userId && (
          <Card variant="outlined" className="mb-6">
            <View className="p-4">
              <Text className="text-gray-700 font-hell">
                Sign in to load your wearable and activity data.
              </Text>
            </View>
          </Card>
        )}

        {wearableMainLoading && !!userId && (
          <View className="mb-6 items-center py-8">
            <ActivityIndicator size="large" color="#FF7300" />
            <Text className="text-gray-600 font-hell mt-4">
              Loading wearable status...
            </Text>
          </View>
        )}

        {imuDataError && !!userId && (
          <Card variant="outlined" className="mb-6">
            <View className="p-4">
              <Text className="text-red-500 font-hell-round-bold">
                Error loading wearable data
              </Text>
              <Text className="text-gray-600 text-sm font-hell mt-2">
                {imuDataError.message || String(imuDataError)}
              </Text>
              <Text className="text-gray-500 text-xs font-hell mt-2">
                Set EXPO_PUBLIC_API_URL to your computer&apos;s LAN IP (same Wi‑Fi as the phone).
              </Text>
            </View>
          </Card>
        )}

        {!!userId && !imuStatusLoading && !imuDataError && (
          <View className="mb-6">
            <Text className="text-xl font-hell-round-bold text-gray-900 mb-2">
              Wearable details
            </Text>
            {activityStatsError && (
              <Text className="text-orange-600 text-xs font-hell mb-3">
                Could not load today&apos;s activity breakdown.{" "}
                {activityStatsError.message || String(activityStatsError)}
              </Text>
            )}
            {imuStatus?.last_seen_at && (
              <Text className="text-gray-500 text-sm font-hell mb-4">
                Last signal: {new Date(imuStatus.last_seen_at).toLocaleString()}
              </Text>
            )}

            <View className="gap-y-3">
              <Card variant="outlined">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                      <Activity size={24} color="white" />
                    </View>
                    <View>
                      <Text className="text-lg font-hell-round-bold text-gray-900 ">
                        Today&apos;s activity
                      </Text>
                      <Text className="text-gray-600 text-sm font-hell">
                        State changes from the clip (walking, sitting, …) plus heartbeats
                      </Text>
                    </View>
                  </View>
                  {activityStatsLoading && !activityStats ? (
                    <ActivityIndicator size="small" color="#FF7300" />
                  ) : (
                    <Text className="text-2xl font-hell-round-bold text-primary-accent ">
                      {activityStats?.total_events ?? 0}
                    </Text>
                  )}
                </View>
              </Card>

              <Card variant="outlined">
                <View className="p-4">
                  <Text className="text-base font-hell-round-bold text-gray-900 mb-3">
                    Time by class (today)
                  </Text>
                  {activityStats?.by_activity &&
                  Object.keys(activityStats.by_activity).length > 0 ? (
                    Object.entries(activityStats.by_activity).map(([name, bucket]) => (
                      <View
                        key={name}
                        className="flex-row items-center justify-between py-2 border-b border-gray-100"
                      >
                        <Text className="text-gray-700 font-hell capitalize">{name.replace(/_/g, " ")}</Text>
                        <Text className="text-gray-900 font-hell-round-bold">
                          {Math.round((bucket.total_seconds ?? 0) / 60)}m
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-gray-500 text-sm font-hell">
                      No activity changes yet today. Move with the wearable on to populate this list.
                    </Text>
                  )}
                </View>
              </Card>

              <Card variant="outlined">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                        ["f", "af"].includes(imuStatus?.activity_code?.toLowerCase() ?? "")
                          ? "bg-red-500"
                          : imuStatus?.activity_code?.toLowerCase() === "nf"
                            ? "bg-orange-500"
                            : "bg-green-500"
                      }`}
                    >
                      <Shield size={24} color="white" fill="white" />
                    </View>
                    <View>
                      <Text className="text-lg font-hell-round-bold text-gray-900 ">
                        IMU safety
                      </Text>
                      <Text className="text-gray-600 text-sm font-hell">
                        Last class:{" "}
                        {imuStatus?.online && imuStatus
                          ? imuLiveActivityHeadlineOnline(imuStatus)
                          : "—"}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className={`text-sm font-hell-round-bold text-right max-w-[40%] ${
                      ["f", "af"].includes(imuStatus?.activity_code?.toLowerCase() ?? "")
                        ? "text-red-500"
                        : imuStatus?.activity_code?.toLowerCase() === "nf"
                          ? "text-orange-600"
                          : "text-green-600"
                    }`}
                  >
                    {["f", "af"].includes(imuStatus?.activity_code?.toLowerCase() ?? "")
                      ? "Critical"
                      : imuStatus?.activity_code?.toLowerCase() === "nf"
                        ? "Unstable"
                        : "OK"}
                  </Text>
                </View>
              </Card>

              <Card variant="outlined">
                <View className="p-4">
                  <Text className="text-gray-700 text-sm font-hell">
                    Critical alerts also appear when the ESP32 posts to{" "}
                    <Text className="font-hell-round-bold">/imu/alert</Text>. Check Notifications for history.
                  </Text>
                </View>
              </Card>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions Modal */}
      <Modal
        visible={showQuickActionsModal}
        transparent
        animationType="slide"
        onRequestClose={handleFallSheetDismiss}
      >
        <View className="flex-1 justify-end bg-black/50 p-7">
          <View className="bg-white rounded-[2.5rem] p-6 max-h-[75%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-2xl font-hell-round-bold text-gray-900 ">
                Fall Quick Actions
              </Text>
              <TouchableOpacity
                onPress={handleFallSheetDismiss}
                className="w-8 h-8 items-center justify-center"
              >
                <Text className="text-2xl text-gray-400 font-hell">×</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-gray-600 text-sm font-hell mb-6">
              {fallQuickActionMessage ??
                "A fall was detected. Let us know you are safe or call for help."}
            </Text>
            <View className="gap-y-3">
              <Button
                title="I'm OK"
                variant="secondary"
                size="lg"
                onPress={handleImOk}
              />
              <Button
                title={
                  primaryContact
                    ? `Call ${primaryContact.full_name}`
                    : "Call primary contact"
                }
                variant="primary"
                size="lg"
                onPress={handleNeedHelp}
                disabled={!primaryContact && contactsLoading}
              />
              <Button
                title="Manage Contacts"
                variant="outline"
                size="lg"
                onPress={handleManageContacts}
              />
            </View>
            {contactsLoading ? (
              <View className="flex-row items-center mt-6">
                <ActivityIndicator size="small" color="#FF7300" />
                <Text className="text-gray-500 text-sm font-hell ml-3">
                  Loading emergency contacts...
                </Text>
              </View>
            ) : (
              <ScrollView className="mt-6" showsVerticalScrollIndicator={false}>
                {contacts.length > 0 ? (
                  <View className="gap-y-2">
                    {contacts.map((contact) => (
                      <TouchableOpacity
                        key={contact.id}
                        onPress={() =>
                          callPhoneNumber(contact.phone_number, contact.full_name)
                        }
                        className="flex-row items-center justify-between bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100"
                        activeOpacity={0.85}
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-sm font-hell-round-bold text-gray-900 ">
                            {contact.full_name}
                          </Text>
                          <Text className="text-gray-600 text-xs font-hell mt-1">
                            {contact.phone_number}
                          </Text>
                        </View>
                        {contact.is_primary && (
                          <View className="bg-primary-accent/10 px-3 py-1 rounded-full">
                            <Text className="text-primary-accent text-xs font-hell">
                              Primary
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View className="bg-gray-50 rounded-2xl px-4 py-5 border border-dashed border-gray-300">
                    <Text className="text-sm font-hell-round-bold text-gray-900 text-center">
                      No emergency contacts yet
                    </Text>
                    <Text className="text-gray-600 text-xs font-hell mt-2 text-center">
                      Add trusted contacts so you can reach them fast during an emergency.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>

  );
};

export default HomeScreen;
