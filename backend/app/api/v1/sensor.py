import logging

from app.models.sensor import ActivityEventData, IMUAlertData
from app.services.monitoring_services import activity_monitoring_service
from app.services.supabase_service import supabase_service
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

logger = logging.getLogger(__name__)

if supabase_service is None:
    logger.error("Supabase service is not initialized! Check your configuration.")

router = APIRouter()


@router.post("/activity")
async def receive_activity_event(
    data: ActivityEventData,
    background_tasks: BackgroundTasks,
    user_id: str = Query(default="0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"),
):
    """
    Receive activity change event from ESP32.
    ESP32 sends only when the activity state changes (e.g. walk -> standing -> sitting).
    """
    try:
        return activity_monitoring_service.enqueue_activity_event(
            background_tasks,
            user_id=user_id,
            data=data,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.error("Error processing activity event: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error processing activity event") from e


@router.get("/activity/statistics")
async def get_activity_statistics(
    period: str = Query(..., description="One of: today, 7d, 30d"),
    user_id: str = Query(default="0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"),
):
    """
    Get activity statistics for the given period.
    Returns time spent and count per activity (walking, standing, sitting, etc.).
    """
    try:
        return activity_monitoring_service.get_activity_statistics(user_id=user_id, period=period)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.error("Error fetching activity statistics: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching activity statistics") from e


@router.get("/imu/status")
async def get_imu_live_status(
    user_id: str = Query(default="0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"),
    device_id: Optional[str] = Query(
        default=None,
        description="Optional filter, e.g. esp32-imu-001",
    ),
    stale_seconds: int = Query(
        default=90,
        ge=15,
        le=600,
        description="If no row newer than this, wearable is considered off/unreachable.",
    ),
):
    """
    Last row in ``activity_events`` (including heartbeat ``ping``) indicates the device is powered.
    Latest non-``ping`` row is the last reported activity class.
    """
    try:
        return activity_monitoring_service.get_imu_live_status(
            user_id=user_id,
            device_id=device_id,
            stale_seconds=stale_seconds,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.error("Error fetching IMU status: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching IMU status") from e


@router.post("/imu/alert")
async def receive_imu_alert(
    data: IMUAlertData,
    background_tasks: BackgroundTasks,
    user_id: str = Query(default="0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"),
):
    """
    Receive IMU-based alert from ESP32 when on-device ML reports a critical activity label.

    Critical labels: ``f`` (falling), ``af`` (after fall), ``nf`` (unstable / near fall).
    """
    try:
        return activity_monitoring_service.enqueue_imu_alert(
            background_tasks,
            user_id=user_id,
            data=data,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.error("Error processing IMU alert: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing IMU alert: {e}") from e

