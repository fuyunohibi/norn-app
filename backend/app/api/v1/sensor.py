import json
import logging
from typing import Optional, Union

from app.models.sensor import FallDetectionData, FallSampleData, SleepDetectionData
from app.services.esp32_service import esp32_service
from app.services.sleep_ml_service import sleep_ml_service
from app.services.supabase_service import supabase_service
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

# Set up logger
logger = logging.getLogger(__name__)

# Verify service is initialized
if supabase_service is None:
    logger.error("❌ Supabase service is not initialized! Check your configuration.")

router = APIRouter()


@router.post("/data")
async def receive_sensor_data(
    request: Request,
    data: Union[SleepDetectionData, FallDetectionData],
    background_tasks: BackgroundTasks,
    user_id: Optional[str] = "0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"
):
    """
    Receive sensor data from ESP32
    
    This endpoint is called by the ESP32 device every second with sensor readings.
    Data is stored in Supabase and checked for alert conditions.
    For fall detection, ML validation is performed before raising alerts.
    """
    try:
        # Update ESP32 endpoint if the device IP has changed
        client_host = request.client.host if request.client else None
        if client_host:
            esp32_service.update_base_url(client_host)

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
        
        # Initialize ML prediction result
        ml_prediction = None
        
        # For fall detection mode, use sensor's native fall detection (NO ML)
        # Trust the sensor's fall_state field directly
        if data_dict.get("mode") == "fall_detection":
            fall_state = data_dict.get("fall_state", 0)
            if fall_state == 1:
                logger.warning(f"⚠️  FALL DETECTED by sensor!")
                logger.info(f"   Existence: {data_dict.get('existence')}")
                logger.info(f"   Motion: {data_dict.get('motion')}")
                logger.info(f"   Body Move: {data_dict.get('body_move')}")
                logger.info(f"   Static Residency State: {data_dict.get('static_residency_state')}")
                logger.info(f"   Heart Rate: {data_dict.get('heart_rate_bpm')} bpm")
                logger.info(f"   Respiration Rate: {data_dict.get('respiration_rate_bpm')} bpm")
            
            # No ML processing - use sensor data directly
        
        # For sleep detection mode, just store data (NO real-time ML processing)
        # ML analysis happens later when user requests sleep summary
        elif data_dict.get("mode") == "sleep_detection":
            logger.debug("💾 Storing sleep data (ML analysis on-demand)")
            # Data will be stored and analyzed when user requests summary
        
        # Store data (with ML predictions if available)
        background_tasks.add_task(
            supabase_service.store_sensor_data,
            data_dict,
            user_id
        )
        
        # Check for alerts (now with ML-validated fall status)
        # Also check ML prediction directly for fall detection
        alerts = await supabase_service.check_alerts(data_dict, user_id, ml_prediction)
        
        if alerts:
            logger.info(f"⚠️  {len(alerts)} alert(s) detected")
            for alert in alerts:
                logger.info(f"  - {alert['type']}: {alert['message']}")
                # Add ML info to fall alerts
                if ml_prediction and alert['type'] == 'fall_detected':
                    alert['ml_validation'] = ml_prediction
        
        response = {
            "status": "success",
            "message": "Sensor data received",
            "alerts": alerts if alerts else None
        }
        
        # Include ML prediction in response for fall detection
        if ml_prediction:
            response["ml_prediction"] = ml_prediction
        
        return response
    
    except Exception as e:
        logger.error(f"❌ Error processing sensor data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing sensor data: {str(e)}")


@router.post("/fall-samples")
async def receive_fall_sample(
    data: FallSampleData,
    background_tasks: BackgroundTasks
):
    """
    Receive fall sample data for training data collection.
    
    This endpoint is used to collect labeled fall detection data
    for ML model training. Data is stored in the fall_samples table.
    
    The Arduino should send data in this format:
    {
        "timestamp": 12345,
        "existence": 1,
        "motion": 2,
        "body_move": 50,
        "seated_distance": 120,
        "motion_distance": 150,
        "fall_state": 0,
        "fall_break_height": 0,
        "static_residency_state": 0,
        "heart_rate_bpm": 72,
        "respiration_rate_bpm": 16,
        "label": "sitting_on_chair"  // optional, can be added later
    }
    """
    try:
        data_dict = data.model_dump()
        
        logger.info("=" * 60)
        logger.info("📥 RECEIVED FALL SAMPLE DATA")
        logger.info("=" * 60)
        logger.info(f"Timestamp: {data_dict.get('timestamp')}")
        logger.info(f"Fall State: {data_dict.get('fall_state')}")
        logger.info(f"Existence: {data_dict.get('existence')}")
        logger.info(f"Label: {data_dict.get('label', 'unlabeled')}")
        
        # Store in background
        background_tasks.add_task(
            supabase_service.store_fall_sample_direct,
            data_dict
        )
        
        return {
            "status": "success",
            "message": "Fall sample received",
            "timestamp": data_dict.get("timestamp"),
            "fall_state": data_dict.get("fall_state")
        }
        
    except Exception as e:
        logger.error(f"❌ Error storing fall sample: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error storing fall sample: {str(e)}")


