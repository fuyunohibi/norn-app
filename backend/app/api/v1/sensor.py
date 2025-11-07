import json
import logging
from typing import Optional, Union

from app.models.sensor import FallDetectionData, SleepDetectionData
from app.services.ml_service import ml_service
from app.services.sleep_ml_service import sleep_ml_service
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
    For fall detection, ML validation is performed before raising alerts.
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
        
        # Initialize ML prediction result
        ml_prediction = None
        
        # For fall detection mode, ALWAYS use ML to detect falls
        # (sensor fall_status is unreliable, so we use ML as primary detector)
        if data_dict.get("mode") == "fall_detection":
            logger.info("🔍 Analyzing fall detection data with ML model...")
            
            # Run ML prediction on every data point
            is_real_fall, confidence, analysis = ml_service.predict_fall(data_dict)
            
            ml_prediction = {
                "is_real_fall": is_real_fall,
                "confidence": confidence,
                "analysis": analysis
            }
            
            logger.info(f"🤖 ML Detection Result:")
            logger.info(f"   Fall Detected: {is_real_fall}")
            logger.info(f"   Confidence: {confidence:.2%}")
            logger.info(f"   Pattern: {analysis.get('pattern', 'unknown')}")
            logger.info(f"   Body Movement: {analysis.get('movement_max', 'N/A')}")
            logger.info(f"   Dwell Time: {analysis.get('current_dwell_time', 'N/A')}s")
            
            # Set fall_status based on ML prediction (ML is the primary detector)
            data_dict["fall_status"] = 1 if is_real_fall else 0
            data_dict["ml_detected"] = True
            data_dict["ml_confidence"] = confidence
            data_dict["ml_analysis"] = analysis
        
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


@router.post("/train-model")
async def train_fall_detection_model(
    background_tasks: BackgroundTasks,
    limit: int = 1000
):
    """
    Train the fall detection ML model using historical data from Supabase
    
    This endpoint fetches historical fall detection readings and trains the model.
    Training is performed in the background to avoid timeout.
    
    Args:
        limit: Maximum number of readings to use for training (default: 1000)
    """
    from app.services.model_trainer import trainer
    
    logger.info(f"🎓 Model training requested with limit={limit}")
    
    # Run training in background
    background_tasks.add_task(
        trainer.train_from_database,
        limit=limit,
        labeled_data=None
    )
    
    return {
        "status": "success",
        "message": f"Model training started in background with up to {limit} samples",
        "note": "Training may take several minutes. Check server logs for progress."
    }


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
    
    ML is always active for both fall detection and sleep monitoring.
    """
    fall_model_trained = hasattr(ml_service.model, 'classes_') if ml_service.model else False
    sleep_quality_trained = hasattr(sleep_ml_service.quality_model, 'n_features_in_') if sleep_ml_service.quality_model else False
    sleep_stage_trained = hasattr(sleep_ml_service.stage_model, 'classes_') if sleep_ml_service.stage_model else False
    
    return {
        "status": "success",
        "fall_detection": {
            "model_trained": fall_model_trained,
            "model_path": ml_service.model_path,
            "window_size": ml_service.window_size,
            "buffer_size": len(ml_service.data_buffer),
        },
        "sleep_monitoring": {
            "quality_model_trained": sleep_quality_trained,
            "stage_model_trained": sleep_stage_trained,
            "model_path": sleep_ml_service.model_path,
            "window_size": sleep_ml_service.window_size,
            "buffer_size": len(sleep_ml_service.data_buffer),
        },
        "note": "ML is active for both fall detection and sleep monitoring."
    }


@router.get("/ml-validated-falls")
async def get_ml_validated_falls(
    user_id: Optional[str] = None,
    limit: int = 50
):
    """
    Get fall detections that have been validated by the ML model
    
    This returns only the falls that went through ML validation,
    along with confidence scores and pattern analysis.
    
    Args:
        user_id: Optional user ID to filter results
        limit: Maximum number of results to return (default: 50)
    """
    try:
        falls = await supabase_service.get_ml_validated_falls(user_id, limit)
        return {
            "status": "success",
            "count": len(falls),
            "falls": falls
        }
    except Exception as e:
        logger.error(f"❌ Error retrieving ML-validated falls: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving data: {str(e)}")


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

