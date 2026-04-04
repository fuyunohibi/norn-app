import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from supabase import Client, create_client

logger = logging.getLogger(__name__)


class SupabaseService:
    """Service for interacting with Supabase database (alerts and activity events)."""

    def __init__(self):
        try:
            if not settings.SUPABASE_SERVICE_KEY:
                logger.error("❌ SUPABASE_SERVICE_KEY is not set!")
                raise ValueError("SUPABASE_SERVICE_KEY is required")

            if not settings.SUPABASE_SERVICE_KEY.startswith("eyJ"):
                logger.warning(
                    "⚠️  SUPABASE_SERVICE_KEY might not be a valid service_role key (should be a JWT token starting with 'eyJ')"
                )
                logger.warning(f"   Current key starts with: {settings.SUPABASE_SERVICE_KEY[:10]}...")
            else:
                logger.info("✅ Service role key format looks correct (JWT token)")

            logger.info("🔌 Initializing Supabase client...")
            self.client: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY,
            )
            logger.info("✅ Supabase client initialized successfully")
            logger.info(f"   URL: {settings.SUPABASE_URL}")
            logger.info(f"   Key type: service_role (first 20 chars: {settings.SUPABASE_SERVICE_KEY[:20]}...)")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {str(e)}")
            logger.error("   Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file")
            raise

    async def store_activity_event(
        self,
        user_id: str,
        device_id: Optional[str],
        activity: str,
        timestamp_device: Optional[int] = None,
        extras: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Store one activity change event from ESP32."""
        try:
            row: Dict[str, Any] = {
                "user_id": user_id,
                "device_id": device_id,
                "activity": activity,
                "timestamp_device": timestamp_device,
            }
            if extras:
                row["extras"] = extras
            result = self.client.table("activity_events").insert(row).execute()
            logger.debug(f"Activity event stored: {activity} for user {user_id}")
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error storing activity event: {e}")
            return None

    def get_activity_statistics(
        self,
        user_id: str,
        period: str,
    ) -> Dict[str, Any]:
        """
        Get activity statistics for a user over a time period.
        period: "today" | "7d" | "30d"
        Returns by_activity (count and total_seconds per activity), events list, and period info.
        """
        now = datetime.now(timezone.utc)
        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now
            period_label = "today"
        elif period == "7d":
            start = now - timedelta(days=7)
            end = now
            period_label = "last_7_days"
        elif period == "30d":
            start = now - timedelta(days=30)
            end = now
            period_label = "last_30_days"
        else:
            raise ValueError(f"Invalid period: {period}. Use 'today', '7d', or '30d'.")

        start_iso = start.isoformat()
        end_iso = end.isoformat()

        try:
            result = (
                self.client.table("activity_events")
                .select("id, activity, created_at")
                .eq("user_id", user_id)
                .gte("created_at", start_iso)
                .lte("created_at", end_iso)
                .order("created_at", desc=False)
                .execute()
            )
        except Exception as e:
            logger.error(f"Error fetching activity statistics: {e}")
            return {
                "period": period_label,
                "from": start_iso,
                "to": end_iso,
                "by_activity": {},
                "events": [],
                "error": str(e),
            }

        events_raw = result.data or []
        events = [
            e
            for e in events_raw
            if e.get("activity", "").strip().lower() != "ping"
        ]
        # Build by_activity: count of segments and total seconds per activity
        by_activity: Dict[str, Dict[str, Any]] = {}
        activity_labels: Dict[str, str] = {
            "w": "walking",
            "st": "standing",
            "si": "sitting",
            "r": "running",
            "f": "falling",
            "af": "after_fall",
            "nf": "unstable_standing",
        }

        for i, ev in enumerate(events):
            act = ev.get("activity", "").strip().lower()
            display_name = activity_labels.get(act, act or "unknown")
            if display_name not in by_activity:
                by_activity[display_name] = {"count": 0, "total_seconds": 0.0}
            by_activity[display_name]["count"] += 1

            # Duration = until next event or now
            try:
                created = ev.get("created_at")
                if created:
                    cur_start = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    if i + 1 < len(events):
                        next_created = events[i + 1].get("created_at")
                        if next_created:
                            cur_end = datetime.fromisoformat(next_created.replace("Z", "+00:00"))
                        else:
                            cur_end = now
                    else:
                        cur_end = now
                    dur = max(0, (cur_end - cur_start).total_seconds())
                    by_activity[display_name]["total_seconds"] += dur
            except Exception:
                pass

        # Build a simple events list for frontend (activity + created_at)
        events_list = [
            {
                "activity": activity_labels.get(e.get("activity", "").strip().lower(), e.get("activity", "")),
                "created_at": e.get("created_at"),
            }
            for e in events
        ]

        return {
            "period": period_label,
            "from": start_iso,
            "to": end_iso,
            "by_activity": by_activity,
            "events": events_list,
            "total_events": len(events),
        }

    def get_imu_live_status(
        self,
        user_id: str,
        device_id: Optional[str] = None,
        stale_seconds: int = 90,
    ) -> Dict[str, Any]:
        """
        Last event time (including heartbeat ``ping``) determines if the wearable is powered and online.
        Latest non-ping activity is the last reported movement class from the IMU.
        """
        activity_labels: Dict[str, str] = {
            "w": "Walking",
            "st": "Standing",
            "si": "Sitting",
            "r": "Running",
            "f": "Falling",
            "af": "After fall",
            "nf": "Unstable",
        }
        try:
            q = (
                self.client.table("activity_events")
                .select("activity, created_at, device_id")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(50)
            )
            if device_id:
                q = q.eq("device_id", device_id)
            result = q.execute()
            rows = result.data or []
        except Exception as e:
            logger.error("Error fetching IMU live status: %s", e)
            return {
                "online": False,
                "last_seen_at": None,
                "age_seconds": None,
                "activity_code": None,
                "activity_label": None,
                "device_id": device_id,
                "error": str(e),
            }

        if not rows:
            return {
                "online": False,
                "last_seen_at": None,
                "age_seconds": None,
                "activity_code": None,
                "activity_label": None,
                "device_id": device_id,
                "reason": "no_events",
            }

        now = datetime.now(timezone.utc)
        last_ts_str = rows[0].get("created_at")
        try:
            last_dt = datetime.fromisoformat(str(last_ts_str).replace("Z", "+00:00"))
            age_sec = max(0.0, (now - last_dt).total_seconds())
        except Exception:
            age_sec = float("inf")

        online = age_sec <= float(stale_seconds)

        last_activity_code: Optional[str] = None
        for r in rows:
            a = str(r.get("activity", "")).strip().lower()
            if a and a != "ping":
                last_activity_code = a
                break

        activity_label: Optional[str] = None
        if last_activity_code:
            activity_label = activity_labels.get(
                last_activity_code,
                last_activity_code,
            )

        return {
            "online": online,
            "last_seen_at": last_ts_str,
            "age_seconds": int(age_sec) if age_sec != float("inf") else None,
            "activity_code": last_activity_code,
            "activity_label": activity_label,
            "device_id": device_id or rows[0].get("device_id"),
            "reason": None,
        }

    async def create_alert(self, alert_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create a new alert in the database.
        
        Args:
            alert_data: Dictionary containing:
                - user_id: User ID to associate with alert
                - alert_type: Type of alert (fall, fall_risk, etc.)
                - severity: Alert severity (critical, high, medium, low)
                - title: Alert title
                - message: Alert message
                - alert_data: Additional data dictionary
        
        Returns:
            Created alert record or None if failed
        """
        try:
            inner = alert_data.get("alert_data") or {}
            source_device_id = None
            if isinstance(inner, dict):
                raw = inner.get("device_id")
                if isinstance(raw, str) and raw.strip():
                    source_device_id = raw.strip()

            row: Dict[str, Any] = {
                "user_id": alert_data.get("user_id"),
                "alert_type": alert_data.get("alert_type"),
                "severity": alert_data.get("severity", "high"),
                "title": alert_data.get("title"),
                "message": alert_data.get("message"),
                "alert_data": alert_data.get("alert_data", {}),
            }
            if source_device_id is not None:
                row["source_device_id"] = source_device_id

            result = self.client.table("alerts").insert(row).execute()
            
            logger.info(f"✅ Alert created: {alert_data.get('alert_type')} for user {alert_data.get('user_id')}")
            return result.data[0] if result.data else None

        except Exception as e:
            logger.error(f"❌ Error creating alert: {str(e)}")
            return None

    def get_alerts(
        self,
        user_id: str,
        limit: int = 50,
        is_read: Optional[bool] = None,
        is_resolved: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        """List alerts for a user, optionally filtered by is_read / is_resolved."""
        try:
            query = (
                self.client.table("alerts")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
            )
            if is_read is not None:
                if is_read is False:
                    # Unread = false or null (legacy / partial rows)
                    query = query.or_("is_read.is.null,is_read.eq.false")
                else:
                    query = query.eq("is_read", True)
            if is_resolved is not None:
                if is_resolved is False:
                    query = query.or_("is_resolved.is.null,is_resolved.eq.false")
                else:
                    query = query.eq("is_resolved", True)
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching alerts: {e}")
            return []

    def update_alert(
        self,
        alert_id: str,
        is_read: Optional[bool] = None,
        is_resolved: Optional[bool] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update an alert's is_read and/or is_resolved. Returns updated row or None."""
        try:
            payload: Dict[str, Any] = {}
            if is_read is not None:
                payload["is_read"] = is_read
            if is_resolved is not None:
                payload["is_resolved"] = is_resolved
                if is_resolved:
                    payload["resolved_at"] = datetime.now(timezone.utc).isoformat()
            if not payload:
                return None
            result = (
                self.client.table("alerts")
                .update(payload)
                .eq("id", alert_id)
                .execute()
            )
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating alert: {e}")
            return None


# Initialize service on module import
# This will fail fast if there's a configuration issue
try:
    supabase_service = SupabaseService()
except Exception as e:
    logger.error(f"❌ CRITICAL: Failed to initialize Supabase service: {str(e)}")
    logger.error("   The server will start but database operations will fail.")
    logger.error("   Please check your .env file and restart the server.")
    # Create a dummy service to prevent import errors
    supabase_service = None