@router.get("/fall-samples")
async def get_fall_samples(
    limit: int = 100,
    label: Optional[str] = None,
    fall_state: Optional[int] = None
):
    """
    Get fall sample data for review or export.
    
    Args:
        limit: Maximum number of samples to return (default: 100)
        label: Optional filter by label (e.g., 'falling', 'sitting_on_chair')
        fall_state: Optional filter by fall_state (0 or 1)
    """
    try:
        samples = await supabase_service.get_fall_samples(limit, label, fall_state)
        return {
            "status": "success",
            "count": len(samples),
            "samples": samples
        }
    except Exception as e:
        logger.error(f"❌ Error retrieving fall samples: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving fall samples: {str(e)}")


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




@router.post("/train-sleep-model")
async def train_sleep_model(
    background_tasks: BackgroundTasks,
    csv_path: str = "sleeps.csv"
):
    """
    Train the sleep ML model using WHOOP data from CSV
    
    This endpoint trains the sleep quality and stage classification models
    using WHOOP sleep data. Training is performed in the background.
    
    Args:
        csv_path: Path to WHOOP sleep CSV file (default: "sleeps.csv")
    """
    from app.services.sleep_model_trainer import sleep_trainer
    
    logger.info(f"🌙 Sleep model training requested with CSV: {csv_path}")
    
    # Run training in background
    background_tasks.add_task(
        sleep_trainer.train_from_whoop_csv,
        csv_path=csv_path
    )
    
    return {
        "status": "success",
        "message": f"Sleep model training started in background using {csv_path}",
        "note": "Training may take several minutes. Check server logs for progress."
    }


@router.get("/ml-status")
async def get_ml_status():
    """
    Get the current ML model status and statistics
    
    ML is only used for sleep monitoring (batch processing).
    Fall detection uses sensor's native detection.
    """
    sleep_quality_trained = hasattr(sleep_ml_service.quality_model, 'n_features_in_') if sleep_ml_service.quality_model else False
    sleep_stage_trained = hasattr(sleep_ml_service.stage_model, 'classes_') if sleep_ml_service.stage_model else False
    
    return {
        "status": "success",
        "fall_detection": {
            "type": "sensor_native",
            "note": "Uses sensor's built-in fall detection (no ML)"
        },
        "sleep_monitoring": {
            "quality_model_trained": sleep_quality_trained,
            "stage_model_trained": sleep_stage_trained,
            "model_path": sleep_ml_service.model_path,
            "window_size": sleep_ml_service.window_size,
            "buffer_size": len(sleep_ml_service.data_buffer),
        },
        "note": "ML is used only for sleep analysis (batch processing). Fall detection uses sensor's native detection."
    }




@router.get("/sleep-summary/{user_id}")
async def get_sleep_summary(
    user_id: str,
    date: Optional[str] = None
):
    """
    Get comprehensive sleep summary with ML analysis
    
    This endpoint analyzes a complete sleep session using ML to provide:
    - Overall sleep quality score
    - Sleep stage breakdown (Deep, Light, Awake)
    - Vital signs analysis
    - Sleep patterns and disturbances
    - Recommendations
    
    Args:
        user_id: User ID to get sleep data for
        date: Optional date (YYYY-MM-DD) to analyze. Defaults to previous night.
    
    Returns:
        Comprehensive sleep analysis report
    """
    from app.services.sleep_analysis_service import analyze_sleep_session
    
    try:
        logger.info(f"🌙 Sleep summary requested for user {user_id}, date: {date or 'latest'}")
        
        # Analyze the sleep session with ML
        summary = await analyze_sleep_session(user_id, date)
        
        if not summary:
            raise HTTPException(
                status_code=404,
                detail="No sleep data found for the specified date"
            )
        
        return {
            "status": "success",
            "summary": summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating sleep summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating sleep summary: {str(e)}")

