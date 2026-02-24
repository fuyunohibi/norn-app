/*
 * Configuration for MPU6050 ML Fall Detection
 * 
 * IMPORTANT: Update these settings before uploading to ESP32
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// WiFi Configuration
// ============================================================================

// Your WiFi network credentials
#define WIFI_SSID "wiangkham2.4G"
#define WIFI_PASSWORD "532707902"

// Connection timeout (seconds)
#define WIFI_TIMEOUT_SEC 30

// ============================================================================
// Backend Configuration
// ============================================================================

// FastAPI backend URL for sending alerts
// Format: http://<ip>:<port>/api/v1/imu/alert
#define BACKEND_URL "http://192.168.1.9:8000/api/v1/sensor/imu/alert"

// User ID for alert association (optional - update if needed)
#define USER_ID "0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"

// Device ID for this ESP32
#define DEVICE_ID "esp32-imu-001"

// HTTP timeout (milliseconds)
#define HTTP_TIMEOUT_MS 10000

// ============================================================================
// Sampling Configuration
// ============================================================================

// IMU sampling rate (Hz)
// Must match training data: 50 Hz
#define SAMPLING_RATE_HZ 50

// Sampling interval (ms) - calculated from rate
#define SAMPLE_INTERVAL_MS (1000 / SAMPLING_RATE_HZ)  // 20 ms

// Window size (seconds) - must match training
#define WINDOW_SIZE_SEC 1.0f

// Window step (seconds) - for overlap
#define WINDOW_STEP_SEC 0.5f

// Number of samples per window
#define SAMPLES_PER_WINDOW ((int)(WINDOW_SIZE_SEC * SAMPLING_RATE_HZ))  // 50 samples

// ============================================================================
// Alert Configuration
// ============================================================================

// Alerts are sent ONLY when state changes to a critical state:
// - fall -> fall: NO alert (same state)
// - standing -> fall: ALERT (state changed to critical)
// - fall -> after_fall: ALERT (state changed to different critical)
// - after_fall -> after_fall: NO alert (same state)

// Minimum time between alerts (milliseconds) - backup safety measure
// Primary spam prevention is state-change detection
#define ALERT_COOLDOWN_MS 2000

// ============================================================================
// State Machine Configuration
// ============================================================================

// Enable state machine transition constraints
// When enabled, predictions must follow valid transition rules:
//   - Can't jump from sitting directly to after_fall (must fall first)
//   - After falling, can only stay fallen or transition to after_fall
//   - From after_fall, can only get up to standing/sitting
// This reduces false positives but may miss unusual transitions
#define USE_STATE_MACHINE true

// Print state machine debug info (transitions blocked, etc.)
#define DEBUG_STATE_MACHINE true

// Enable serial debug output
#define DEBUG_ENABLED true

// Print predictions to serial
#define DEBUG_PREDICTIONS true

// Print features to serial (verbose - only for debugging)
#define DEBUG_FEATURES false

#endif // CONFIG_H
