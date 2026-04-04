"""Alerts API: list and update is_read / is_resolved."""

import logging
from typing import Optional

from app.services.monitoring_services import alert_application_service
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel


class AlertUpdateBody(BaseModel):
    """Body for PATCH /alerts/{id}: set is_read and/or is_resolved."""

    is_read: Optional[bool] = None
    is_resolved: Optional[bool] = None

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def list_alerts(
    user_id: str = Query(default="e3620158-e37a-4d4f-b851-a14fd0e53dc3"),
    limit: int = Query(default=50, ge=1, le=200),
    is_read: Optional[bool] = Query(default=None, description="Filter by read status"),
    is_resolved: Optional[bool] = Query(default=None, description="Filter by resolved status"),
):
    """
    List alerts for a user. Optional filters: is_read, is_resolved.
    Frontend can use this to show the alert list and get alert IDs for PATCH.
    """
    try:
        return alert_application_service.list_alerts(
            user_id=user_id,
            limit=limit,
            is_read=is_read,
            is_resolved=is_resolved,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error listing alerts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error listing alerts")


@router.patch("/{alert_id}")
async def update_alert(alert_id: str, body: AlertUpdateBody):
    """
    Update an alert's is_read and/or is_resolved.
    Body: { "is_read": true } and/or { "is_resolved": true }.
    Frontend calls this when user marks alert as read or resolved.
    """
    if body.is_read is None and body.is_resolved is None:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one of: is_read, is_resolved",
        )
    try:
        updated = alert_application_service.patch_alert(
            alert_id=alert_id,
            is_read=body.is_read,
            is_resolved=body.is_resolved,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "success", "alert": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating alert: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating alert")
