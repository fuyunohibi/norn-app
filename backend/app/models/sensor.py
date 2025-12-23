from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class SleepComprehensive(BaseModel):
    """Sleep comprehensive data from sensor"""
    presence: Optional[int] = 0
    sleep_state: Optional[int] = 0
    avg_respiration: Optional[int] = 0
    avg_heartbeat: Optional[int] = 0
    turns: Optional[int] = 0
    large_body_move: Optional[int] = 0
    minor_body_move: Optional[int] = 0
    apnea_events: Optional[int] = 0


class SleepStatistics(BaseModel):
    """Sleep statistics data from sensor"""
    sleep_quality_score: int
    awake_time_pct: int
    light_sleep_pct: int
    deep_sleep_pct: int
    out_of_bed_duration: int
    exit_count: int
    turn_over_count: int
    avg_respiration: int
    avg_heartbeat: int


class SleepDetectionData(BaseModel):
    """Sleep detection sensor data"""
    mode: Literal["sleep_detection"]
    timestamp: int
    in_bed: int
    sleep_status: int
    # Optional fields - may not be present in simplified data
    awake_duration: Optional[int] = 0
    deep_sleep_duration: Optional[int] = 0
    sleep_quality_score: Optional[int] = 100
    comprehensive: Optional[SleepComprehensive] = None
    abnormalities: Optional[int] = 0
    statistics: Optional[SleepStatistics] = None
    quality_rating: Optional[int] = 0
    abnormal_struggle: Optional[int] = 0
    # Direct sensor readings (real-time values)
    heart_rate: Optional[int] = None
    respiration_rate: Optional[int] = None
    body_movement_range: Optional[int] = None
    human_movement: Optional[int] = None
    movement_status: Optional[str] = None


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


class ModeChangeRequest(BaseModel):
    """Request to change ESP32 mode"""
    mode: Literal["sleep", "fall"]
    user_id: Optional[str] = None


class ModeChangeResponse(BaseModel):
    """Response from ESP32 mode change"""
    status: str
    mode: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

