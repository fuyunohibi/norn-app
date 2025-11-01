from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Union, Optional
from app.models.sensor import SleepDetectionData, FallDetectionData
from app.services.supabase_service import supabase_service

router = APIRouter()


@router.post("/data")
async def receive_sensor_data(
    data: Union[SleepDetectionData, FallDetectionData],
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = None
):
    """
    Receive sensor data from ESP32
    
    This endpoint is called by the ESP32 device every second with sensor readings.
    Data is stored in Supabase and checked for alert conditions.
    """
    try:
        # Store data in background
        data_dict = data.model_dump()
        background_tasks.add_task(
            supabase_service.store_sensor_data,
            data_dict,
            user_id
        )
        
        # Check for alerts
        alerts = await supabase_service.check_alerts(data_dict)
        
        return {
            "status": "success",
            "message": "Sensor data received",
            "alerts": alerts if alerts else None
        }
    
    except Exception as e:
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

