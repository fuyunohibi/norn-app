"""
Application service for IMU activity ingestion and critical-activity (IMU) alerts.

Routers stay thin; business rules and Supabase scheduling live here for tests and thesis structure.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple

from fastapi import BackgroundTasks

from app.models.sensor import ActivityEventData, IMUAlertData

logger = logging.getLogger(__name__)


class ActivityMonitoringService:
    """Coordinates activity events and IMU-derived alerts against Supabase."""

    def __init__(self, supabase_service: Any) -> None:
        self._db = supabase_service

    def _require_db(self) -> None:
        if self._db is None:
            raise RuntimeError("Database service is not configured")

    def enqueue_activity_event(
        self,
        background_tasks: BackgroundTasks,
        *,
        user_id: str,
        data: ActivityEventData,
    ) -> Dict[str, Any]:
        """Validate payload and schedule persistence of one activity change event."""
        self._require_db()
        activity = data.activity.strip().lower()
        background_tasks.add_task(
            self._db.store_activity_event,
            user_id=user_id,
            device_id=data.device_id,
            activity=activity,
            timestamp_device=data.timestamp,
            extras=data.extras,
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
        prediction = data_dict.get("prediction", "")
        device_id = data_dict.get("device_id", "unknown")

        logger.info("IMU alert received device=%s prediction=%s user=%s", device_id, prediction, user_id)

        alert_type = "fall"
        severity = "high"
        title = "Activity Alert"
        message = f"Detected: {prediction}"

        if prediction == "f":
            alert_type = "fall"
            severity = "critical"
            title = "Fall Detected!"
            message = (
                "A fall has been detected by the IMU sensor. Please check on the user immediately."
            )
            logger.warning("CRITICAL: fall prediction (f)")
        elif prediction == "af":
            alert_type = "fall"
            severity = "critical"
            title = "Person on Floor After Fall"
            message = (
                "The user appears to be on the floor after a fall. Immediate assistance may be required."
            )
            logger.warning("CRITICAL: after fall (af)")
        elif prediction == "nf":
            alert_type = "fall_risk"
            severity = "high"
            title = "Unstable Standing Detected"
            message = (
                "The user appears to be standing unsteadily. They may be at risk of falling."
            )
            logger.warning("HIGH: unstable standing (nf)")
        else:
            logger.info("Non-critical prediction: %s", prediction)
            return (
                {
                    "status": "success",
                    "message": f"Prediction logged (non-critical): {prediction}",
                    "alert_created": False,
                },
                None,
            )

        inner: Dict[str, Any] = {
            "source": "imu",
            "device_id": device_id,
            "prediction": prediction,
            "prediction_idx": data_dict.get("prediction_idx"),
            "timestamp_ms": data_dict.get("timestamp"),
            "ml_detected": True,
        }
        if data_dict.get("confidence") is not None:
            inner["confidence"] = data_dict.get("confidence")
        if data_dict.get("features") is not None:
            inner["features"] = data_dict.get("features")

        alert_data: Dict[str, Any] = {
            "user_id": user_id,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "message": message,
            "alert_data": inner,
        }

        return (
            {
                "status": "success",
                "message": f"Alert created: {title}",
                "alert_created": True,
                "alert_type": alert_type,
                "severity": severity,
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
            background_tasks.add_task(self._db.create_alert, alert_data)
        return body
