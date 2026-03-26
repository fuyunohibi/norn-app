"""Application service for listing and updating stored alerts."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class AlertApplicationService:
    """Read/update alert rows via Supabase."""

    def __init__(self, supabase_service: Any) -> None:
        self._db = supabase_service

    def _require_db(self) -> None:
        if self._db is None:
            raise RuntimeError("Database service is not configured")

    def list_alerts(
        self,
        *,
        user_id: str,
        limit: int = 50,
        is_read: Optional[bool] = None,
        is_resolved: Optional[bool] = None,
    ) -> Dict[str, Any]:
        self._require_db()
        alerts: List[Dict[str, Any]] = self._db.get_alerts(
            user_id=user_id,
            limit=limit,
            is_read=is_read,
            is_resolved=is_resolved,
        )
        return {"status": "success", "count": len(alerts), "alerts": alerts}

    def patch_alert(
        self,
        *,
        alert_id: str,
        is_read: Optional[bool] = None,
        is_resolved: Optional[bool] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update read/resolved flags. Returns updated row dict or None if not found.
        Raises ValueError if no fields to update.
        """
        self._require_db()
        if is_read is None and is_resolved is None:
            raise ValueError("Provide at least one of: is_read, is_resolved")
        return self._db.update_alert(
            alert_id=alert_id,
            is_read=is_read,
            is_resolved=is_resolved,
        )
