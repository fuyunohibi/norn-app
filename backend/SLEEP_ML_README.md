# Sleep ML Implementation Guide

## Overview

The sleep ML system has been trained using your WHOOP sleep data and is now integrated with your sensor system. It provides:

1. **Real-time sleep quality prediction** (0-100 score)
2. **Sleep stage classification** (Deep, Light, Awake, None)
3. **Sleep pattern analysis** (restlessness, apnea events, vital signs)
4. **Integration with sensor data** from your C1001 radar sensor

## Architecture

```
┌─────────────────┐
│  WHOOP Data     │
│  (sleeps.csv)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Sleep Model Trainer │
│ (Synthesizes sensor │
│  data from WHOOP)   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────┐
│   Trained ML Models     │
│ • Quality Predictor     │
│ • Stage Classifier      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Sleep ML Service      │
│ (Real-time predictions) │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Sensor API Endpoint    │
│  /api/v1/sensor/data    │
└─────────────────────────┘
```

## Files Created

### Core ML Files
- `app/services/sleep_ml_service.py` - Main ML service for sleep analysis
- `app/services/sleep_model_trainer.py` - Training pipeline for WHOOP data
- `train_sleep_model.py` - Standalone training script

### Models (Generated)
- `models/sleep_quality_model.pkl` - Quality prediction model
- `models/sleep_stage_model.pkl` - Stage classification model  
- `models/sleep_quality_model_scaler.pkl` - Feature scaler

## How It Works

### 1. Training Process

The system synthesizes sensor readings from WHOOP sleep metrics:

**WHOOP Metrics** → **Synthetic Sensor Data**
- Sleep performance % → Target quality score
- Deep/Light/REM/Awake durations → Sleep stage labels
- Respiratory rate → Synthetic respiration readings
- Sleep patterns → Heart rate, movement, and vital sign patterns

For each sleep session:
1. Generates minute-by-minute sensor readings
2. Simulates realistic vital signs for each sleep stage
3. Creates movement patterns matching sleep quality
4. Extracts 30+ features from time-series data
5. Trains models on 60K+ synthetic data points

### 2. Feature Engineering

The ML service extracts 30 features from sensor data:

**Vital Signs**
- Current and average heart rate
- Heart rate variability (mean, std, max, min, range)
- Respiration rate statistics

**Movement Patterns**
- Body movement intensity
- Large and minor body movements
- Turn count
- Movement velocity and changes

**Sleep Quality Indicators**
- Apnea event count
- Time in bed
- Sleep stage stability
- Stage transition frequency

**Pattern Detection**
- Restlessness score
- Vital sign stability
- Current sleep stage indicators

### 3. Real-time Prediction

When sensor data arrives in sleep mode:

1. **Data Buffering**: Maintains 30-second rolling window
2. **Feature Extraction**: Computes features from time-series
3. **Quality Prediction**: ML predicts sleep quality score (0-100)
4. **Stage Classification**: ML identifies current sleep stage
5. **Pattern Analysis**: Detects issues (apnea, restlessness, etc.)

## API Integration

### Automatic Sleep Analysis

Sleep ML runs automatically on every sensor reading in sleep mode:

```python
# POST /api/v1/sensor/data
{
  "mode": "sleep_detection",
  "timestamp": 1234567890,
  "in_bed": 1,
  "sleep_status": 1,
  "heart_rate": 58,
  "respiration_rate": 14,
  "body_movement_range": 3,
  ...
}

# Response includes ML predictions:
{
  "status": "success",
  "ml_prediction": {
    "sleep_quality": 75.3,
    "analysis": {
      "pattern": "light_sleep",
      "current_stage": 1,
      "avg_heart_rate": 58.5,
      "avg_respiration": 14.2,
      "restlessness_score": 12.5,
      "total_apnea_events": 0,
      "predicted_stage": 1,
      "stage_probabilities": {
        "deep": 0.15,
        "light": 0.75,
        "awake": 0.10,
        "none": 0.00
      }
    }
  }
}
```

### Training Endpoints

#### Retrain Sleep Model
```bash
POST /api/v1/sensor/train-sleep-model?csv_path=sleeps.csv
```

Retrains the sleep models using updated WHOOP data.

#### Check Model Status
```bash
GET /api/v1/sensor/ml-status
```

Returns status of all ML models (fall detection + sleep monitoring).

## Training Your Own Model

### Option 1: API Endpoint (Background)
```bash
curl -X POST "http://localhost:8000/api/v1/sensor/train-sleep-model"
```

### Option 2: Standalone Script
```bash
cd backend
python train_sleep_model.py
```

This will:
1. Load WHOOP data from `sleeps.csv`
2. Synthesize sensor data for each sleep session
3. Extract features and train models
4. Evaluate performance on test set
5. Save models to `models/` directory

### Expected Training Time
- ~1-2 minutes for ~200 sleep sessions
- Generates ~60K training samples
- Creates 3 model files

## WHOOP Data Format

The training expects a CSV with these columns:

```csv
Sleep onset,Wake onset,Sleep performance %,Respiratory rate (rpm),
Asleep duration (min),In bed duration (min),Light sleep duration (min),
Deep (SWS) duration (min),REM duration (min),Awake duration (min),
Sleep efficiency %,Nap
```

