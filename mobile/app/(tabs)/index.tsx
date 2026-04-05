import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmergencyQuickActionsModal } from "../../components/emergency-quick-actions-modal";
import { NornIcon } from "../../components/norn-icon";
import { Card } from "../../components/ui/card";
import { useAuth } from "../../contexts/auth-context";
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
      </ScrollView>

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
