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
    """Fall detection sensor data"""
    mode: Literal["fall_detection"]
    timestamp: int
    presence: int
    motion: int
    body_movement: int
    fall_status: int
    stationary_dwell: int
    # Direct sensor readings (real-time values)
    heart_rate: Optional[int] = None
    respiration_rate: Optional[int] = None
    human_movement: Optional[int] = None
    movement_status: Optional[str] = None


class ModeChangeRequest(BaseModel):
    """Request to change ESP32 mode"""
    mode: Literal["sleep", "fall"]
    user_id: Optional[str] = None


class ModeChangeResponse(BaseModel):
    """Response from ESP32 mode change"""
    status: str
    mode: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

