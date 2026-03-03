import json
import logging
from typing import Optional

from app.models.sensor import IMUAlertData
from fastapi import Query
from app.services.supabase_service import supabase_service
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

# Set up logger
logger = logging.getLogger(__name__)

# Verify service is initialized
if supabase_service is None:
    logger.error("❌ Supabase service is not initialized! Check your configuration.")

router = APIRouter()

@router.post("/imu/alert")
async def receive_imu_alert(
    data: IMUAlertData,
    background_tasks: BackgroundTasks,
    user_id: str = Query(default="0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61")
):
    """
    Receive IMU-based fall detection alert from ESP32.
    
    This endpoint is called by the ESP32 when the on-device ML model
    detects a critical state (falling, after fall, or unstable standing).
    
    Critical labels that trigger alerts:
    - 'f' = falling (CRITICAL)
    - 'af' = after fall on floor (CRITICAL)
    - 'nf' = unstable standing / near fall (HIGH)
    
    Args:
        data: IMUAlertData with device_id, timestamp, prediction, etc.
        user_id: User ID to associate with the alert
    
    Returns:
        Alert acknowledgment with stored alert ID
    """
    try:
        data_dict = data.model_dump()
        prediction = data_dict.get("prediction", "")
        device_id = data_dict.get("device_id", "unknown")
        
        logger.info("=" * 60)
        logger.info("🚨 IMU FALL DETECTION ALERT RECEIVED")
        logger.info("=" * 60)
        logger.info(f"Device ID: {device_id}")
        logger.info(f"Prediction: {prediction}")
        logger.info(f"Timestamp: {data_dict.get('timestamp')}")
        logger.info(f"User ID: {user_id}")
        
        # Determine alert type and severity based on prediction
        alert_type = "fall"
        severity = "high"
        title = "Activity Alert"
        message = f"Detected: {prediction}"
        
        # Map predictions to alert details
        if prediction == "f":
            alert_type = "fall"
            severity = "critical"
            title = "Fall Detected!"
            message = "A fall has been detected by the IMU sensor. Please check on the user immediately."
            logger.warning("⚠️  CRITICAL: FALL DETECTED!")
        elif prediction == "af":
            alert_type = "fall"
            severity = "critical"
            title = "Person on Floor After Fall"
            message = "The user appears to be on the floor after a fall. Immediate assistance may be required."
            logger.warning("⚠️  CRITICAL: AFTER FALL ON FLOOR!")
        elif prediction == "nf":
            alert_type = "fall_risk"
            severity = "high"
            title = "Unstable Standing Detected"
            message = "The user appears to be standing unsteadily. They may be at risk of falling."
            logger.warning("⚠️  HIGH: UNSTABLE STANDING DETECTED!")
        else:
            # Non-critical prediction - log but don't create alert
            logger.info(f"Non-critical prediction received: {prediction}")
            return {
                "status": "success",
                "message": f"Prediction logged (non-critical): {prediction}",
                "alert_created": False
            }
        
        # Create alert in Supabase
        alert_data = {
            "user_id": user_id,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "message": message,
            "alert_data": {
                "source": "imu",
                "device_id": device_id,
                "prediction": prediction,
                "prediction_idx": data_dict.get("prediction_idx"),
                "timestamp_ms": data_dict.get("timestamp"),
                "ml_detected": True
            }
        }
        
        # Store alert in background
        background_tasks.add_task(
            supabase_service.create_alert,
            alert_data
        )
        
        logger.info(f"✓ Alert created: {alert_type} ({severity})")
        
        return {
            "status": "success",
            "message": f"Alert created: {title}",
            "alert_created": True,
            "alert_type": alert_type,
            "severity": severity
        }
        
    except Exception as e:
        logger.error(f"❌ Error processing IMU alert: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing IMU alert: {str(e)}")

