"""Alerts API: list and update is_read / is_resolved."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.supabase_service import supabase_service


class AlertUpdateBody(BaseModel):
    """Body for PATCH /alerts/{id}: set is_read and/or is_resolved."""

    is_read: Optional[bool] = None
    is_resolved: Optional[bool] = None

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def list_alerts(
    user_id: str = Query(default="0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"),
    limit: int = Query(default=50, ge=1, le=200),
    is_read: Optional[bool] = Query(default=None, description="Filter by read status"),
    is_resolved: Optional[bool] = Query(default=None, description="Filter by resolved status"),
):
    """
    List alerts for a user. Optional filters: is_read, is_resolved.
    Frontend can use this to show the alert list and get alert IDs for PATCH.
    """
    try:
        alerts = supabase_service.get_alerts(
            user_id=user_id,
            limit=limit,
            is_read=is_read,
            is_resolved=is_resolved,
        )
        return {"status": "success", "count": len(alerts), "alerts": alerts}
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
        updated = supabase_service.update_alert(
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
