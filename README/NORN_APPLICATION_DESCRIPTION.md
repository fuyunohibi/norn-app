r# NORN Application - Comprehensive Description

## Overview

NORN (Norn Health Monitoring System) is a comprehensive real-time health monitoring system designed for fall detection and sleep quality monitoring using mmWave radar sensors. The system is particularly suited for elderly care, medical facilities, and home health monitoring scenarios. It uses ESP32 microcontrollers with C1001 mmWave radar sensors to detect human presence, movement patterns, falls, and sleep quality metrics.

## Core Purpose

The primary objectives of NORN are:
1. **Fall Detection**: Real-time detection of falls with machine learning validation to reduce false positives
2. **Sleep Monitoring**: Track sleep quality, body movement, and abnormal activity during sleep
3. **Health Alerts**: Immediate notification system for critical events (falls, abnormal movements)
4. **Data Analytics**: Historical tracking and analysis of health metrics and patterns

## Technology Stack

### Mobile Application
- **Framework**: React Native with Expo SDK 53
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Authentication**: Supabase Auth
- **UI Components**: Custom component library with Lucide React Native icons
- **Routing**: Expo Router (file-based routing)

### Backend API
- **Framework**: FastAPI (Python 3.11+)
- **Language**: Python
- **Server**: Uvicorn (ASGI server)
- **Validation**: Pydantic models
- **Machine Learning**: Scikit-learn (Random Forest Classifier)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

### Hardware & Firmware
- **Microcontroller**: ESP32 Dev Module
- **Sensor**: DFRobot C1001 mmWave Human Detection Radar Sensor
- **Framework**: Arduino (C++)
- **Communication**: WiFi (2.4GHz only), HTTP REST API, Serial UART
- **Library**: DFRobot_HumanDetection

### Database & Cloud
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase database tables with RLS policies
- **Real-time**: Supabase real-time subscriptions (potential)

## System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                │
│  - User Interface                                           │
│  - Real-time data display                                   │
│  - Mode switching (Sleep/Fall Detection)                    │
│  - Alert notifications                                      │
│  - Health metrics dashboard                                 │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST API
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Backend API (FastAPI)                          │
│  - Data processing & validation                             │
│  - Machine Learning fall detection                          │
│  - Alert generation                                         │
│  - Database operations                                      │
│  - ESP32 communication                                      │
└──────┬────────────────────────────────────┬─────────────────┘
       │                                    │
       │ HTTP POST                           │ HTTP GET
       │                                    │
