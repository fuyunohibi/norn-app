from supabase import create_client, Client
from app.core.config import settings
from typing import Dict, Any, List, Optional
from datetime import datetime


class SupabaseService:
    """Service for interacting with Supabase database"""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY
        )
    
    async def store_sensor_data(self, data: Dict[str, Any], user_id: Optional[str] = None):
        """
        Store sensor data in Supabase
        
        Args:
            data: Sensor data dictionary
            user_id: Optional user ID to associate with data
        """
        table_name = "sensor_readings" if data["mode"] == "fall_detection" else "sleep_readings"
        
        record = {
            "user_id": user_id,
            "mode": data["mode"],
            "data": data,
            "timestamp": datetime.fromtimestamp(data["timestamp"]),
            "created_at": datetime.utcnow()
        }
        
        try:
            result = self.client.table(table_name).insert(record).execute()
            return result.data
        except Exception as e:
            print(f"Error storing sensor data: {str(e)}")
            raise
    
    async def get_latest_readings(self, mode: str, user_id: Optional[str] = None, limit: int = 10):
        """
        Get latest sensor readings
        
        Args:
            mode: "sleep_detection" or "fall_detection"
            user_id: Optional user ID filter
            limit: Number of records to return
        """
        table_name = "sensor_readings" if mode == "fall_detection" else "sleep_readings"
        
        query = self.client.table(table_name).select("*").order("created_at", desc=True).limit(limit)
        
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
                    "severity": "warning",
                    "message": f"Low sleep quality detected: {quality_score}",
                    "data": data
                })
            
            # Abnormal struggle alert
            abnormal_struggle = data.get("abnormal_struggle", 0)
            if abnormal_struggle >= settings.ABNORMAL_STRUGGLE_THRESHOLD:
                alerts.append({
                    "type": "abnormal_struggle",
                    "severity": "warning",
                    "message": f"Abnormal struggle detected: {abnormal_struggle}",
                    "data": data
                })
        
        # Store alerts in database if any
        if alerts:
            for alert in alerts:
                try:
                    self.client.table("alerts").insert({
                        "type": alert["type"],
                        "severity": alert["severity"],
                        "message": alert["message"],
                        "sensor_data": alert["data"],
                        "created_at": datetime.utcnow()
                    }).execute()
                except Exception as e:
                    print(f"Error storing alert: {str(e)}")
        
        return alerts


supabase_service = SupabaseService()

