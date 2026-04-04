# Sleep ML - Quick Start Guide

## 🎯 What You Have Now

✅ ML models trained on your WHOOP data (194 sleep sessions)  
✅ Batch processing system (efficient, accurate)  
✅ API endpoint for sleep summaries  
✅ Comprehensive documentation  

## 🚀 How to Use

### 1. During Sleep (Automatic)
Your sensor continuously sends data to backend:
```
Sensor → POST /api/v1/sensor/data → Database
```
**No ML processing** - just stores data.

### 2. After Waking (On-demand)
User clicks "View Sleep Summary":
```bash
GET /api/v1/sensor/sleep-summary/{user_id}
```

**Example:**
```bash
curl "http://localhost:8000/api/v1/sensor/sleep-summary/0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"
```

**Returns:**
```json
{
  "status": "success",
  "summary": {
    "overall_quality": 75.3,
    "sleep_score_grade": "B",
    "total_sleep_time_minutes": 425,
    "sleep_efficiency_percent": 88.5,
    "sleep_stages": {
      "deep_sleep_minutes": 105,
      "light_sleep_minutes": 285,
      "awake_minutes": 35
    },
    "vital_signs": {
      "avg_heart_rate": 58.5,
      "avg_respiration": 14.2
    },
    "recommendations": [
      "✓ Excellent sleep quality!",
      "→ Try to increase deep sleep..."
    ]
  }
}
```

## 📱 Mobile Integration

```typescript
// After user wakes up and taps "View Sleep"
const getSleepSummary = async (userId: string) => {
  const response = await fetch(
    `${API_URL}/sensor/sleep-summary/${userId}`
  );
  const { summary } = await response.json();
  
  // Display results
  return {
    quality: summary.overall_quality,
    grade: summary.sleep_score_grade,
    totalSleep: summary.total_sleep_time_minutes,
    stages: summary.sleep_stages,
    recommendations: summary.recommendations
  };
};
```

## 🔄 Retrain Models

When you have new WHOOP data:

```bash
# 1. Update sleeps.csv with new exports
# 2. Run training
cd backend
python train_sleep_model.py

# 3. Restart backend (models auto-reload)
```

## 📊 Check Status

```bash
curl "http://localhost:8000/api/v1/sensor/ml-status"
```

Returns status of all ML models (fall detection + sleep).

## 📚 Full Documentation

| Document | Purpose |
|----------|---------|
| `SLEEP_ML_README.md` | Technical ML details |
| `SLEEP_WORKFLOW.md` | API integration guide |
| `IMPLEMENTATION_SUMMARY.md` | What was built |
| `QUICK_START.md` | This file |

## ⚡ Key Points

1. **No real-time ML** during sleep (efficient)
2. **Batch processing** when user requests (accurate)
3. **2-5 seconds** to generate full report
4. **Trained on your data** (personalized)
5. **Can retrain** with new WHOOP exports

## 🎉 You're Ready!

The sleep ML system is fully functional and ready to integrate with your mobile app.

Next: Build the frontend UI to display sleep summaries! 🚀

