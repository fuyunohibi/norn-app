import json
import logging
from typing import Optional, Union

from app.models.sensor import FallDetectionData, SleepDetectionData
from app.services.supabase_service import supabase_service
from fastapi import APIRouter, BackgroundTasks, HTTPException

# Set up logger
logger = logging.getLogger(__name__)

# Verify service is initialized
if supabase_service is None:
    logger.error("❌ Supabase service is not initialized! Check your configuration.")

router = APIRouter()


@router.post("/data")
async def receive_sensor_data(
    data: Union[SleepDetectionData, FallDetectionData],
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = "0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"
):
    """
    Receive sensor data from ESP32
    
    This endpoint is called by the ESP32 device every second with sensor readings.
    Data is stored in Supabase and checked for alert conditions.
    """
    try:
        # Convert to dict and log the received data
        data_dict = data.model_dump()
        
        # Log the raw data received from ESP32
        logger.info("=" * 80)
        logger.info("📥 RECEIVED SENSOR DATA FROM ESP32")
        logger.info("=" * 80)
        logger.info(f"Mode: {data_dict.get('mode', 'unknown')}")
        logger.info(f"Timestamp: {data_dict.get('timestamp', 'N/A')}")
        logger.info(f"User ID: {user_id}")
        logger.info("\n📊 Full Data Payload:")
        logger.info(json.dumps(data_dict, indent=2, default=str))
        logger.info("=" * 80)
        
        # Store data in background
        background_tasks.add_task(
            supabase_service.store_sensor_data,
            data_dict,
            user_id
        )
        
        # Check for alerts
        alerts = await supabase_service.check_alerts(data_dict)
        
        if alerts:
            logger.info(f"⚠️  {len(alerts)} alert(s) detected")
            for alert in alerts:
                logger.info(f"  - {alert['type']}: {alert['message']}")
        
        return {
            "status": "success",
            "message": "Sensor data received",
            "alerts": alerts if alerts else None
        }
    
    except Exception as e:
        logger.error(f"❌ Error processing sensor data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing sensor data: {str(e)}")


@router.get("/readings/{mode}")
async def get_readings(mode: str, user_id: Optional[str] = None, limit: int = 10):
    """
    Get latest sensor readings
    
    Args:
        mode: "sleep_detection" or "fall_detection"
        user_id: Optional user ID to filter readings
        limit: Number of readings to return (default: 10)
    """
    if mode not in ["sleep_detection", "fall_detection"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'sleep_detection' or 'fall_detection'")
    
    try:
        readings = await supabase_service.get_latest_readings(mode, user_id, limit)
        return {
            "status": "success",
            "mode": mode,
            "count": len(readings),
            "readings": readings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving readings: {str(e)}")