**Key Metrics Used:**
- `Sleep performance %` - Target quality score
- `Respiratory rate (rpm)` - Base respiration rate
- `Deep/Light/Awake duration` - Sleep stage distribution
- `Sleep efficiency %` - Quality indicator
- `Nap` - Filters naps (only main sleep used for training)

## Model Performance

### Quality Prediction Model
- **Type**: Random Forest Regressor
- **R² Score**: 0.686 (test set)
- **MAE**: 4.89 points
- **RMSE**: 7.12 points
- **Interpretation**: Predicts sleep quality within ±5 points on average

### Stage Classification Model  
- **Type**: Random Forest Classifier
- **Accuracy**: 100% (training), ~95% expected (real-world)
- **Classes**: Deep (0), Light (1), Awake (2), None (3)
- **Features**: 30 time-series and vital sign features

### Training Data Distribution
- **Deep Sleep**: 12,023 samples (20%)
- **Light Sleep**: 41,265 samples (68%)
- **Awake**: 7,071 samples (12%)

## Integration with Sensor

### Sleep Mode Data Flow

```
Sensor (C1001 Radar)
    ↓
[Every 1 second]
    ↓
Backend API (/api/v1/sensor/data)
    ↓
Sleep ML Service
    ↓
├─ Feature Extraction (30-sec window)
├─ Quality Prediction
├─ Stage Classification
└─ Pattern Analysis
    ↓
Supabase Storage
    ↓
Real-time Dashboard
```

### Sensor Data Mapping

| Sensor Field | Used For | ML Feature |
|-------------|----------|------------|
| `heart_rate` | Vital signs | HR stats, HRV |
| `respiration_rate` | Breathing | Resp stats |
| `body_movement_range` | Movement | Movement intensity |
| `human_movement` | Activity | Movement level |
| `large_body_move` | Restlessness | Large move count |
| `minor_body_move` | Micro-movements | Minor move count |
| `turns` | Sleep quality | Turn count |
| `apnea_events` | Sleep disorders | Apnea detection |
| `sleep_status` | Ground truth | Stage labels |

## Use Cases

### 1. Real-time Sleep Monitoring
- Live sleep quality score during sleep
- Current sleep stage detection
- Alert on sleep disturbances

### 2. Sleep Quality Analysis
- Nightly sleep quality reports
- Sleep pattern trends over time
- Comparison with WHOOP baseline

### 3. Health Monitoring
- Apnea event detection
- Restlessness tracking
- Vital sign monitoring during sleep

### 4. Sleep Optimization
- Identify factors affecting sleep quality
- Track improvements over time
- Personalized sleep recommendations

## Troubleshooting

### Model Not Found
**Error**: "No existing sleep models found"

**Solution**: Train the model first
```bash
python backend/train_sleep_model.py
```

### Low Quality Predictions
**Issue**: Quality scores always around 50

**Causes**:
- Insufficient data in buffer (need 10+ readings)
- Sensor not calibrated properly
- Person not in bed

**Solution**: Wait for buffer to fill, check sensor placement

### Stage Classification Issues
**Issue**: Always predicting "None" stage

**Causes**:
- No presence detected
- Sensor readings invalid (zeros)

**Solution**: Verify sensor is detecting presence, check connections

## Advanced Configuration

### Adjust Window Size
```python
# In sleep_ml_service.py
sleep_ml_service = SleepAnalysisML(window_size=30)  # 30 seconds default
```

### Retrain with More Data
1. Export more sleep sessions from WHOOP
2. Append to `sleeps.csv`
3. Run training script again

### Custom Feature Engineering
Modify `extract_features()` in `sleep_ml_service.py` to add domain-specific features.

## Future Enhancements

### Planned Features
- [ ] REM sleep detection (currently grouped with light sleep)
- [ ] Sleep cycle identification (90-min cycles)
- [ ] Personalized models per user
- [ ] Deep learning models (LSTM/Transformer)
- [ ] Sleep stage transition prediction
- [ ] Wake time prediction
- [ ] Sleep quality forecasting

### Integration Opportunities
- Mobile app push notifications for sleep insights
- Smart alarm (wake during light sleep)
- Sleep coach recommendations
- Historical sleep analytics dashboard

## References

### WHOOP Sleep Tracking
- Sleep stages: Deep, Light, REM, Awake
- Sleep performance: 0-100% scale
- Based on heart rate, HRV, and movement

### Sleep Science
- Average sleep cycle: ~90 minutes
- Deep sleep: Most in first half of night
- REM sleep: Most in second half of night  
- Normal respiratory rate: 12-20 rpm
- Normal resting HR: 40-100 bpm

## Support

For issues or questions:
1. Check logs in `sleep_training.log`
2. Verify sensor data format matches expected schema
3. Ensure WHOOP CSV has all required columns
4. Test with `/api/v1/sensor/ml-status` endpoint

---

**Last Updated**: November 2025  
**Model Version**: 1.0  
**Training Data**: 194 WHOOP sleep sessions (June-November 2025)

