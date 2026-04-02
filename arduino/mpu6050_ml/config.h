/*
 * Configuration for MPU6050 ML Fall Detection
 *
 * IMPORTANT: Update these settings before uploading to ESP32
 *
 * FLASH / PARTITION (Arduino IDE): The embedded model compiles to ~1.9MB+ firmware.
 * Default "OTA" partitions only allow ~1.3MB app -> link error "text section exceeds".
 * Set: Tools -> Partition Scheme -> Huge APP (3MB No OTA) [4MB flash modules]
 *      or a 16MB-flash scheme if your board has 16MB.
 * Optional: increase IMU_HEARTBEAT_INTERVAL_MS if you want fewer API calls (mobile "online" uses this).
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// WiFi Configuration
// ============================================================================

// Your WiFi network credentials
#define WIFI_SSID "Pochara"
#define WIFI_PASSWORD "petch123"

// Connection timeout (seconds)
#define WIFI_TIMEOUT_SEC 30

// ============================================================================
// Backend Configuration
// ============================================================================

// FastAPI backend base URL (no trailing slash)
#define BACKEND_BASE_URL "http://192.168.1.9:8000"
// Alert endpoint - called when critical state (fall, after_fall, unstable) is detected
#define BACKEND_ALERT_URL BACKEND_BASE_URL "/api/v1/sensor/imu/alert"
// Activity endpoint - called on every activity state change (walk, standing, sitting, etc.)
#define BACKEND_ACTIVITY_URL BACKEND_BASE_URL "/api/v1/sensor/activity"

// User ID for alert association (optional - update if needed)
#define USER_ID "0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61"

// Device ID for this ESP32
#define DEVICE_ID "esp32-imu-001"

// Heartbeat: POST activity "ping" over WiFi so the backend knows the wearable is powered (mobile reads /imu/status).
#define IMU_HEARTBEAT_INTERVAL_MS 45000

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

// I2C (MPU6050)
// Default on ESP32 is SDA=GPIO21, SCL=GPIO22. If your wiring differs, uncomment and set:
// #define MPU6050_I2C_SDA 21
// #define MPU6050_I2C_SCL 22
// MPU6050 is 0x68 when AD0 is LOW, 0x69 when AD0 is HIGH. The sketch tries both unless you force:
// #define MPU6050_I2C_ADDR 0x69
// WHO_AM_I 0x70 = MPU-6500 (common on boards sold as MPU6050). 0x68 = MPU-6050. Relaxed init accepts both.
// Lower I2C speed if you see flaky reads (default 100 kHz in sketch):
// #define MPU6050_I2C_CLOCK_HZ 50000
// Last resort: only if something ACKs at 0x68 but ID never matches — may hang on wrong chip:
// #define MPU6050_SKIP_WHOAMI_CHECK

// Enable serial debug output
#define DEBUG_ENABLED true

// Print predictions to serial
#define DEBUG_PREDICTIONS true

// Print features to serial (verbose - only for debugging)
#define DEBUG_FEATURES false

#endif // CONFIG_H
