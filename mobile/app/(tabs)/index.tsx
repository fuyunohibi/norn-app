import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Heart,
  Moon,
  Shield,
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
import { getUnreadAlerts } from "../../services/monitoring.service";
import { useModeStore } from "../../stores/mode.store";

// Memoize the mode icon component to prevent re-renders
const getModeIcon = (modeId: string) => {
  switch (modeId) {
    case "sleep":
      return <Moon size={24} color="white" fill="white" />;
    case "fall":
      return <AlertTriangle size={24} color="white" />;
    default:
      return <Moon size={24} color="white" fill="white" />;
  }
};

const HomeScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const {
    modes,
    activeMode,
    setActiveMode,
    isLoading: modeLoading,
    error: modeError,
  } = useModeStore();
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
  const imuDataLoading = imuStatusLoading || activityStatsLoading;
  const imuDataError = imuStatusError ?? null;
  const [showModeSelector, setShowModeSelector] = useState(false);
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

  const handleModeSelect = async (mode: any) => {
    try {
      await setActiveMode(mode.id);
      setShowModeSelector(false);
    } catch (error) {
      Alert.alert("Error", "Failed to change mode. Please try again.");
    }
  };

  // Check backend health
  const [backendConnected, setBackendConnected] = useState<boolean | null>(
    null
  );
  const [backendError, setBackendError] = useState<string | null>(null);
  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        await backendAPIService.getHealthStatus();
        setBackendConnected(true);
        setBackendError(null);
      } catch (error: any) {
        setBackendConnected(false);
        const errorMsg = error.message || String(error);
        if (
          errorMsg.includes("Network request failed") ||
          errorMsg.includes("Failed to fetch")
        ) {
          setBackendError("Cannot connect to backend. Check network settings.");
        } else {
          setBackendError(errorMsg);
        }
      }
    };

    checkHealth();
    // Recheck every 60 seconds (reduced frequency)
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  // Monitor for fall detection alerts
  const { data: unreadAlerts = [] } = useQuery({
    queryKey: ["unread-alerts", userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getUnreadAlerts(userId);
    },
    enabled: !!userId,
    refetchInterval: 3000, // Check every 3 seconds for new alerts
  });

  // Track shown alerts to prevent duplicate notifications
  const shownAlertIds = useRef<Set<string>>(new Set());

  // Show alert when fall is detected (only in fall detection mode)
  useEffect(() => {
    if (!unreadAlerts || unreadAlerts.length === 0) return;

    // Only show fall alerts when in fall detection mode
    if (activeMode?.id !== "fall") return;

    // Find critical fall alerts that haven't been shown yet
    // Also verify they're recent (within last 2 minutes) and actually detected as falls
    const now = new Date().getTime();
    const twoMinutesAgo = now - 2 * 60 * 1000;

    const fallAlerts = unreadAlerts.filter((alert) => {
      // Check basic criteria
      if (alert.alert_type !== "fall" || alert.severity !== "critical")
        return false;
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
      const confidenceSource = latestFallData["ml_confidence"];
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
        `We detected a fall with ${confidence} confidence. Check in and choose a quick action.`,
      );
    }
  }, [unreadAlerts, activeMode?.id, presentFallQuickActions]);

  // Live IMU activity codes from wearable (f / af / nf)
  useEffect(() => {
    if (activeMode?.id !== "fall") return;
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
  }, [activeMode?.id, imuStatus?.activity_code, imuStatus?.last_seen_at, presentFallQuickActions]);

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
        {/* Connection Status */}
        <Card variant="outlined" className="mb-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-hell-round-bold text-gray-900 ">
                {backendConnected
                  ? "Connected"
                  : backendConnected === false
                  ? "Disconnected"
                  : "Checking..."}
              </Text>
              <Text className="text-gray-600 text-sm font-hell">
                {imuDataLoading
                  ? "Loading wearable data..."
                  : imuStatus?.online
                    ? "Wearable online"
                    : "No recent wearable signal"}
              </Text>
              {/* {modeError && (
                  <Text className="text-red-500 text-xs mt-1 font-hell">{modeError}</Text>
                )} */}
              {backendError && (
                <Text className="text-orange-500 text-xs font-hell mt-1">
                  {backendError}
                </Text>
              )}
            </View>
            <View
              className={`w-3 h-3 rounded-full ${
                backendConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </View>
        </Card>

        <Card variant="outlined" className="mb-6">
          <Text className="text-lg font-hell-round-bold text-gray-900 mb-2">
            Fall sensor (wearable)
          </Text>
          {backendConnected === null ? (
            <View className="py-2">
              <ActivityIndicator color="#FF7300" />
            </View>
          ) : backendConnected === false ? (
            <Text className="text-gray-600 text-sm font-hell">
              Connect to the backend to see whether your clip sensor is powered and reporting.
            </Text>
          ) : imuStatusLoading ? (
            <View className="py-2">
              <ActivityIndicator color="#FF7300" />
            </View>
          ) : imuStatusError ? (
            <Text className="text-orange-600 text-sm font-hell">
              Could not load sensor status. Check the API and database.
            </Text>
          ) : imuStatus?.online ? (
            <View>
              <View className="flex-row items-center mb-2">
                <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                <Text className="text-gray-800 font-hell-round-bold">On</Text>
              </View>
              <Text className="text-gray-700 text-sm font-hell">
                Current activity:{" "}
                <Text className="font-hell-round-bold">
                  {imuStatus.activity_label ??
                    "No activity change yet (sensor is running)"}
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
            </View>
          ) : (
            <View>
              <View className="flex-row items-center mb-2">
                <View className="w-3 h-3 rounded-full bg-gray-400 mr-2" />
                <Text className="text-gray-800 font-hell-round-bold">
                  Not available
                </Text>
              </View>
              <Text className="text-gray-600 text-sm font-hell">
                The sensor may be switched off, out of Wi-Fi range, or has not
                reported in the last ~90 seconds.
              </Text>
            </View>
          )}
        </Card>

        {/* Mode Selector */}
        <Text className="text-xl font-hell-round-bold text-gray-900 mb-4">
          Current Mode
        </Text>
        <Card variant="outlined" className="mb-6">
          <TouchableOpacity
            onPress={() => setShowModeSelector(true)}
            disabled={modeLoading}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                {modeLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : activeMode ? (
                  getModeIcon(activeMode.id)
                ) : (
                  <Moon size={24} color="white" fill="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-lg font-hell-round-bold text-gray-900">
                  {activeMode?.name || "No Mode Selected"}
                </Text>
                {modeLoading && (
                  <Text className="text-gray-500 text-xs font-hell mt-1">
                    Changing mode...
                  </Text>
                )}
              </View>
            </View>
            <View className="ml-2">
              <ChevronRight size={24} color="#9E9E9E" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        </Card>

        {!userId && (
          <Card variant="outlined" className="mb-6">
            <View className="p-4">
              <Text className="text-gray-700 font-hell">
                Sign in to load your wearable and activity data.
              </Text>
            </View>
          </Card>
        )}

        {imuDataLoading && !!userId && (
          <View className="mb-6 items-center py-8">
            <ActivityIndicator size="large" color="#FF7300" />
            <Text className="text-gray-600 font-hell mt-4">
              Loading wearable data...
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
              {activeMode?.name} (IMU)
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

            {activeMode?.id === "sleep" && (
              <View className="gap-y-3">
                <Card variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                        <Moon size={24} color="white" fill="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-hell-round-bold text-gray-900 ">
                          Today&apos;s activity
                        </Text>
                        <Text className="text-gray-600 text-sm font-hell">
                          From MPU6050 events stored for your account
                        </Text>
                      </View>
                    </View>
                    <Text className="text-2xl font-hell-round-bold text-primary-accent ">
                      {activityStats?.total_events ?? 0}
                    </Text>
                  </View>
                </Card>

                <Card variant="outlined">
                  <View className="p-4">
                    <Text className="text-base font-hell-round-bold text-gray-900 mb-3">
                      Time by posture (today)
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
              </View>
            )}

            {activeMode?.id === "fall" && (
              <View className="gap-y-3">
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
                          {imuStatus?.activity_label ?? "—"}
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
                      Critical alerts also appear from the backend when the ESP32 posts to{" "}
                      <Text className="font-hell-round-bold">/imu/alert</Text>. Check Notifications for history.
                    </Text>
                  </View>
                </Card>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Mode Selector Modal */}
      <Modal
        visible={showModeSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModeSelector(false)}
      >
        <View className="flex-1 justify-end bg-black/50 p-7">
          <View className="bg-white rounded-[2.5rem] p-6 max-h-[70%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-hell-round-bold text-gray-900 ">
                Select Mode
              </Text>
              <TouchableOpacity
                onPress={() => setShowModeSelector(false)}
                className="w-8 h-8 items-center justify-center"
              >
                <Text className="text-2xl text-gray-400 font-hell">×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {modes.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  onPress={() => handleModeSelect(mode)}
                  disabled={modeLoading}
                  className={`mb-4 p-4 rounded-2xl border-2 ${
                    activeMode?.id === mode.id
                      ? "border-primary-accent bg-primary-accent/10"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                        activeMode?.id === mode.id
                          ? "bg-primary-accent"
                          : "bg-gray-200"
                      }`}
                    >
                      {getModeIcon(mode.id)}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-lg font-hell-round-bold ${
                          activeMode?.id === mode.id
                            ? "text-primary-accent"
                            : "text-gray-900"
                        }`}
                      >
                        {mode.name}
                      </Text>
                      <Text className="text-gray-600 text-sm font-hell mt-1">
                        {mode.description}
                      </Text>
                    </View>
                    {activeMode?.id === mode.id && (
                      <View className="w-6 h-6 rounded-full bg-primary-accent items-center justify-center">
                        <Text className="text-white text-xs font-hell">✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
