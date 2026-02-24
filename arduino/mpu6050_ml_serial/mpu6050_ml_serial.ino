/*
 * MPU6050 ML Prediction Logger (Serial Only - No WiFi)
 * 
 * Prints IMU data + ML prediction to serial for debugging.
 * Output format: timestamp_ms,ax,ay,az,gx,gy,gz,prediction
 * 
 * Use with log_mpu6050_ml.py to capture predictions to CSV.
 */

#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
#include <math.h>

#include "fall_model.h"
#include "labels.h"
#include "features.h"

// ============================================================================
// Configuration
// ============================================================================

#define SAMPLING_RATE_HZ 50
#define SAMPLE_INTERVAL_MS (1000 / SAMPLING_RATE_HZ)  // 20 ms
#define WINDOW_SIZE_SEC 1.0f
#define SAMPLES_PER_WINDOW ((int)(WINDOW_SIZE_SEC * SAMPLING_RATE_HZ))  // 50 samples
#define WINDOW_STEP_MS 500  // Predict every 0.5 seconds

// State machine: enable transition constraints
#define USE_STATE_MACHINE true

// ============================================================================
// Global Objects
// ============================================================================

Adafruit_MPU6050 mpu;

// Sample buffer
#define N_AXES 6
float sampleBuffer[SAMPLES_PER_WINDOW][N_AXES];
int sampleIndex = 0;
int samplesCollected = 0;

// Feature buffer (float for emlearn)
float features[N_FEATURES];

// Timing
unsigned long lastSampleMs = 0;
unsigned long lastWindowMs = 0;

// Current prediction
int currentPrediction = -1;
const char* currentLabel = "none";

// ============================================================================
// Feature Extraction (same as mpu6050_ml.ino)
// ============================================================================

float computeMean(float* values, int count) {
    if (count == 0) return 0;
    float sum = 0;
    for (int i = 0; i < count; i++) sum += values[i];
    return sum / count;
}

float computeStd(float* values, int count, float mean) {
    if (count < 2) return 0;
    float sumSq = 0;
    for (int i = 0; i < count; i++) {
        float diff = values[i] - mean;
        sumSq += diff * diff;
    }
    return sqrt(sumSq / (count - 1));
}

float computeMin(float* values, int count) {
    if (count == 0) return 0;
    float minVal = values[0];
    for (int i = 1; i < count; i++) {
        if (values[i] < minVal) minVal = values[i];
    }
    return minVal;
}

float computeMax(float* values, int count) {
    if (count == 0) return 0;
    float maxVal = values[0];
    for (int i = 1; i < count; i++) {
        if (values[i] > maxVal) maxVal = values[i];
    }
    return maxVal;
}

void extractFeatures() {
    int count = min(samplesCollected, SAMPLES_PER_WINDOW);
    
    float ax_vals[SAMPLES_PER_WINDOW];
    float ay_vals[SAMPLES_PER_WINDOW];
    float az_vals[SAMPLES_PER_WINDOW];
    float gx_vals[SAMPLES_PER_WINDOW];
    float gy_vals[SAMPLES_PER_WINDOW];
    float gz_vals[SAMPLES_PER_WINDOW];
    float a_mag_vals[SAMPLES_PER_WINDOW];
    float w_mag_vals[SAMPLES_PER_WINDOW];
    
    for (int i = 0; i < count; i++) {
        int idx = (sampleIndex - count + i + SAMPLES_PER_WINDOW) % SAMPLES_PER_WINDOW;
        
        ax_vals[i] = sampleBuffer[idx][0];
        ay_vals[i] = sampleBuffer[idx][1];
        az_vals[i] = sampleBuffer[idx][2];
        gx_vals[i] = sampleBuffer[idx][3];
        gy_vals[i] = sampleBuffer[idx][4];
        gz_vals[i] = sampleBuffer[idx][5];
        
        a_mag_vals[i] = sqrt(ax_vals[i]*ax_vals[i] + ay_vals[i]*ay_vals[i] + az_vals[i]*az_vals[i]);
        w_mag_vals[i] = sqrt(gx_vals[i]*gx_vals[i] + gy_vals[i]*gy_vals[i] + gz_vals[i]*gz_vals[i]);
    }
    
    int fi = 0;
    
    auto addStats = [&](float* vals, int n) {
        float mean = computeMean(vals, n);
        float std = computeStd(vals, n, mean);
        float minVal = computeMin(vals, n);
        float maxVal = computeMax(vals, n);
        
        // Store as float - emlearn model uses float features
        features[fi++] = mean;
        features[fi++] = std;
        features[fi++] = minVal;
        features[fi++] = maxVal;
    };
    
    addStats(ax_vals, count);
    addStats(ay_vals, count);
    addStats(az_vals, count);
    addStats(a_mag_vals, count);
    addStats(gx_vals, count);
    addStats(gy_vals, count);
    addStats(gz_vals, count);
    addStats(w_mag_vals, count);
}

// ============================================================================
// Setup
// ============================================================================

void setup() {
    Serial.begin(115200);
    while (!Serial) delay(10);

    if (!mpu.begin()) {
        while (1) delay(1000);
    }

    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

    lastSampleMs = millis();
    lastWindowMs = millis();
    
    delay(100);
}

// ============================================================================
// Main Loop
// ============================================================================

void loop() {
    unsigned long now = millis();
    
    // Sample at 50Hz
    if (now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
        lastSampleMs = now;
        
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        
        float ax = a.acceleration.x;
        float ay = a.acceleration.y;
        float az = a.acceleration.z;
        float gx = g.gyro.x;
        float gy = g.gyro.y;
        float gz = g.gyro.z;
        
        // Store in buffer
        sampleBuffer[sampleIndex][0] = ax;
        sampleBuffer[sampleIndex][1] = ay;
        sampleBuffer[sampleIndex][2] = az;
        sampleBuffer[sampleIndex][3] = gx;
        sampleBuffer[sampleIndex][4] = gy;
        sampleBuffer[sampleIndex][5] = gz;
        
        sampleIndex = (sampleIndex + 1) % SAMPLES_PER_WINDOW;
        samplesCollected++;
        
        // Run prediction every WINDOW_STEP_MS
        if (now - lastWindowMs >= WINDOW_STEP_MS && samplesCollected >= SAMPLES_PER_WINDOW) {
            lastWindowMs = now;
            
            extractFeatures();
            int mlPrediction = fall_model_predict(features, N_FEATURES);
            
            if (mlPrediction >= 0 && mlPrediction < N_CLASSES) {
                int finalPrediction = mlPrediction;
                
                #if USE_STATE_MACHINE
                // Apply state machine transition constraints
                if (!is_valid_transition(currentPrediction, mlPrediction)) {
                    // Invalid transition - stay in current state
                    finalPrediction = currentPrediction >= 0 ? currentPrediction : mlPrediction;
                }
                #endif
                
                currentPrediction = finalPrediction;
                currentLabel = CLASS_NAMES[finalPrediction];
            }
        }
        
        // Print CSV: timestamp_ms,ax,ay,az,gx,gy,gz,prediction
        Serial.print(now);    Serial.print(",");
        Serial.print(ax, 3);  Serial.print(",");
        Serial.print(ay, 3);  Serial.print(",");
        Serial.print(az, 3);  Serial.print(",");
        Serial.print(gx, 3);  Serial.print(",");
        Serial.print(gy, 3);  Serial.print(",");
        Serial.print(gz, 3);  Serial.print(",");
        Serial.println(currentLabel);
    }
}
