# Sleep Monitoring Workflow

## Overview

The sleep monitoring system follows a **batch processing** approach:

1. **During Sleep**: Sensor continuously sends data → Backend stores in database (NO ML)
2. **After Waking**: User requests summary → Backend analyzes all data → ML generates comprehensive report

This approach is more efficient and provides better accuracy by analyzing the complete sleep session.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DURING SLEEP (Real-time)                  │
└─────────────────────────────────────────────────────────────┘

[Sensor] ──1sec──> [Backend API] ──> [Supabase Database]
                   /api/v1/sensor/data
                   • Stores sleep_detection data
                   • NO ML processing
                   • Just raw storage


┌─────────────────────────────────────────────────────────────┐
│              AFTER WAKING (On-demand Analysis)               │
└─────────────────────────────────────────────────────────────┘

[User clicks "View Sleep Summary"]
           ↓
[GET /api/v1/sensor/sleep-summary/{user_id}]
           ↓
[Sleep Analysis Service]
           ↓
     ┌─────────────────────────┐
     │ 1. Query Database       │
     │    (Previous night's    │
     │     sleep data)         │
     └──────────┬──────────────┘
                ↓
     ┌─────────────────────────┐
     │ 2. Process with ML      │
     │    • Quality prediction │
     │    • Stage classification
     │    • Pattern analysis   │
     └──────────┬──────────────┘
                ↓
     ┌─────────────────────────┐
     │ 3. Generate Summary     │
     │    • Sleep quality score│
     │    • Stage breakdown    │
     │    • Vital signs        │
     │    • Recommendations    │
     └──────────┬──────────────┘
                ↓
     [Return Comprehensive Report]
```

## API Endpoints

### 1. Store Sleep Data (Continuous)

**Endpoint**: `POST /api/v1/sensor/data`

**When**: Every 1 second during sleep

**Request**:
```json
{
  "mode": "sleep_detection",
  "timestamp": 1699372800,
  "in_bed": 1,
  "sleep_status": 1,
  "heart_rate": 58,
  "respiration_rate": 14,
  "body_movement_range": 3,
  "human_movement": 1,
  "comprehensive": {
    "presence": 1,
    "sleep_state": 1,
    "avg_respiration": 14,
    "avg_heartbeat": 58,
    "turns": 0,
    "large_body_move": 0,
    "minor_body_move": 2,
    "apnea_events": 0
  }
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Sensor data received",
  "alerts": null
}
```

**Note**: No ML processing occurs. Data is just stored for later analysis.

### 2. Get Sleep Summary (On-demand)

**Endpoint**: `GET /api/v1/sensor/sleep-summary/{user_id}?date=YYYY-MM-DD`

**When**: User wakes up and wants to see sleep analysis

**Parameters**:
- `user_id` (required): User ID to analyze
- `date` (optional): Date to analyze (YYYY-MM-DD). Defaults to previous night.

**Request**:
```bash
GET /api/v1/sensor/sleep-summary/0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61?date=2025-11-07
```

**Response**:
```json
{
  "status": "success",
  "summary": {
    "user_id": "0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61",
    "date": "2025-11-07",
    "session_start": "2025-11-07T18:00:00",
    "session_end": "2025-11-08T14:00:00",
    "total_readings": 28567,
    
    "overall_quality": 75.3,
    "sleep_score_grade": "B",
    
    "total_sleep_time_minutes": 425,
    "time_in_bed_minutes": 480,
    "sleep_efficiency_percent": 88.5,
    
    "sleep_stages": {
      "deep_sleep_minutes": 105,
      "deep_sleep_percent": 24.7,
      "light_sleep_minutes": 285,
      "light_sleep_percent": 67.1,
      "awake_minutes": 35,
      "awake_percent": 8.2
    },
    
    "vital_signs": {
      "avg_heart_rate": 58.5,
      "min_heart_rate": 52,
      "max_heart_rate": 72,
      "avg_respiration": 14.2,
      "min_respiration": 12.5,
      "max_respiration": 16.8
    },
    
    "sleep_patterns": {
      "avg_body_movement": 3.2,
      "restlessness_score": 15.3,
      "apnea_events": 2
    },
    
    "sleep_onset": "2025-11-07T22:15:30",
    "wake_time": "2025-11-08T06:20:15",
    
    "recommendations": [
      "✓ Excellent sleep quality! Keep up your current sleep routine.",
      "→ Try to increase deep sleep: Avoid caffeine 6+ hours before bed, keep room cool (65-68°F).",
      "✓ Good sleep efficiency maintained."
    ],
    
    "ml_model_version": "1.0"
  }
}
```

## Integration Guide

### Mobile App Integration

```typescript
// During sleep - continuous data upload
async function sendSensorData(sensorData: SleepSensorData) {
  await fetch('http://backend/api/v1/sensor/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'sleep_detection',
      ...sensorData
    })
  });
}

// After waking - get sleep summary
async function getSleepSummary(userId: string, date?: string) {
  const url = date 
    ? `http://backend/api/v1/sensor/sleep-summary/${userId}?date=${date}`
    : `http://backend/api/v1/sensor/sleep-summary/${userId}`;
    
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 'success') {
    displaySleepSummary(data.summary);
  }
}
```

### Frontend UI Flow

```
┌──────────────────────────────┐
│   Sleep Tracking Screen      │
│                              │
│   Status: Monitoring...      │
│   Duration: 7h 23m           │
│   [Stop Tracking] button     │
└──────────────────────────────┘
                ↓
         (User wakes up)
                ↓
