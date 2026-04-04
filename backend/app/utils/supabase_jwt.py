"""Decode Supabase JWT role claim without verifying signature (sanity check only)."""

from __future__ import annotations

import base64
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def jwt_payload_role(secret: str) -> Optional[str]:
    """
    Return the `role` claim from a legacy Supabase JWT (anon / service_role), or None if not a JWT.
    """
    parts = secret.split(".")
    if len(parts) != 3:
        return None
    payload_b64 = parts[1]
    pad = 4 - len(payload_b64) % 4
    if pad != 4:
        payload_b64 += "=" * pad
    try:
        raw = base64.urlsafe_b64decode(payload_b64.encode("ascii"))
        data: dict[str, Any] = json.loads(raw.decode("utf-8"))
        role = data.get("role")
        return role if isinstance(role, str) else None
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as e:
        logger.debug("Could not decode JWT payload: %s", e)
        return None
