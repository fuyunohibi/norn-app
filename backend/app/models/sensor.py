from typing import Literal, Optional

from pydantic import BaseModel


class FallDetectionData(BaseModel):
    """Fall detection sensor data - matches Arduino JSON and fall_samples table"""
    mode: Literal["fall_detection"]
    timestamp: int  # seconds since ESP32 boot
    # Human presence and motion
    existence: int  # 0 = no person, 1 = person present
    motion: int  # 0 = none, 1 = still, 2 = active
    body_move: int  # movement intensity index (0-255)
    # Distance measurements (cm)
    seated_distance_cm: Optional[int] = None  # distance when seated
    motion_distance_cm: Optional[int] = None  # distance when moving
    # Fall detection specific
    fall_state: int  # 0 = not fallen, 1 = fallen
    fall_break_height_cm: Optional[int] = None  # distance at fall break
    static_residency_state: int  # 0 = no residency, 1 = static residency
    # Vital signs (255 = invalid reading)
    heart_rate_bpm: Optional[int] = None  # 0-255
    respiration_rate_bpm: Optional[int] = None  # 0-255


class FallSampleData(BaseModel):
    """
    Fall sample data for training data collection.
    Matches the fall_samples table schema exactly.
    Used by the dedicated /fall-samples endpoint.
    """
    timestamp: int  # seconds since ESP32 boot
    # Sensor fields
    existence: Optional[int] = None  # 0 = no person, 1 = person
    motion: Optional[int] = None  # 0 = none, 1 = still, 2 = active
    body_move: Optional[int] = None  # movement intensity index (0-255)
    seated_distance: Optional[int] = None  # distance when seated
    motion_distance: Optional[int] = None  # distance when moving
    fall_state: Optional[int] = None  # 0 = not fallen, 1 = fallen
    fall_break_height: Optional[int] = None  # distance at fall break
    static_residency_state: Optional[int] = None  # 0 = no residency, 1 = static residency
    heart_rate_bpm: Optional[int] = None  # 0-255, 255 = invalid
    respiration_rate_bpm: Optional[int] = None  # 0-255, 255 = invalid
    # Optional label for ground truth (added later from video annotation)
    label: Optional[str] = None  # e.g. 'sitting_on_chair', 'falling', 'after_fall_on_floor'


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