┌──────────────────────────────┐
│   Processing Sleep Data...   │
│   🌙 Analyzing your sleep    │
│   Please wait...             │
└──────────────────────────────┘
                ↓
         (API call to backend)
                ↓
┌──────────────────────────────┐
│   Sleep Summary              │
│                              │
│   Quality Score: B (75.3%)   │
│   ━━━━━━━━━━━━━━━━━━━━━━    │
│                              │
│   💤 Total Sleep: 7h 5m      │
│   🛏️  Time in Bed: 8h        │
│   ⚡ Efficiency: 88.5%        │
│                              │
│   Sleep Stages:              │
│   ▰▰▰▰▰▱▱▱ Deep   (1h 45m)  │
│   ▰▰▰▰▰▰▰▱ Light  (4h 45m)  │
│   ▰▱▱▱▱▱▱▱ Awake  (35m)     │
│                              │
│   💓 Avg HR: 58 bpm          │
│   🫁 Avg Resp: 14 rpm        │
│                              │
│   Recommendations:           │
│   • Excellent sleep quality  │
│   • Increase deep sleep...   │
│                              │
│   [View Details] [Share]     │
└──────────────────────────────┘
```

## Backend Processing Details

### Query Time Range

The system queries a 20-hour window for sleep data:

- **Start**: Previous day at 6 PM (18:00)
- **End**: Current day at 2 PM (14:00)

This captures various sleep schedules:
- Early sleepers (9 PM - 5 AM)
- Normal sleepers (11 PM - 7 AM)
- Late sleepers (2 AM - 10 AM)

### ML Processing Steps

1. **Data Loading**: Fetch all readings from database
2. **Buffering**: Load data into 30-second rolling window
3. **Feature Extraction**: Compute 30 features per window
4. **Quality Prediction**: ML predicts quality score
5. **Stage Classification**: ML identifies sleep stages
6. **Aggregation**: Combine predictions into summary
7. **Recommendations**: Generate personalized advice

### Performance

- **Data Points**: ~28,000 readings per 8-hour sleep
- **Processing Time**: ~2-5 seconds for full analysis
- **Accuracy**: R² = 0.686 (±5 points average error)

## Testing

### Test Sleep Summary Endpoint

```bash
# Get latest sleep summary
curl "http://localhost:8000/api/v1/sensor/sleep-summary/0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"

# Get specific date
curl "http://localhost:8000/api/v1/sensor/sleep-summary/0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61?date=2025-11-07"
```

### Test with Sample Data

```python
import requests
import time
from datetime import datetime

# 1. Send sleep data (simulate 1 hour of sleep)
user_id = "0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"

for i in range(3600):  # 1 hour = 3600 seconds
    data = {
        "mode": "sleep_detection",
        "timestamp": int(time.time()),
        "in_bed": 1,
        "sleep_status": 1 if i > 600 else 2,  # Awake first 10 min
        "heart_rate": 58 + (i % 5),
        "respiration_rate": 14,
        "body_movement_range": 3,
        "human_movement": 1,
    }
    
    requests.post(
        f"http://localhost:8000/api/v1/sensor/data",
        json=data,
        params={"user_id": user_id}
    )
    
    time.sleep(1)  # Wait 1 second

# 2. Get sleep summary
response = requests.get(
    f"http://localhost:8000/api/v1/sensor/sleep-summary/{user_id}"
)

print(response.json())
```

## Advantages of Batch Processing

### vs Real-time Processing

| Aspect | Batch (Current) | Real-time (Alternative) |
|--------|----------------|------------------------|
| **CPU Usage** | Low during sleep, spike on request | Constant high usage |
| **Accuracy** | High (full context) | Lower (limited context) |
| **Latency** | 2-5 sec on request | Immediate |
| **Storage** | Raw data only | Raw + predictions |
| **Cost** | Lower | Higher |
| **Analysis** | Comprehensive | Incremental |

### Key Benefits

1. **Better Accuracy**: ML sees entire sleep session for context
2. **More Efficient**: No continuous ML computation
3. **Flexible**: Can reprocess with improved models
4. **Storage Efficient**: Only raw data stored
5. **Cost Effective**: Compute only when needed

## Troubleshooting

### No Data Found

**Error**: `"No sleep data found for the specified date"`

**Solutions**:
- Verify sensor was in sleep mode
- Check date parameter format (YYYY-MM-DD)
- Confirm user_id is correct
- Check if data exists in database

### Low Quality Score

**Possible Causes**:
- Frequent awakenings
- Low deep sleep
- High restlessness
- Poor sensor positioning

**Check**:
- Review sleep_patterns in response
- Check apnea_events count
- Verify vital_signs are realistic

### Processing Timeout

**Possible Causes**:
- Too much data (>12 hours)
- Database connection slow

**Solutions**:
- Add pagination for very long sessions
- Increase API timeout
- Optimize database queries

## Future Enhancements

- [ ] Real-time sleep stage display (optional)
- [ ] Sleep cycle visualization
- [ ] Comparison with previous nights
- [ ] Weekly/monthly trends
- [ ] Smart alarm (wake during light sleep)
- [ ] Sleep score history charts

---

**Implementation Date**: November 2025  
**Last Updated**: November 7, 2025

