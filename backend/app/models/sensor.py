from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


class SleepComprehensive(BaseModel):
    """Sleep comprehensive data from sensor"""
    presence: int
    sleep_state: int
    avg_respiration: int
    avg_heartbeat: int
    turns: int
    large_body_move: int
    minor_body_move: int
    apnea_events: int


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
    awake_duration: int
    deep_sleep_duration: int
    sleep_quality_score: int
    comprehensive: SleepComprehensive
    abnormalities: int
    statistics: SleepStatistics
    quality_rating: int
    abnormal_struggle: int


class FallDetectionData(BaseModel):
    """Fall detection sensor data"""
    mode: Literal["fall_detection"]
    timestamp: int
    presence: int
    motion: int
    body_movement: int
    fall_status: int
    stationary_dwell: int


class ModeChangeRequest(BaseModel):
    """Request to change ESP32 mode"""
    mode: Literal["sleep", "fall"]
    user_id: Optional[str] = None


class ModeChangeResponse(BaseModel):
    """Response from ESP32 mode change"""
    status: str
    mode: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

