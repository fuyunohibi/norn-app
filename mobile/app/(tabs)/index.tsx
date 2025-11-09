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
import { useEmergencyContacts } from "../../hooks/useEmergencyContacts";
import { useLatestSensorReading } from "../../hooks/useSensorReadings";
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
  const {
    modes,
    activeMode,
    setActiveMode,
    isLoading: modeLoading,
    error: modeError,
  } = useModeStore();
  // Use the default user_id that matches the backend (memoized)
  const userId = React.useMemo(
    () => "0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61",
    []
  );
  const {
    reading,
    rawData,
    isLoading: readingLoading,
    error: readingError,
    timestamp,
    readingType,
  } = useLatestSensorReading(userId);
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
      const isRealFall =
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

  // Immediate fall alert using live readings to give instant feedback on the home screen
  useEffect(() => {
    if (activeMode?.id !== "fall") return;
    if (!rawData && !reading) return;

    const isFallDetected =
      (rawData && rawData.mode === "fall_detection" && rawData.fall_status === 1) ||
      Boolean(reading?.is_fall_detected);

    if (!isFallDetected) return;

    const fallIdentifier =
      (reading && reading.id) ||
      (rawData?.timestamp ? `ts-${rawData.timestamp}` : null);

    if (fallIdentifier && lastFallAlertRef.current === fallIdentifier) return;

    lastFallAlertRef.current = fallIdentifier;

    presentFallQuickActions(
      "The sensor just detected a fall. Let us know if you need assistance.",
    );
  }, [activeMode?.id, rawData, reading, presentFallQuickActions]);

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
                {readingLoading
                  ? "Loading sensor data..."
                  : reading
                  ? "Receiving data"
                  : "No data yet"}
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

        {/* Mode-Specific Data Display */}
        {readingLoading && (
          <View className="mb-6 items-center py-8">
            <ActivityIndicator size="large" color="#FF7300" />
            <Text className="text-gray-600 font-hell mt-4">
              Loading sensor data...
            </Text>
          </View>
        )}

        {readingError && (
          <Card variant="outlined" className="mb-6">
            <View className="p-4">
              <Text className="text-red-500 font-hell-round-bold">
                Error loading data
              </Text>
              <Text className="text-gray-600 text-sm font-hell mt-2">
                {readingError.message || String(readingError)}
              </Text>
              <Text className="text-gray-500 text-xs font-hell mt-2">
                Make sure EXPO_PUBLIC_API_URL is set to your computer's IP
                (e.g., http://192.168.1.100:8000)
              </Text>
            </View>
          </Card>
        )}

        {reading && rawData && (
          <View className="mb-6">
            <Text className="text-xl font-hell-round-bold text-gray-900 mb-2">
              {activeMode?.name} Status
            </Text>
            {timestamp && (
              <Text className="text-gray-500 text-sm font-hell mb-4">
                Last update: {new Date(timestamp).toLocaleTimeString()}
              </Text>
            )}

            {activeMode?.id === "sleep" &&
              rawData &&
              (rawData.mode === "sleep_detection" ||
                readingType === "sleep") && (
                <View className="gap-y-3">
                  {/* Sleep Quality */}
                  <Card variant="outlined">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                          <Moon size={24} color="white" fill="white" />
                        </View>
                        <View>
                          <Text className="text-lg font-hell-round-bold text-gray-900 ">
                            Sleep Quality
                          </Text>
                          <Text className="text-gray-600 text-sm font-hell">
                            {rawData.quality_rating === 1
                              ? "Good"
                              : rawData.quality_rating === 2
                              ? "Average"
                              : rawData.quality_rating === 3
                              ? "Poor"
                              : "None"}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-2xl font-hell-round-bold text-primary-accent ">
                        {rawData.sleep_quality_score ||
                          reading.sleep_quality_score ||
                          0}
                      </Text>
                    </View>
                  </Card>

                  {/* Sleep State */}
                  <Card variant="outlined">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-4">
                          <Activity size={24} color="white" />
                        </View>
                        <View>
                          <Text className="text-lg font-hell-round-bold text-gray-900 ">
                            Sleep State
                          </Text>
                          <Text className="text-gray-600 text-sm font-hell">
                            {rawData.in_bed === 1 ? "In Bed" : "Out of Bed"}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-lg font-hell-round-bold text-gray-900 ">
                        {rawData.comprehensive?.sleep_state === 0
                          ? "Deep Sleep"
                          : rawData.comprehensive?.sleep_state === 1
                          ? "Light Sleep"
                          : rawData.comprehensive?.sleep_state === 2
                          ? "Awake"
                          : rawData.sleep_status === 0
                          ? "Deep Sleep"
                          : rawData.sleep_status === 1
                          ? "Light Sleep"
                          : rawData.sleep_status === 2
                          ? "Awake"
                          : "None"}
                      </Text>
                    </View>
                  </Card>

                  {/* Sleep Duration */}
                  <Card variant="outlined">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 bg-success rounded-xl items-center justify-center mr-4">
                          <Heart size={24} color="white" />
                        </View>
                        <View>
                          <Text className="text-lg font-hell-round-bold text-gray-900 ">
                            Sleep Duration
                          </Text>
                          <Text className="text-gray-600 text-sm font-hell">
                            Deep: {rawData.deep_sleep_duration || 0}min
                          </Text>
                        </View>
                      </View>
                      <Text className="text-lg font-hell-round-bold text-gray-900 ">
                        {rawData.awake_duration || 0}min awake
                      </Text>
                    </View>
                  </Card>
                </View>
              )}

            {activeMode?.id === "fall" &&
              rawData &&
              (rawData.mode === "fall_detection" || readingType === "fall") && (
                <View className="gap-y-3">
                  {/* Fall Status */}
                  <Card variant="outlined">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View
                          className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                            rawData.fall_status === 1 ||
                            reading.is_fall_detected
                              ? "bg-red-500"
                              : "bg-green-500"
                          }`}
                        >
                          <Shield size={24} color="white" fill="white" />
                        </View>
                        <View>
                          <Text className="text-lg font-hell-round-bold text-gray-900 ">
                            Fall Status
                          </Text>
                          <Text className="text-gray-600 text-sm font-hell">
                            {rawData.presence === 1 ||
                            (reading && reading.is_person_detected)
                              ? "Person Present"
                              : "No Person"}
                          </Text>
                        </View>
                      </View>
                      <Text
                        className={`text-lg font-hell-round-bold ${
                          rawData.fall_status === 1 ||
                          (reading && reading.is_fall_detected)
                            ? "text-red-500"
                            : "text-green-500"
                        }`}
                      >
                        {rawData.fall_status === 1 ||
                        (reading && reading.is_fall_detected)
                          ? "FALL DETECTED"
                          : "Safe"}
                      </Text>
                    </View>
                  </Card>

                  {/* Movement Status */}
                  <Card variant="outlined">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-4">
                          <Zap size={24} color="white" />
                        </View>
                        <View>
                          <Text className="text-lg font-hell-round-bold text-gray-900 ">
                            Movement Status
                          </Text>
                          <Text className="text-gray-600 text-sm font-hell">
                            Motion Level: {rawData.motion || 0}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-lg font-hell-round-bold text-gray-900 ">
                        {rawData.motion === 0
                          ? "None"
                          : rawData.motion === 1
                          ? "Still"
                          : "Active"}
                      </Text>
                    </View>
                  </Card>

                  {/* Body Movement */}
                  <Card variant="outlined">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                          <Activity size={24} color="white" />
                        </View>
                        <View>
                          <Text className="text-lg font-hell-round-bold text-gray-900 ">
                            Body Movement
                          </Text>
                          <Text className="text-gray-600 text-sm font-hell">
                            Range: {rawData.body_movement || 0}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-lg font-hell-round-bold text-gray-900 ">
                        {reading && reading.is_movement_detected
                          ? "Detected"
                          : "None"}
                      </Text>
                    </View>
                  </Card>
                </View>
              )}

            {reading && !rawData && (
              <Card variant="outlined" className="mb-6">
                <View className="p-4">
                  <Text className="text-gray-600 font-hell">
                    No sensor data available yet
                  </Text>
                  <Text className="text-gray-500 text-sm font-hell mt-2">
                    Waiting for sensor readings...
                  </Text>
                  <Text className="text-gray-400 text-xs font-hell mt-2">
                    Reading ID: {reading.id} | Type: {reading.reading_type}
                  </Text>
                </View>
              </Card>
            )}

            {!reading && !readingLoading && !readingError && (
              <Card variant="outlined" className="mb-6">
                <View className="p-4">
                  <Text className="text-gray-600 font-hell">
                    No readings found
                  </Text>
                  <Text className="text-gray-500 text-sm font-hell mt-2">
                    Make sure the backend is running and receiving data from
                    ESP32
                  </Text>
                </View>
              </Card>
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