┌──────▼────────────┐          ┌───────────▼──────────────┐
│   ESP32 Device    │          │   Supabase Database      │
│   - C1001 Sensor  │          │   - Sensor readings      │
│   - WiFi          │          │   - User profiles        │
│   - HTTP Server   │          │   - Alerts               │
│   - Mode Control  │          │   - Configurations       │
└───────────────────┘          └──────────────────────────┘
```

## Key Features

### 1. Dual-Mode Operation
- **Sleep Detection Mode**: Monitors sleep quality, body movement, presence detection, and detects abnormal struggle patterns during sleep
- **Fall Detection Mode**: Real-time fall detection with ML validation, movement analysis, and alert generation

### 2. Machine Learning Fall Detection
- **Model Type**: Random Forest Classifier
- **Features Analyzed**:
  - Body movement patterns (spikes, velocity, acceleration)
  - Motion state transitions (moving to stationary)
  - Stationary dwell time (time spent immobile after movement)
  - Sensor native fall detection status
  - Temporal pattern analysis (10-second sliding window)
- **Validation**: Reduces false positives by analyzing time-series patterns
- **Confidence Scoring**: Provides confidence levels (0-1) for each fall detection
- **Pattern Classification**: Identifies patterns like "real_fall_likely", "sensor_false_positive", "intentional_sitting", etc.

### 3. Real-Time Data Processing
- **Update Frequency**: Sensor data received every 1 second
- **Real-time Display**: Mobile app updates in real-time with latest sensor readings
- **Background Processing**: Data storage and ML analysis performed asynchronously
- **Alert System**: Immediate alert generation for critical events

### 4. Health Monitoring Metrics

#### Sleep Detection Metrics:
- Presence detection (person in bed)
- Body movement intensity
- Sleep quality score (calculated from movement patterns)
- Abnormal struggle detection
- Stationary dwell time

#### Fall Detection Metrics:
- Fall status (ML-validated)
- Body movement (impact detection)
- Motion state (moving/stationary)
- Stationary dwell time (immobility duration)
- ML confidence score
- Pattern analysis

### 5. Alert System
- **Fall Alerts**: Critical alerts when falls are detected
- **Sleep Alerts**: Abnormal struggle patterns during sleep
- **Alert Types**: fall_detected, abnormal_struggle, sensor_error
- **Severity Levels**: critical, warning, info
- **Notification System**: Mobile app displays alerts with visual and audio notifications

### 6. User Management
- **Authentication**: Supabase Auth integration
- **User Profiles**: Store user information and preferences
- **Multi-user Support**: System can handle multiple users with user-specific data
- **Session Tracking**: Monitoring sessions tracked for analysis

### 7. Data Storage & Analytics
- **Historical Data**: All sensor readings stored in Supabase
- **Query Endpoints**: Retrieve latest readings, historical data, ML-validated falls
- **Statistics**: User statistics and health trends
- **Export Capability**: Data can be queried via API for external analysis

## Data Flow

### Mode Switching Flow
1. User selects mode (Sleep/Fall) in mobile app
2. Mobile app calls backend API: `POST /api/v1/mode/change`
3. Backend sends HTTP GET request to ESP32: `GET /set-mode?mode={mode}`
4. ESP32 switches sensor mode and confirms
5. ESP32 begins sending data in new mode

### Data Collection Flow
1. ESP32 reads sensor data every 1 second
2. ESP32 sends POST request to backend: `POST /api/v1/sensor/data`
3. Backend validates data using Pydantic models
4. For fall detection: ML service analyzes data and validates fall detection
5. Backend stores data in Supabase (asynchronous)
6. Backend checks for alert conditions
7. If alerts detected, they are stored in database
8. Mobile app polls for latest readings and alerts
9. Mobile app displays real-time data and shows alerts

## API Endpoints

### Backend API (FastAPI)

**Sensor Data**
- `POST /api/v1/sensor/data` - Receive sensor data from ESP32
- `GET /api/v1/sensor/readings/{mode}` - Get latest sensor readings
- `GET /api/v1/sensor/ml-status` - Get ML model status
- `GET /api/v1/sensor/ml-validated-falls` - Get ML-validated fall detections
- `POST /api/v1/sensor/train-model` - Train ML model with historical data

**Mode Control**
- `POST /api/v1/mode/change` - Change ESP32 operating mode

**Health & Status**
- `GET /health` - Basic health check
- `GET /api/v1/health/status` - Detailed system status

### ESP32 Endpoints

**Mode Control**
- `GET /set-mode?mode=sleep` - Switch to sleep detection mode
- `GET /set-mode?mode=fall` - Switch to fall detection mode

## Database Schema

### Core Tables
- **users**: User profiles and authentication data
- **profiles**: Extended user profile information
- **sensor_devices**: ESP32 device information and status
- **sensor_configurations**: Device settings and emergency contacts
- **sensor_readings**: Real-time sensor data (unified table or mode-specific)
- **sleep_readings**: Sleep detection data (if separate table)
- **alerts**: System alerts and notifications
- **monitoring_sessions**: Session tracking for analysis

### Security
- Row Level Security (RLS) policies enabled
- Service role key used by backend for database operations
- Anon key used by mobile app with RLS restrictions
- User-specific data isolation

## Machine Learning Details

### Fall Detection Model
- **Algorithm**: Random Forest Classifier
- **Features**: 30+ engineered features from time-series data
- **Window Size**: 10 seconds (configurable)
- **Training**: Can be trained with historical labeled data
- **Validation**: Rule-based fallback when model not trained
- **Feature Engineering**:
  - Statistical features (mean, std, max, min)
  - Temporal features (velocity, acceleration)
  - Pattern indicators (spikes, transitions)
  - Sensor fusion (combines multiple sensor metrics)

### ML Prediction Process
1. Buffer last 10 data points (10 seconds)
2. Extract features from time-series buffer
3. Scale features using StandardScaler
4. Predict fall probability using Random Forest
5. Apply rule-based validation for common false positives
6. Return prediction with confidence score and analysis

## Configuration

### Environment Variables

**Mobile App (.env)**
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_KEY`: Supabase anon key
- `EXPO_PUBLIC_API_URL`: Backend API URL (e.g., http://192.168.1.100:8000)
- `EXPO_PUBLIC_ESP32_IP`: ESP32 device IP address

**Backend (.env)**
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key (keep secret!)
- `ESP32_IP`: ESP32 device IP address
- `ALLOWED_ORIGINS`: CORS allowed origins
- `HOST`: Server host (0.0.0.0 for network access)
- `PORT`: Server port (default: 8000)
- `FALL_ALERT_ENABLED`: Enable/disable fall alerts
- `SLEEP_QUALITY_THRESHOLD`: Sleep quality threshold
- `ABNORMAL_STRUGGLE_THRESHOLD`: Abnormal struggle detection threshold

**ESP32 Firmware (norn_sensor.ino)**
- `ssid`: WiFi SSID (2.4GHz network)
- `password`: WiFi password
- `backend_url`: Backend API endpoint URL

## Use Cases

1. **Elderly Care**: Monitor elderly individuals for falls, especially during night hours
2. **Medical Facilities**: Track patient movement and detect falls in hospitals/nursing homes
3. **Home Health Monitoring**: Continuous health monitoring for individuals with mobility issues
4. **Sleep Studies**: Track sleep patterns and quality for research or personal health
5. **Post-Surgery Monitoring**: Monitor patients recovering from surgery for abnormal movements

## Key Differentiators

1. **ML-Validated Fall Detection**: Reduces false positives significantly compared to sensor-only detection
2. **Dual-Mode Operation**: Single device supports both sleep and fall detection
3. **Real-Time Processing**: Sub-second data processing and alert generation
4. **Privacy-Focused**: mmWave radar doesn't use cameras, maintaining privacy
5. **Scalable Architecture**: Can support multiple devices and users
6. **Open Architecture**: RESTful API allows integration with other systems
7. **Comprehensive Analytics**: Historical data tracking for health trend analysis

## Development Status

- **Version**: 1.0.0
- **Status**: Production-ready with active development
- **Platforms**: iOS, Android (via React Native/Expo)
- **Deployment**: Docker support available via docker-compose.yml

## Future Enhancements (Potential)

- Real-time push notifications (currently polling-based)
- Multi-device support (multiple ESP32 sensors per user)
- Advanced sleep staging (REM, deep sleep, light sleep)
- Integration with emergency services
- Mobile app background monitoring
- Cloud deployment options
- Advanced ML models (LSTM, CNN for time-series)
- Mobile app widgets for quick status check
- Export reports (PDF, CSV)
- Family member notifications

## Technical Notes

- ESP32 only supports 2.4GHz WiFi (not 5GHz)
- Sensor communicates via UART (Serial) at 115200 baud
- Backend uses background tasks for non-blocking operations
- ML model can be retrained with new data via API endpoint
- Database uses Row Level Security for data isolation
- Mobile app uses React Query for efficient data fetching and caching
- All sensor data is timestamped with UTC timezone

---

**This description provides a comprehensive overview of the NORN application for use as a prompt with AI assistants like ChatGPT. It covers architecture, features, technology stack, data flow, and use cases.**

