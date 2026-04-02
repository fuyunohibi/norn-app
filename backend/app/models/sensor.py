from typing import Literal, Optional

from pydantic import BaseModel


class ActivityEventData(BaseModel):
    """Single activity change event from ESP32 (sent when activity state changes)."""
    device_id: str
    timestamp: int  # milliseconds since ESP32 boot
    activity: str  # label: w, st, si, r, f, af, nf, or "ping" for heartbeat (ignored in stats)


class IMUAlertData(BaseModel):
    """
    IMU-based fall detection alert from ESP32.
    
    Sent when the on-device ML model detects a critical state:
    - 'f' = falling
    - 'af' = after fall on floor  
    - 'nf' = unstable standing (near fall)
    """
    device_id: str  # e.g., "esp32-imu-001"
    timestamp: int  # milliseconds since ESP32 boot
    prediction: str  # predicted class label: f, af, nf, st, si, w, r
    prediction_idx: Optional[int] = None  # class index (0-6)
    confidence: Optional[float] = None  # prediction confidence (if available)
    features: Optional[list] = None  # 32 features for debugging (optional)

