"""
Application service for IMU activity ingestion and critical-activity (IMU) alerts.

Routers stay thin; business rules and Supabase scheduling live here for tests and thesis structure.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple

from app.models.sensor import ActivityEventData, IMUAlertData
from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)

# Default matches GET /sensor/imu/status stale_seconds.
_DEFAULT_ACTIVITY_STALE_SECONDS = 90

_CRITICAL_IMU_PREDICTIONS = frozenset({"f", "af", "nf"})


def normalize_imu_activity_code(raw: str) -> str:
    """Map firmware / mock labels to short thesis codes (w, st, si, r, f, af, nf, ping)."""
    a = (raw or "").strip().lower()
    if not a:
        return ""
    if a == "ping":
        return "ping"
    long_to_short: Dict[str, str] = {
        "walking": "w",
        "standing": "st",
        "sitting": "si",
        "running": "r",
        "falling": "f",
        "after_fall": "af",
        "after fall": "af",
        "unstable_standing": "nf",
        "unstable": "nf",
    }
    return long_to_short.get(a, a)


def activity_value_for_storage(raw: str) -> str:
    """Canonical activity string stored on activity_events rows."""
    n = normalize_imu_activity_code(raw)
    if n:
        return n
    return (raw or "").strip().lower() or "unknown"


def build_imu_critical_alert_row(
    user_id: str,
    device_id: str,
    prediction: str,
    *,
    timestamp_ms: Optional[int] = None,
    source: str,
    extras: Optional[Dict[str, Any]] = None,
    confidence: Optional[float] = None,
    prediction_idx: Optional[int] = None,
    features: Optional[Any] = None,
) -> Optional[Dict[str, Any]]:
    """Build alerts row dict for IMU classes f, af, nf; otherwise None."""
    pred = (prediction or "").strip().lower()
    if pred not in _CRITICAL_IMU_PREDICTIONS:
        return None

    alert_type = "fall"
    severity = "high"
    title = "Activity Alert"
    message = f"Detected: {pred}"

    if pred == "f":
        alert_type = "fall"
        severity = "critical"
        title = "Fall Detected!"
        message = (
            "A fall has been detected by the IMU sensor. Please check on the user immediately."
        )
        logger.warning("CRITICAL: fall prediction (f)")
    elif pred == "af":
        alert_type = "fall"
        severity = "critical"
        title = "Person on Floor After Fall"
        message = (
            "The user appears to be on the floor after a fall. Immediate assistance may be required."
        )
        logger.warning("CRITICAL: after fall (af)")
    elif pred == "nf":
        alert_type = "fall_risk"
        severity = "high"
        title = "Unstable Standing Detected"
        message = (
            "The user appears to be standing unsteadily. They may be at risk of falling."
        )
        logger.warning("HIGH: unstable standing (nf)")

    inner: Dict[str, Any] = {
        "source": source,
        "device_id": device_id,
        "prediction": pred,
        "ml_detected": True,
    }
    if timestamp_ms is not None:
        inner["timestamp_ms"] = timestamp_ms
    if prediction_idx is not None:
        inner["prediction_idx"] = prediction_idx
    if confidence is not None:
        inner["confidence"] = confidence
    if features is not None:
        inner["features"] = features
    if extras:
        inner["event_extras"] = extras

    return {
        "user_id": user_id,
        "alert_type": alert_type,
        "severity": severity,
        "title": title,
        "message": message,
        "alert_data": inner,
    }


class ActivityMonitoringService:
    """Coordinates activity events and IMU-derived alerts against Supabase."""

    def __init__(self, supabase_service: Any) -> None:
        self._db = supabase_service

    def _require_db(self) -> None:
        if self._db is None:
            raise RuntimeError("Database service is not configured")

    async def _create_imu_class_alert_if_needed(self, alert_data: Dict[str, Any]) -> None:
        """Persist fall / fall_risk row unless an equivalent alert was just created."""
        self._require_db()
        inner = alert_data.get("alert_data")
        if not isinstance(inner, dict):
            inner = {}
        user_id = alert_data.get("user_id")
        pred = str(inner.get("prediction") or "")
        dev = inner.get("device_id")
        if self._db.has_recent_imu_prediction_alert(user_id, dev, pred, 60):
            logger.info(
                "Skipping duplicate IMU-class alert prediction=%s device=%s",
                pred,
                dev,
            )
            return
        await self._db.create_alert(alert_data)

    async def _run_activity_event_pipeline(
        self,
        *,
        user_id: str,
        device_id: Optional[str],
        activity_raw: str,
        timestamp_device: Optional[int],
        extras: Optional[Dict[str, Any]],
        stale_seconds: int,
    ) -> None:
        """
        Store activity_events row, then optional alerts (critical class + clip back online).

        Online recovery uses the same stale window as /sensor/imu/status so behavior matches the app.
        """
        self._require_db()
        db = self._db
        status_before = db.get_imu_live_status(
            user_id,
            device_id=device_id,
            stale_seconds=stale_seconds,
        )
        was_online = bool(status_before.get("online"))

        stored_activity = activity_value_for_storage(activity_raw)
        await db.store_activity_event(
            user_id=user_id,
            device_id=device_id,
            activity=stored_activity,
            timestamp_device=timestamp_device,
            extras=extras,
        )

        code = normalize_imu_activity_code(activity_raw)
        dev = (device_id or "").strip() or "unknown"

        if code in _CRITICAL_IMU_PREDICTIONS:
            row = build_imu_critical_alert_row(
                user_id,
                dev,
                code,
                timestamp_ms=timestamp_device,
                source="activity_event",
                extras=extras,
            )
            if row is not None:
                await self._create_imu_class_alert_if_needed(row)

        if not was_online:
            if db.has_recent_device_online_alert(user_id, dev, 120):
                return
            await db.create_alert(
                {
                    "user_id": user_id,
                    "alert_type": "device_online",
                    "severity": "low",
                    "title": "Clip back online",
                    "message": "Your NORN clip is reporting again.",
                    "alert_data": {
                        "source": "activity_event",
                        "device_id": dev,
                        "reason": "recovered_after_gap",
                        "activity": stored_activity,
                    },
                }
            )

    def enqueue_activity_event(
        self,
        background_tasks: BackgroundTasks,
        *,
        user_id: str,
        data: ActivityEventData,
    ) -> Dict[str, Any]:
        """Validate payload and schedule persistence plus inbox alerts when appropriate."""
        self._require_db()
        background_tasks.add_task(
            self._run_activity_event_pipeline,
            user_id=user_id,
            device_id=data.device_id,
            activity_raw=data.activity,
            timestamp_device=data.timestamp,
            extras=data.extras,
            stale_seconds=_DEFAULT_ACTIVITY_STALE_SECONDS,
        )
        return {
            "status": "success",
            "message": "Activity event received",
            "activity": data.activity,
        }

    def get_activity_statistics(self, *, user_id: str, period: str) -> Dict[str, Any]:
        """Return wrapped statistics for a valid period (today | 7d | 30d)."""
        self._require_db()
        if period not in ("today", "7d", "30d"):
            raise ValueError("period must be one of: today, 7d, 30d")
        stats = self._db.get_activity_statistics(user_id=user_id, period=period)
        return {"status": "success", "statistics": stats}

    def get_imu_live_status(
        self,
        *,
        user_id: str,
        device_id: Optional[str] = None,
        stale_seconds: int = 90,
    ) -> Dict[str, Any]:
        """Mobile app: infer wearable on/off from last DB row (heartbeats use activity ``ping``)."""
        self._require_db()
        payload = self._db.get_imu_live_status(
            user_id,
            device_id=device_id,
            stale_seconds=stale_seconds,
        )
        out: Dict[str, Any] = {"status": "success"}
        out.update(payload)
        return out

    def process_imu_alert(
        self,
        user_id: str,
        data: IMUAlertData,
    ) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
        """
        Map IMU prediction to user-facing response and optional alert row for persistence.

        Returns:
            (http_body, alert_dict_or_none). If alert_dict is set, caller should
            schedule create_alert in a background task.
        """
        self._require_db()
        data_dict = data.model_dump()
        prediction_raw = data_dict.get("prediction", "")
        prediction = (prediction_raw or "").strip().lower()
        device_id = data_dict.get("device_id", "unknown")

        logger.info(
            "IMU alert received device=%s prediction=%s user=%s",
            device_id,
            prediction,
            user_id,
        )

        if prediction not in _CRITICAL_IMU_PREDICTIONS:
            logger.info("Non-critical prediction: %s", prediction_raw)
            return (
                {
                    "status": "success",
                    "message": f"Prediction logged (non-critical): {prediction_raw}",
                    "alert_created": False,
                },
                None,
            )

        alert_data = build_imu_critical_alert_row(
            user_id,
            device_id,
            prediction,
            timestamp_ms=data_dict.get("timestamp"),
            source="imu",
            extras=None,
            confidence=data_dict.get("confidence"),
            prediction_idx=data_dict.get("prediction_idx"),
            features=data_dict.get("features"),
        )
        assert alert_data is not None
        title = alert_data["title"]

        return (
            {
                "status": "success",
                "message": f"Alert created: {title}",
                "alert_created": True,
                "alert_type": alert_data["alert_type"],
                "severity": alert_data["severity"],
            },
            alert_data,
        )

    def enqueue_imu_alert(
        self,
        background_tasks: BackgroundTasks,
        *,
        user_id: str,
        data: IMUAlertData,
    ) -> Dict[str, Any]:
        """Full IMU alert flow: build response and optionally schedule create_alert."""
        body, alert_data = self.process_imu_alert(user_id, data)
        if alert_data is not None:
            background_tasks.add_task(self._create_imu_class_alert_if_needed, alert_data)
        return body
