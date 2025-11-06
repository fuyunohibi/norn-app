import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings

from supabase import Client, create_client

# Set up logger
logger = logging.getLogger(__name__)


class SupabaseService:
    """Service for interacting with Supabase database"""
    
    def __init__(self):
        try:
            # Verify service_role key is being used (should start with 'eyJ' for JWT)
            if not settings.SUPABASE_SERVICE_KEY:
                logger.error("❌ SUPABASE_SERVICE_KEY is not set!")
                raise ValueError("SUPABASE_SERVICE_KEY is required")
            
            if not settings.SUPABASE_SERVICE_KEY.startswith('eyJ'):
                logger.warning("⚠️  SUPABASE_SERVICE_KEY might not be a valid service_role key (should be a JWT token starting with 'eyJ')")
                logger.warning(f"   Current key starts with: {settings.SUPABASE_SERVICE_KEY[:10]}...")
            else:
                logger.info("✅ Service role key format looks correct (JWT token)")
            
            logger.info("🔌 Initializing Supabase client...")
            self.client: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
            logger.info(f"✅ Supabase client initialized successfully")
            logger.info(f"   URL: {settings.SUPABASE_URL}")
            logger.info(f"   Key type: service_role (first 20 chars: {settings.SUPABASE_SERVICE_KEY[:20]}...)")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {str(e)}")
            logger.error("   Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file")
            raise
    
    async def store_sensor_data(self, data: Dict[str, Any], user_id: Optional[str] = None, device_id: Optional[str] = None):
        """
        Store sensor data in Supabase
        
        Args:
            data: Sensor data dictionary
            user_id: Optional user ID to associate with data
            device_id: Optional device ID to associate with data
        """
        # Determine reading type from mode
        mode = data.get("mode", "")
        if "sleep" in mode.lower():
            reading_type = "sleep"
        elif "fall" in mode.lower():
            reading_type = "fall"
        else:
            reading_type = "movement"
        
        # Convert timestamp to UTC-aware datetime
        # ESP32 sends seconds since boot (millis()/1000), not Unix timestamp
        # If timestamp is very small (< 1000000000), it's likely seconds since boot
        # In that case, use current time instead
        timestamp_value = data.get("timestamp")
        if timestamp_value:
            # If timestamp is less than year 2001 (Unix timestamp), it's probably seconds since boot
            if timestamp_value < 1000000000:
                logger.warning(f"⚠️  Timestamp {timestamp_value} appears to be seconds since boot, using current time instead")
                timestamp_dt = datetime.now(timezone.utc)
            else:
                timestamp_dt = datetime.fromtimestamp(timestamp_value, tz=timezone.utc)
        else:
            timestamp_dt = datetime.now(timezone.utc)
        
        # Build record according to schema
        record = {
            "user_id": user_id,
            "device_id": device_id,
            "reading_type": reading_type,
            "timestamp": timestamp_dt.isoformat(),
            "raw_data": data,  # Store full data as JSONB
        }
        
        # Map sleep-specific fields
        if reading_type == "sleep":
            # sleep_quality_score must be between 1-10 or NULL (database constraint)
            sleep_quality = data.get("sleep_quality_score")
            if sleep_quality and 1 <= sleep_quality <= 10:
                record["sleep_quality_score"] = sleep_quality
            else:
                # Set to NULL if invalid (0, negative, or > 10)
                record["sleep_quality_score"] = None
                if sleep_quality is not None:
                    logger.debug(f"⚠️  Invalid sleep_quality_score {sleep_quality}, setting to NULL (must be 1-10)")
            record["is_person_detected"] = data.get("in_bed", 0) > 0
            record["is_movement_detected"] = data.get("sleep_status", 0) > 0
        
        # Map fall-specific fields
        elif reading_type == "fall":
            record["is_fall_detected"] = data.get("fall_status", 0) > 0
            record["is_person_detected"] = data.get("presence", 0) > 0
            record["is_movement_detected"] = data.get("motion", 0) > 0
        
        # Log the processed record before inserting
        logger.info("💾 Attempting to store sensor data in Supabase:")
        logger.info(f"  Reading Type: {reading_type}")
        logger.info(f"  User ID: {user_id}")
        logger.info(f"  Device ID: {device_id}")
        logger.info(f"  Timestamp: {timestamp_dt.isoformat()}")
        logger.debug(f"  Full Record: {json.dumps(record, indent=2, default=str)}")
        
        try:
            result = self.client.table("sensor_readings").insert(record).execute()
            logger.info("✅ Successfully stored sensor data in Supabase")
            return result.data
        except Exception as e:
            error_str = str(e)
            logger.error(f"❌ Error storing sensor data in Supabase: {error_str}")
            logger.error(f"   Record that failed: {json.dumps(record, indent=2, default=str)}")
            
            # Provide helpful error messages
            if "42501" in error_str or "row-level security" in error_str.lower():
                logger.error("")
                logger.error("🔧 RLS POLICY ERROR DETECTED!")
                logger.error("   This means the RLS migration hasn't been applied yet.")
                logger.error("   Please run this SQL in Supabase SQL Editor:")
                logger.error("   File: mobile/supabase/migrations/20250910_000004_fix_rls_policies.sql")
                logger.error("")
            elif "401" in error_str or "unauthorized" in error_str.lower():
                logger.error("")
                logger.error("🔑 AUTHENTICATION ERROR DETECTED!")
                logger.error("   This might mean SUPABASE_SERVICE_KEY is incorrect.")
                logger.error("   Verify your .env file has the correct service_role key.")
                logger.error("   The key should start with 'eyJ' (it's a JWT token).")
                logger.error("")
            
            raise
    
    async def get_latest_readings(self, mode: str, user_id: Optional[str] = None, limit: int = 10):
        """
        Get latest sensor readings
        
        Args:
            mode: "sleep_detection" or "fall_detection"
            user_id: Optional user ID filter
            limit: Number of records to return
        """
        # Map mode to reading_type
        if "sleep" in mode.lower():
            reading_type = "sleep"
        elif "fall" in mode.lower():
            reading_type = "fall"
        else:
            reading_type = None
        
        query = self.client.table("sensor_readings").select("*").order("timestamp", desc=True).limit(limit)
        
        if reading_type:
            query = query.eq("reading_type", reading_type)
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        result = query.execute()
        return result.data
    
    async def check_alerts(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Check sensor data for alert conditions
        
        Args:
            data: Sensor data to check
            
        Returns:
            List of alert objects if any conditions are met
        """
        alerts = []
        
        # Fall detection alert
        if data["mode"] == "fall_detection" and data.get("fall_status", 0) > 0:
            if settings.FALL_ALERT_ENABLED:
                alerts.append({
                    "type": "fall_detected",
                    "severity": "critical",
                    "message": "Fall detected! Immediate attention required.",
                    "data": data
                })
        
        # Sleep quality alert
        if data["mode"] == "sleep_detection":
            quality_score = data.get("sleep_quality_score", 100)
            if quality_score < settings.SLEEP_QUALITY_THRESHOLD:
                alerts.append({
                    "type": "low_sleep_quality",
                    "severity": "medium",  # Changed from "warning" to "medium" (allowed: low, medium, high, critical)
                    "message": f"Low sleep quality detected: {quality_score}",
                    "data": data
                })
            
            # Abnormal struggle alert
            abnormal_struggle = data.get("abnormal_struggle", 0)
            if abnormal_struggle >= settings.ABNORMAL_STRUGGLE_THRESHOLD:
                alerts.append({
                    "type": "abnormal_struggle",
                    "severity": "medium",  # Changed from "warning" to "medium" (allowed: low, medium, high, critical)
                    "message": f"Abnormal struggle detected: {abnormal_struggle}",
                    "data": data
                })
        
        # Store alerts in database if any
        if alerts:
            for alert in alerts:
                try:
                    # Map alert type to schema values
                    alert_type_map = {
                        "fall_detected": "fall",
                        "low_sleep_quality": "no_movement",
                        "abnormal_struggle": "no_movement"
                    }
                    alert_type = alert_type_map.get(alert["type"], "no_movement")
                    
                    self.client.table("alerts").insert({
                        "user_id": None,  # Will be set if user_id is available
                        "device_id": None,  # Will be set if device_id is available
                        "alert_type": alert_type,
                        "severity": alert["severity"],
                        "title": alert.get("title", alert["type"].replace("_", " ").title()),
                        "message": alert["message"],
                        "alert_data": alert["data"]  # Use alert_data, not sensor_data
                    }).execute()
                except Exception as e:
                    print(f"Error storing alert: {str(e)}")
        
        return alerts


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

