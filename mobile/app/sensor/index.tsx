import React, { useMemo } from "react";
import { StackScreenScaffold } from "../../components/layout";
import { SensorConnectionCard } from "../../components/sensor/sensor-connection-card";
import { SectionHeading } from "../../components/ui/section-heading";
import { useAuth } from "../../contexts/auth-context";
import { useImuWearableStatus } from "../../hooks/useImuWearableStatus";
import { imuLiveActivityHeadlineOnline } from "../../utils/imu-activity";

export default function SensorScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const showSensorSignedIn = Boolean(userId);

  const {
    data: imuStatus,
    isLoading: imuStatusLoading,
    error: imuStatusError,
  } = useImuWearableStatus(userId);

  const imuStatusErrorBool = Boolean(imuStatusError);

  const wearableStatusTitle = useMemo(() => {
    if (!showSensorSignedIn) return "Sign in required";
    if (imuStatusLoading) return "Checking status…";
    if (imuStatusErrorBool) return "Status unavailable";
    return imuStatus?.online ? "Clip online" : "Clip offline";
  }, [showSensorSignedIn, imuStatusLoading, imuStatusErrorBool, imuStatus?.online]);

  const wearableStatusSubtitle = useMemo(() => {
    if (!showSensorSignedIn) return "Sign in to see whether your clip is reporting.";
    if (imuStatusLoading) return "Loading the latest reading from your wearable.";
    if (imuStatusErrorBool) return "We could not reach the service. Check your connection.";
    return imuStatus?.online
      ? "Your clip has reported recently (within about the last 90 seconds)."
      : "No recent signal from your clip. It may be off, out of range, or idle.";
  }, [showSensorSignedIn, imuStatusLoading, imuStatusErrorBool, imuStatus?.online]);

  const sensorStatusHint = useMemo(() => {
    if (!showSensorSignedIn || !imuStatusError) return null;
    const msg =
      imuStatusError instanceof Error ? imuStatusError.message : String(imuStatusError);
    if (
      msg.includes("Network request failed") ||
      msg.includes("Failed to fetch") ||
      msg.includes("timed out")
    ) {
      return "Check Wi‑Fi and EXPO_PUBLIC_API_URL, or rely on cloud sync if configured.";
    }
    return msg;
  }, [showSensorSignedIn, imuStatusError]);

  const lastSignalLine = useMemo(() => {
    if (!imuStatus?.last_seen_at) return null;
    let s = `Last signal: ${new Date(imuStatus.last_seen_at).toLocaleString()}`;
    if (typeof imuStatus.age_seconds === "number") {
      s += ` (${imuStatus.age_seconds}s ago)`;
    }
    return s;
  }, [imuStatus?.last_seen_at, imuStatus?.age_seconds]);

  const activityHeadline =
    showSensorSignedIn &&
    !imuStatusLoading &&
    !imuStatusErrorBool &&
    imuStatus?.online
      ? imuLiveActivityHeadlineOnline(imuStatus)
      : null;

  return (
    <StackScreenScaffold
      hero={{
        title: "Clip & sensor",
        subtitle: "See whether your NORN clip is connected and what it last reported.",
        backChevronStrokeWidth: 3,
      }}
    >
      <SectionHeading
        eyebrow="Connection"
        title="Wearable status"
        description="Live updates when your clip checks in with NORN."
      />

      <SensorConnectionCard
        signedIn={showSensorSignedIn}
        loading={Boolean(showSensorSignedIn && imuStatusLoading)}
        error={Boolean(showSensorSignedIn && imuStatusErrorBool)}
        online={imuStatus?.online}
        title={wearableStatusTitle}
        subtitle={wearableStatusSubtitle}
        hint={sensorStatusHint}
        activityHeadline={activityHeadline}
        lastSignalLine={lastSignalLine}
      />
    </StackScreenScaffold>
  );
}
