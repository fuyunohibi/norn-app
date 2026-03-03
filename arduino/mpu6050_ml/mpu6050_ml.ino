/*
 * MPU6050 ML Fall Detection for ESP32
 * 
 * This sketch:
 * 1. Reads MPU6050 at 50Hz
 * 2. Collects 1-second windows (50 samples)
 * 3. Extracts 32 features (mean, std, min, max for 8 signals)
 * 4. Runs Random Forest inference using emlearn
 * 5. Sends HTTP alerts for critical states (fall, after_fall, unstable)
 * 
 * Dependencies:
 * - Adafruit_MPU6050
 * - WiFi.h (ESP32)
 * - HTTPClient.h (ESP32)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
#include <math.h>

#include "config.h"
#include "fall_model.h"
#include "labels.h"
#include "features.h"

// ============================================================================
// Global Objects
// ============================================================================

Adafruit_MPU6050 mpu;

// Sample buffer - circular buffer for 1 second of data
// Each sample: [ax, ay, az, gx, gy, gz]
#define N_AXES 6
float sampleBuffer[SAMPLES_PER_WINDOW][N_AXES];
int sampleIndex = 0;
int samplesCollected = 0;

// Feature buffer (32 features as float for emlearn)
float features[N_FEATURES];

// Timing
unsigned long lastSampleMs = 0;
unsigned long lastWindowMs = 0;
unsigned long lastAlertMs = 0;
unsigned long windowIntervalMs = (unsigned long)(WINDOW_STEP_SEC * 1000);

// Current and previous prediction for state change detection
int currentPrediction = -1;
int previousPrediction = -1;
const char* currentLabel = "";

// ============================================================================
// WiFi Functions
// ============================================================================

void connectWiFi() {
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    int maxAttempts = WIFI_TIMEOUT_SEC * 2;  // Check every 500ms
    
    while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi connected!");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\nWiFi connection FAILED!");
        Serial.println("Restarting in 5 seconds...");
        delay(5000);
        ESP.restart();
    }
}

// ============================================================================
// Feature Extraction
// ============================================================================

// Compute mean of an array
float computeMean(float* values, int count) {
    if (count == 0) return 0;
    float sum = 0;
    for (int i = 0; i < count; i++) {
        sum += values[i];
    }
    return sum / count;
}

// Compute standard deviation
float computeStd(float* values, int count, float mean) {
    if (count < 2) return 0;
    float sumSq = 0;
    for (int i = 0; i < count; i++) {
        float diff = values[i] - mean;
        sumSq += diff * diff;
    }
    return sqrt(sumSq / (count - 1));
}

// Compute min of an array
float computeMin(float* values, int count) {
    if (count == 0) return 0;
    float minVal = values[0];
    for (int i = 1; i < count; i++) {
        if (values[i] < minVal) minVal = values[i];
    }
    return minVal;
}

// Compute max of an array
float computeMax(float* values, int count) {
    if (count == 0) return 0;
    float maxVal = values[0];
    for (int i = 1; i < count; i++) {
        if (values[i] > maxVal) maxVal = values[i];
    }
    return maxVal;
}

// Extract all 32 features from current buffer
void extractFeatures() {
    int count = min(samplesCollected, SAMPLES_PER_WINDOW);
    
    // Temporary arrays for each signal
    float ax_vals[SAMPLES_PER_WINDOW];
    float ay_vals[SAMPLES_PER_WINDOW];
    float az_vals[SAMPLES_PER_WINDOW];
    float gx_vals[SAMPLES_PER_WINDOW];
    float gy_vals[SAMPLES_PER_WINDOW];
    float gz_vals[SAMPLES_PER_WINDOW];
    float a_mag_vals[SAMPLES_PER_WINDOW];
    float w_mag_vals[SAMPLES_PER_WINDOW];
    
    // Copy values and compute magnitudes
    for (int i = 0; i < count; i++) {
        // Handle circular buffer - get samples in order
        int idx = (sampleIndex - count + i + SAMPLES_PER_WINDOW) % SAMPLES_PER_WINDOW;
        
        ax_vals[i] = sampleBuffer[idx][0];
        ay_vals[i] = sampleBuffer[idx][1];
        az_vals[i] = sampleBuffer[idx][2];
        gx_vals[i] = sampleBuffer[idx][3];
        gy_vals[i] = sampleBuffer[idx][4];
        gz_vals[i] = sampleBuffer[idx][5];
        
        // Compute magnitudes
        a_mag_vals[i] = sqrt(ax_vals[i]*ax_vals[i] + ay_vals[i]*ay_vals[i] + az_vals[i]*az_vals[i]);
        w_mag_vals[i] = sqrt(gx_vals[i]*gx_vals[i] + gy_vals[i]*gy_vals[i] + gz_vals[i]*gz_vals[i]);
    }
    
    // Feature index counter
    int fi = 0;
    
    // Helper lambda to add 4 stats for a signal
    // Features order: mean, std, min, max (must match training!)
    auto addStats = [&](float* vals, int n) {
        float mean = computeMean(vals, n);
        float std = computeStd(vals, n, mean);
        float minVal = computeMin(vals, n);
        float maxVal = computeMax(vals, n);
        
        // Store as float - emlearn model now uses float features
        features[fi++] = mean;
        features[fi++] = std;
        features[fi++] = minVal;
        features[fi++] = maxVal;
    };
    
    // Extract features in correct order (must match training!)
    // Order: ax, ay, az, a_mag, gx, gy, gz, w_mag
    addStats(ax_vals, count);  // features 0-3
    addStats(ay_vals, count);  // features 4-7
    addStats(az_vals, count);  // features 8-11
    addStats(a_mag_vals, count);  // features 12-15
    addStats(gx_vals, count);  // features 16-19
    addStats(gy_vals, count);  // features 20-23
    addStats(gz_vals, count);  // features 24-27
    addStats(w_mag_vals, count);  // features 28-31
    
    #if DEBUG_FEATURES
    Serial.print("Features: ");
    for (int i = 0; i < N_FEATURES; i++) {
        Serial.print(features[i]);
        Serial.print(" ");
    }
    Serial.println();
    #endif
}

// ============================================================================
// ML Inference
// ============================================================================

int runInference() {
    // Run the emlearn model
    int prediction = fall_model_predict(features, N_FEATURES);
    return prediction;
}

// ============================================================================
// HTTP Alert
// ============================================================================

// Send activity change to backend (first time each activity happens)
void sendActivityChange(unsigned long timestampMs, const char* label) {
    if (WiFi.status() != WL_CONNECTED) return;
    
    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);
    
    String url = String(BACKEND_ACTIVITY_URL) + "?user_id=" + USER_ID;
    if (!http.begin(url)) {
        Serial.println("HTTP begin failed (activity)");
        return;
    }
    http.addHeader("Content-Type", "application/json");
    
    // JSON: {"device_id":"...", "timestamp":12345, "activity":"w"}
    String json = "{\"device_id\":\"" + String(DEVICE_ID) + "\",";
    json += "\"timestamp\":" + String(timestampMs) + ",";
    json += "\"activity\":\"" + String(label) + "\"}";
    
    #if DEBUG_ENABLED
    Serial.print("Activity: ");
    Serial.println(json);
    #endif
    
    int httpCode = http.POST(json);
    if (httpCode > 0) {
        Serial.printf("Activity sent: %s -> HTTP %d\n", label, httpCode);
    } else {
        Serial.printf("Activity send failed: HTTP %d\n", httpCode);
    }
    http.end();
}

void sendAlert(int prediction, const char* label) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected - cannot send alert");
        return;
    }
    
    // Check cooldown
    unsigned long now = millis();
    if (now - lastAlertMs < ALERT_COOLDOWN_MS) {
        #if DEBUG_ENABLED
        Serial.println("Alert cooldown active - skipping");
        #endif
        return;
    }
    lastAlertMs = now;
    
    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);
    
    String url = String(BACKEND_ALERT_URL) + "?user_id=" + USER_ID;
    
    if (!http.begin(url)) {
        Serial.println("HTTP begin failed");
        return;
    }
    
    http.addHeader("Content-Type", "application/json");
    
    // Build JSON payload
    String json = "{";
    json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
    json += "\"timestamp\":" + String(millis()) + ",";
    json += "\"prediction\":\"" + String(label) + "\",";
    json += "\"prediction_idx\":" + String(prediction);
    json += "}";
    
    #if DEBUG_ENABLED
    Serial.print("Sending alert: ");
    Serial.println(json);
    #endif
    
    int httpCode = http.POST(json);
    
    if (httpCode > 0) {
        Serial.printf("Alert sent! HTTP %d\n", httpCode);
        String response = http.getString();
        #if DEBUG_ENABLED
        Serial.println("Response: " + response);
        #endif
    } else {
        Serial.printf("Alert failed: HTTP %d\n", httpCode);
    }
    
    http.end();
}

// ============================================================================
// Setup
// ============================================================================

void setup() {
    Serial.begin(115200);
    while (!Serial) delay(10);
    
    Serial.println("\n========================================");
    Serial.println("MPU6050 ML Fall Detection");
    Serial.println("========================================\n");
    
    // Connect WiFi
    connectWiFi();
    
    // Initialize MPU6050
    Serial.println("\nInitializing MPU6050...");
    if (!mpu.begin()) {
        Serial.println("MPU6050 not found!");
        while (1) delay(1000);
    }
    Serial.println("MPU6050 initialized!");
    
    // Configure sensor (match training data settings)
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    
    // Initialize timing
    lastSampleMs = millis();
    lastWindowMs = millis();
    
    Serial.println("\nConfiguration:");
    Serial.printf("  Sampling rate: %d Hz\n", SAMPLING_RATE_HZ);
    Serial.printf("  Window size: %.1f sec (%d samples)\n", WINDOW_SIZE_SEC, SAMPLES_PER_WINDOW);
    Serial.printf("  Window step: %.1f sec\n", WINDOW_STEP_SEC);
    Serial.printf("  Features: %d\n", N_FEATURES);
    Serial.printf("  Classes: %d\n", N_CLASSES);
    
    Serial.println("\nClass labels:");
    for (int i = 0; i < N_CLASSES; i++) {
        Serial.printf("  %d: %s%s\n", i, CLASS_NAMES[i], 
                     is_critical_label(i) ? " (CRITICAL)" : "");
    }
    
    Serial.println("\nStarting inference loop...\n");
    delay(100);
}

// ============================================================================
// Main Loop
// ============================================================================

void loop() {
    unsigned long now = millis();
    
    // -------------------------------------------------------------------------
    // Sample IMU at 50Hz
    // -------------------------------------------------------------------------
    if (now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
        lastSampleMs = now;
        
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        
        // Store in circular buffer
        sampleBuffer[sampleIndex][0] = a.acceleration.x;
        sampleBuffer[sampleIndex][1] = a.acceleration.y;
        sampleBuffer[sampleIndex][2] = a.acceleration.z;
        sampleBuffer[sampleIndex][3] = g.gyro.x;
        sampleBuffer[sampleIndex][4] = g.gyro.y;
        sampleBuffer[sampleIndex][5] = g.gyro.z;
        
        sampleIndex = (sampleIndex + 1) % SAMPLES_PER_WINDOW;
        samplesCollected++;
    }
    
    // -------------------------------------------------------------------------
    // Run inference every WINDOW_STEP_SEC
    // -------------------------------------------------------------------------
    if (now - lastWindowMs >= windowIntervalMs && samplesCollected >= SAMPLES_PER_WINDOW) {
        lastWindowMs = now;
        
        // Extract features from current window
        extractFeatures();
        
        // Run ML inference
        int mlPrediction = runInference();
        
        if (mlPrediction >= 0 && mlPrediction < N_CLASSES) {
            int finalPrediction = mlPrediction;
            
            #if USE_STATE_MACHINE
            // Apply state machine transition constraints
            if (!is_valid_transition(currentPrediction, mlPrediction)) {
                // Invalid transition - stay in current state
                finalPrediction = currentPrediction >= 0 ? currentPrediction : mlPrediction;
                
                #if DEBUG_STATE_MACHINE
                Serial.printf("[SM] Blocked: %s -> %s (staying at %s)\n",
                    currentPrediction >= 0 ? CLASS_NAMES[currentPrediction] : "none",
                    CLASS_NAMES[mlPrediction],
                    CLASS_NAMES[finalPrediction]);
                #endif
            } else {
                #if DEBUG_STATE_MACHINE
                if (mlPrediction != currentPrediction) {
                    Serial.printf("[SM] Valid transition: %s -> %s\n",
                        currentPrediction >= 0 ? CLASS_NAMES[currentPrediction] : "none",
                        CLASS_NAMES[mlPrediction]);
                }
                #endif
            }
            #endif
            
            previousPrediction = currentPrediction;
            currentPrediction = finalPrediction;
            currentLabel = CLASS_NAMES[finalPrediction];
            
            #if DEBUG_PREDICTIONS
            Serial.printf("[%lu] Prediction: %s (%d)", now, currentLabel, finalPrediction);
            if (is_critical_label(finalPrediction)) {
                Serial.print(" *** CRITICAL ***");
            }
            #if USE_STATE_MACHINE
            if (mlPrediction != finalPrediction) {
                Serial.printf(" [ML wanted: %s]", CLASS_NAMES[mlPrediction]);
            }
            #endif
            Serial.println();
            #endif
            
            // On any state change: send activity event (for statistics)
            // Only first time each activity happens: 1=walk, 6=standing, 9=sitting, 11=standing
            bool stateChanged = (finalPrediction != previousPrediction);
            bool isCritical = is_critical_label(finalPrediction);
            
            if (stateChanged) {
                sendActivityChange(now, currentLabel);
                if (isCritical) {
                    #if DEBUG_ENABLED
                    Serial.printf("State changed: %s -> %s (sending alert)\n",
                        previousPrediction >= 0 ? CLASS_NAMES[previousPrediction] : "none",
                        currentLabel);
                    #endif
                    sendAlert(finalPrediction, currentLabel);
                }
            }
        }
    }
}
