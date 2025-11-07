"""
Sleep Analysis Service - Batch Processing

This service analyzes complete sleep sessions using stored sensor data.
It processes an entire night's data at once when the user requests a summary.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np

from app.services.sleep_ml_service import sleep_ml_service
from app.services.supabase_service import supabase_service

logger = logging.getLogger(__name__)


async def analyze_sleep_session(user_id: str, date: Optional[str] = None) -> Optional[Dict]:
    """
    Analyze a complete sleep session and generate comprehensive summary
    
    Args:
        user_id: User ID to analyze sleep for
        date: Optional date (YYYY-MM-DD) to analyze. If None, uses previous night.
        
    Returns:
        Comprehensive sleep analysis dictionary, or None if no data found
    """
    logger.info(f"🌙 Starting sleep analysis for user {user_id}")
    
    # Determine date range for sleep session
    if date:
        # Parse provided date
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            logger.error(f"Invalid date format: {date}. Use YYYY-MM-DD")
            return None
    else:
        # Use previous night (today - 1 day, starting from evening)
        target_date = datetime.now() - timedelta(days=1)
    
    # Sleep sessions typically span from evening to morning
    # Query from 6 PM on target date to 2 PM next day
    session_start = target_date.replace(hour=18, minute=0, second=0, microsecond=0)
    session_end = session_start + timedelta(hours=20)  # 20-hour window
    
    logger.info(f"   Querying sleep data from {session_start} to {session_end}")
    
    # Fetch all sleep readings for this time period
    try:
        readings = await supabase_service.get_readings_by_timerange(
            user_id=user_id,
            mode="sleep_detection",
            start_time=session_start,
            end_time=session_end
        )
        
        if not readings:
            logger.warning(f"No sleep data found for user {user_id} on {target_date.date()}")
            return None
        
        logger.info(f"   Found {len(readings)} sleep readings to analyze")
        
        # Process readings through ML model
        analysis = _process_sleep_data(readings, session_start, session_end)
        
        # Add metadata
        analysis['user_id'] = user_id
        analysis['date'] = target_date.date().isoformat()
        analysis['session_start'] = session_start.isoformat()
        analysis['session_end'] = session_end.isoformat()
        analysis['total_readings'] = len(readings)
        
        logger.info(f"✅ Sleep analysis complete: Quality={analysis['overall_quality']:.1f}%")
        
        return analysis
        
    except Exception as e:
        logger.error(f"❌ Error analyzing sleep session: {e}", exc_info=True)
        return None


def _process_sleep_data(readings: List[Dict], session_start: datetime, session_end: datetime) -> Dict:
    """
    Process sleep readings through ML model and generate summary
    
    Args:
        readings: List of sleep sensor readings
        session_start: Start of sleep session
        session_end: End of sleep session
        
    Returns:
        Sleep analysis dictionary
    """
    logger.info("🔍 Processing sleep data through ML model...")
    
    # Sort readings by timestamp
    sorted_readings = sorted(readings, key=lambda x: x.get('timestamp', ''))
    
    # Clear buffer to start fresh
    sleep_ml_service.clear_buffer()
    
    # Collect predictions and metrics
    quality_predictions = []
    stage_predictions = []
    heart_rates = []
    respiration_rates = []
    body_movements = []
    apnea_events = []
    
    # Identify actual sleep period (when in_bed = 1)
    sleep_start = None
    sleep_end = None
    
    # Process each reading through ML
    for reading in sorted_readings:
        raw_data = reading.get('raw_data', {})
        
        # Track when person is actually in bed
        if raw_data.get('in_bed') == 1:
            if sleep_start is None:
                sleep_start = reading.get('timestamp')
            sleep_end = reading.get('timestamp')
        
        # Add to ML buffer and predict
        sleep_ml_service.add_data_point(raw_data)
        
        # Once we have enough data, make predictions
        if len(sleep_ml_service.data_buffer) >= 10:
            quality, analysis = sleep_ml_service.predict_sleep_quality(raw_data)
            
            quality_predictions.append(quality)
            
            if 'predicted_stage' in analysis:
                stage_predictions.append(analysis['predicted_stage'])
            
            # Collect vital signs
            hr = raw_data.get('heart_rate', 0)
            rr = raw_data.get('respiration_rate', 0)
            if hr > 0:
                heart_rates.append(hr)
            if rr > 0:
                respiration_rates.append(rr)
            
            body_movements.append(raw_data.get('body_movement_range', 0))
            
            # Count apnea events
            if raw_data.get('comprehensive', {}).get('apnea_events', 0) > 0:
                apnea_events.append(1)
    
    # Calculate sleep metrics
    if not quality_predictions:
        logger.warning("⚠️  Insufficient data for ML predictions, using basic analysis")
        return _basic_sleep_analysis(sorted_readings, sleep_start, sleep_end)
    
    # Overall quality (average of all predictions)
    overall_quality = float(np.mean(quality_predictions))
    
    # Sleep stage breakdown
    stage_counts = {
        'deep': 0,
        'light': 0,
        'awake': 0,
        'none': 0
    }
    
    for stage in stage_predictions:
        if stage == 0:
            stage_counts['deep'] += 1
        elif stage == 1:
            stage_counts['light'] += 1
        elif stage == 2:
            stage_counts['awake'] += 1
        else:
            stage_counts['none'] += 1
    
    # Calculate durations (each reading is ~1 second)
    total_predictions = len(stage_predictions)
    stage_durations = {
        'deep_minutes': int(stage_counts['deep'] / 60),
        'light_minutes': int(stage_counts['light'] / 60),
        'awake_minutes': int(stage_counts['awake'] / 60),
    }
    
    asleep_minutes = stage_durations['deep_minutes'] + stage_durations['light_minutes']
    
    # Calculate sleep efficiency
    if sleep_start and sleep_end:
        in_bed_duration = (datetime.fromisoformat(sleep_end) - datetime.fromisoformat(sleep_start)).total_seconds() / 60
        sleep_efficiency = (asleep_minutes / in_bed_duration * 100) if in_bed_duration > 0 else 0
    else:
        in_bed_duration = asleep_minutes + stage_durations['awake_minutes']
        sleep_efficiency = (asleep_minutes / in_bed_duration * 100) if in_bed_duration > 0 else 0
    
    # Vital signs summary
    vital_signs = {
        'avg_heart_rate': float(np.mean(heart_rates)) if heart_rates else 0,
        'min_heart_rate': float(np.min(heart_rates)) if heart_rates else 0,
        'max_heart_rate': float(np.max(heart_rates)) if heart_rates else 0,
        'avg_respiration': float(np.mean(respiration_rates)) if respiration_rates else 0,
        'min_respiration': float(np.min(respiration_rates)) if respiration_rates else 0,
        'max_respiration': float(np.max(respiration_rates)) if respiration_rates else 0,
    }
    
    # Movement analysis
    avg_movement = float(np.mean(body_movements)) if body_movements else 0
    movement_std = float(np.std(body_movements)) if body_movements else 0
    restlessness_score = min(100, movement_std * 10)  # Normalize to 0-100
    
    # Sleep disturbances
    total_apnea_events = len(apnea_events)
    
    # Generate recommendations
    recommendations = _generate_recommendations(
        overall_quality,
        stage_durations,
        sleep_efficiency,
        total_apnea_events,
        restlessness_score
    )
    
    # Compile comprehensive summary
    summary = {
        'overall_quality': round(overall_quality, 1),
        'sleep_score_grade': _get_grade(overall_quality),
        'total_sleep_time_minutes': asleep_minutes,
        'time_in_bed_minutes': int(in_bed_duration),
        'sleep_efficiency_percent': round(sleep_efficiency, 1),
        'sleep_stages': {
            'deep_sleep_minutes': stage_durations['deep_minutes'],
            'deep_sleep_percent': round(stage_counts['deep'] / total_predictions * 100, 1) if total_predictions > 0 else 0,
            'light_sleep_minutes': stage_durations['light_minutes'],
            'light_sleep_percent': round(stage_counts['light'] / total_predictions * 100, 1) if total_predictions > 0 else 0,
            'awake_minutes': stage_durations['awake_minutes'],
            'awake_percent': round(stage_counts['awake'] / total_predictions * 100, 1) if total_predictions > 0 else 0,
        },
        'vital_signs': vital_signs,
        'sleep_patterns': {
            'avg_body_movement': round(avg_movement, 2),
            'restlessness_score': round(restlessness_score, 1),
            'apnea_events': total_apnea_events,
        },
        'sleep_onset': sleep_start,
        'wake_time': sleep_end,
        'recommendations': recommendations,
        'ml_model_version': '1.0',
    }
    
    return summary


def _basic_sleep_analysis(readings: List[Dict], sleep_start: Optional[str], sleep_end: Optional[str]) -> Dict:
    """
    Fallback basic analysis when ML predictions are unavailable
    
    Uses sensor data directly without ML predictions
    """
    logger.info("Using basic sleep analysis (no ML predictions)")
    
    # Count stages from sensor directly
    stage_counts = {'deep': 0, 'light': 0, 'awake': 0, 'none': 0}
    heart_rates = []
    respiration_rates = []
    
    for reading in readings:
        raw_data = reading.get('raw_data', {})
        
        # Get sleep status from sensor
        status = raw_data.get('sleep_status', 3)
        if status == 0:
            stage_counts['deep'] += 1
        elif status == 1:
            stage_counts['light'] += 1
        elif status == 2:
            stage_counts['awake'] += 1
        else:
            stage_counts['none'] += 1
        
        # Collect vitals
        hr = raw_data.get('heart_rate', 0)
        rr = raw_data.get('respiration_rate', 0)
        if hr > 0:
            heart_rates.append(hr)
        if rr > 0:
            respiration_rates.append(rr)
    
    # Calculate basic metrics
    total_readings = len(readings)
    asleep_minutes = int((stage_counts['deep'] + stage_counts['light']) / 60)
    awake_minutes = int(stage_counts['awake'] / 60)
    
    # Simple quality estimate
    deep_percent = stage_counts['deep'] / total_readings * 100 if total_readings > 0 else 0
    light_percent = stage_counts['light'] / total_readings * 100 if total_readings > 0 else 0
    awake_percent = stage_counts['awake'] / total_readings * 100 if total_readings > 0 else 0
    
    # Quality = high if lots of deep sleep, moderate awakenings
    quality = min(100, (deep_percent * 1.5 + light_percent * 0.8 - awake_percent * 2))
    quality = max(0, quality)
    
    return {
        'overall_quality': round(quality, 1),
        'sleep_score_grade': _get_grade(quality),
        'total_sleep_time_minutes': asleep_minutes,
        'time_in_bed_minutes': asleep_minutes + awake_minutes,
        'sleep_efficiency_percent': round(asleep_minutes / (asleep_minutes + awake_minutes) * 100, 1) if (asleep_minutes + awake_minutes) > 0 else 0,
        'sleep_stages': {
            'deep_sleep_minutes': int(stage_counts['deep'] / 60),
            'deep_sleep_percent': round(deep_percent, 1),
            'light_sleep_minutes': int(stage_counts['light'] / 60),
            'light_sleep_percent': round(light_percent, 1),
            'awake_minutes': awake_minutes,
            'awake_percent': round(awake_percent, 1),
        },
        'vital_signs': {
            'avg_heart_rate': float(np.mean(heart_rates)) if heart_rates else 0,
            'min_heart_rate': float(np.min(heart_rates)) if heart_rates else 0,
            'max_heart_rate': float(np.max(heart_rates)) if heart_rates else 0,
            'avg_respiration': float(np.mean(respiration_rates)) if respiration_rates else 0,
        },
        'sleep_patterns': {
            'avg_body_movement': 0,
            'restlessness_score': 0,
            'apnea_events': 0,
        },
        'sleep_onset': sleep_start,
        'wake_time': sleep_end,
        'recommendations': ['Limited data available. Ensure sensor is properly positioned.'],
        'ml_model_version': 'basic',
    }


def _get_grade(score: float) -> str:
    """Convert quality score to letter grade"""
    if score >= 85:
        return 'A'
    elif score >= 75:
        return 'B'
    elif score >= 65:
        return 'C'
    elif score >= 50:
        return 'D'
    else:
        return 'F'


def _generate_recommendations(
    quality: float,
    stage_durations: Dict,
    sleep_efficiency: float,
    apnea_events: int,
    restlessness: float
) -> List[str]:
    """
    Generate personalized sleep recommendations based on analysis
    
    Returns list of actionable recommendations
    """
    recommendations = []
    
    # Overall quality recommendations
    if quality >= 80:
        recommendations.append("✓ Excellent sleep quality! Keep up your current sleep routine.")
    elif quality >= 65:
        recommendations.append("→ Good sleep quality with room for improvement.")
    else:
        recommendations.append("! Sleep quality needs attention. Consider adjusting your sleep habits.")
    
    # Deep sleep recommendations
    deep_minutes = stage_durations['deep_minutes']
    if deep_minutes < 60:
        recommendations.append("→ Try to increase deep sleep: Avoid caffeine 6+ hours before bed, keep room cool (65-68°F).")
    elif deep_minutes > 120:
        recommendations.append("✓ Excellent deep sleep duration!")
    
    # Sleep efficiency recommendations
    if sleep_efficiency < 85:
        recommendations.append("→ Improve sleep efficiency: Maintain consistent sleep schedule, avoid screens before bed.")
    
    # Apnea recommendations
    if apnea_events > 5:
        recommendations.append("! Multiple apnea events detected. Consider consulting a sleep specialist.")
    
    # Restlessness recommendations
    if restlessness > 40:
        recommendations.append("→ High restlessness detected: Try relaxation techniques, check room temperature and mattress comfort.")
    
    # Light sleep recommendations
    light_minutes = stage_durations['light_minutes']
    if light_minutes < 120:
        recommendations.append("→ Light sleep duration is low. Ensure adequate total sleep time (7-9 hours).")
    
    # Awake time recommendations
    awake_minutes = stage_durations['awake_minutes']
    if awake_minutes > 30:
        recommendations.append("→ Frequent awakenings detected: Limit fluid intake before bed, reduce noise/light in bedroom.")
    
    return recommendations

