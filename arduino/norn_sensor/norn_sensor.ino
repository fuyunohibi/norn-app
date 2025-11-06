#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include "DFRobot_HumanDetection.h"

// Wi-Fi credentials
const char* ssid = "NapLab404";
const char* password = "NapLab759";

// Backend endpoint (where to POST sensor data)
const char* backend_url = "http://10.0.1.67:8000/api/v1/sensor/data";

// Sensor UART pins
#define RXD2 23
#define TXD2 22

// HTTP server on port 80
WebServer server(80);

// Mode definitions
enum Mode { SLEEP, FALL };
Mode currentMode = SLEEP;

// Sensor object
DFRobot_HumanDetection hu(&Serial1);

// Function declarations
void handleSetMode();
void sendSleepDetectionData();
void sendFallDetectionData();
void initSensor(Mode mode);

void setup() {
  Serial.begin(115200);
  Serial1.begin(115200, SERIAL_8N1, RXD2, TXD2);

  // Connect to Wi-Fi with timeout
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  
  int attempts = 0;
  const int maxAttempts = 30; // 15 seconds timeout (30 * 500ms)
  
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi connected!");
    Serial.print("ESP32 IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWi-Fi connection FAILED!");
    Serial.println("Please check:");
    Serial.println("1. SSID and password are correct");
    Serial.println("2. Network is 2.4GHz (ESP32 doesn't support 5GHz)");
    Serial.println("3. Network is in range");
    Serial.println("Restarting in 5 seconds...");
    delay(5000);
    ESP.restart();
  }

  // Sensor initialization
  initSensor(currentMode);

  // HTTP server endpoint
  server.on("/set-mode", HTTP_GET, handleSetMode);
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();

  // Send data to backend every second
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 1000) {
    if (currentMode == SLEEP) {
      sendSleepDetectionData();
    } else if (currentMode == FALL) {
      sendFallDetectionData();
    }
    lastSend = millis();
  }
}

// --- HTTP Handler ---
void handleSetMode() {
  if (!server.hasArg("mode")) {
    server.send(400, "application/json", "{\"error\":\"Missing mode parameter\"}");
    return;
  }

  String modeArg = server.arg("mode");
  modeArg.toLowerCase();

  String response;
  if (modeArg == "sleep" && currentMode != SLEEP) {
    currentMode = SLEEP;
    initSensor(currentMode);
    response = "{\"status\":\"ok\",\"mode\":\"sleep\"}";
    Serial.println("Switched to SLEEP mode via HTTP");
  } else if (modeArg == "fall" && currentMode != FALL) {
    currentMode = FALL;
    initSensor(currentMode);
    response = "{\"status\":\"ok\",\"mode\":\"fall\"}";
    Serial.println("Switched to FALL mode via HTTP");
  } else {
    response = "{\"status\":\"ok\",\"mode\":\"" + modeArg + "\"}";
  }

  server.send(200, "application/json", response);
}

// --- Sensor Initialization ---
void initSensor(Mode mode) {
  Serial.println("Initializing sensor...");
  int initAttempts = 0;
  while (hu.begin() != 0) {
    Serial.println("Sensor init error!");
    delay(1000);
    initAttempts++;
    if (initAttempts > 10) {
      Serial.println("CRITICAL: Sensor initialization failed after 10 attempts!");
      Serial.println("Check:");
      Serial.println("1. Sensor is properly connected to ESP32");
      Serial.println("2. UART pins are correct (RXD2=23, TXD2=22)");
      Serial.println("3. Sensor has power");
      return;
    }
  }
  Serial.println("✓ Sensor hardware initialized");

  if (mode == SLEEP) {
    Serial.println("Configuring sleep detection mode...");
    while (hu.configWorkMode(hu.eSleepMode) != 0) {
      Serial.println("Error switching to sleep mode!");
      delay(1000);
    }
    hu.configLEDLight(hu.eHPLed, 1);
    Serial.println("✓ Sleep mode configured");
  } else if (mode == FALL) {
    Serial.println("Configuring fall detection mode...");
    while (hu.configWorkMode(hu.eFallingMode) != 0) {
      Serial.println("Error switching to fall mode!");
      delay(1000);
    }
    hu.configLEDLight(hu.eFALLLed, 1);
    hu.configLEDLight(hu.eHPLed, 1);
    
    // Fall detection configuration
    // Adjust these values based on your installation:
    hu.dmInstallHeight(270); // Installation height in cm (2.7m) - adjust to your actual height
    hu.dmFallTime(3); // Reduced from 5 to 3 seconds for faster detection
    hu.dmUnmannedTime(1); // Time before considering area unmanned
    hu.dmFallConfig(hu.eResidenceTime, 200); // Residence time
    hu.dmFallConfig(hu.eFallSensitivityC, 5); // Increased sensitivity from 3 to 5 (max sensitivity)
    
    Serial.println("✓ Fall detection mode configured");
    Serial.println("  - Install height: 2.7m (270cm)");
    Serial.println("  - Fall time: 3 seconds");
    Serial.println("  - Sensitivity: 5 (maximum)");
    Serial.println("  - For fall detection to work:");
    Serial.println("    1. Person must be standing/moving first");
    Serial.println("    2. Then suddenly drop to lying position");
    Serial.println("    3. Sensor mounted at optimal height (2-3m)");
  }

  hu.sensorRet(); // Reset after config
  Serial.println("Sensor reset complete. Waiting 5 seconds for calibration...");
  delay(5000); // Give sensor time to calibrate and stabilize
  Serial.println("✓ Sensor ready. Starting data collection...");
}

// --- Data Sending Functions ---
void sendSleepDetectionData() {
  int in_bed = hu.smSleepData(hu.eInOrNotInBed);
  int sleep_status = hu.smSleepData(hu.eSleepState);
  int awake_duration = hu.smSleepData(hu.eWakeDuration);
  int deep_sleep_duration = hu.smSleepData(hu.eDeepSleepDuration);
  int sleep_quality_score = hu.smSleepData(hu.eSleepQuality);

  sSleepComposite comp = hu.getSleepComposite();
  int abnormalities = hu.smSleepData(hu.eSleepDisturbances);
  sSleepStatistics stats = hu.getSleepStatistics();
  int quality_rating = hu.smSleepData(hu.eSleepQualityRating);
  int abnormal_struggle = hu.smSleepData(hu.eAbnormalStruggle);

  // Direct sensor readings (real-time values)
  int direct_heart_rate = hu.getHeartRate();
  int direct_respiration = hu.getBreatheValue();
  int body_movement_range = hu.smHumanData(hu.eHumanMovingRange);
  int human_movement = hu.smHumanData(hu.eHumanMovement);
  
  // Interpret movement status
  String movement_status = "Unknown";
  switch (human_movement) {
    case 0:
      movement_status = "None";
      break;
    case 1:
      movement_status = "Still";
      break;
    case 2:
      movement_status = "Active";
      break;
    default:
      movement_status = "Read error";
  }

  // Diagnostic output every 10 seconds
  static unsigned long lastDiagnostic = 0;
  static unsigned long sensorStartTime = 0;
  if (sensorStartTime == 0) {
    sensorStartTime = millis();
  }
  
  if (millis() - lastDiagnostic > 10000) {
    unsigned long runtime = (millis() - sensorStartTime) / 1000;
    Serial.println("=== SENSOR DIAGNOSTICS ===");
    Serial.printf("Runtime: %lu seconds\n", runtime);
    Serial.printf("In bed: %d | Sleep status: %d | Presence: %d\n", in_bed, sleep_status, comp.presence);
    Serial.printf("Sleep quality: %d | Quality rating: %d\n", sleep_quality_score, quality_rating);
    Serial.printf("Abnormalities: %d | Abnormal struggle: %d\n", abnormalities, abnormal_struggle);
    Serial.printf("Sleep state: %d | Avg respiration: %d | Avg heartbeat: %d\n", 
                  comp.sleepState, comp.averageRespiration, comp.averageHeartbeat);
    Serial.printf("Direct HR: %d | Direct Resp: %d | Body movement: %d\n",
                  direct_heart_rate, direct_respiration, body_movement_range);
    Serial.printf("Movement status: %s (raw: %d)\n", movement_status.c_str(), human_movement);
    
    // Status interpretation
    if (comp.presence == 0 && in_bed == 0) {
      Serial.println("⚠️  NO PERSON DETECTED");
      Serial.println("   - Make sure someone is in the detection area");
      Serial.println("   - Sensor range: 2-5 meters");
      Serial.println("   - May need 30-60 seconds to detect after movement");
    } else if (comp.presence > 0 || in_bed > 0) {
      Serial.println("✓ Person detected!");
    }
    
    Serial.println("==========================");
    lastDiagnostic = millis();
  }

  String json = "{";
  json += "\"mode\":\"sleep_detection\",";
  json += "\"timestamp\":" + String(millis()/1000) + ",";
  json += "\"in_bed\":" + String(in_bed) + ",";
  json += "\"sleep_status\":" + String(sleep_status) + ",";
  json += "\"awake_duration\":" + String(awake_duration) + ",";
  json += "\"deep_sleep_duration\":" + String(deep_sleep_duration) + ",";
  json += "\"sleep_quality_score\":" + String(sleep_quality_score) + ",";
  // Direct sensor readings (real-time values)
  json += "\"heart_rate\":" + String(direct_heart_rate) + ",";
  json += "\"respiration_rate\":" + String(direct_respiration) + ",";
  json += "\"body_movement_range\":" + String(body_movement_range) + ",";
  json += "\"human_movement\":" + String(human_movement) + ",";
  json += "\"movement_status\":\"" + movement_status + "\",";
  json += "\"comprehensive\":{";
  json += "\"presence\":" + String(comp.presence) + ",";
  json += "\"sleep_state\":" + String(comp.sleepState) + ",";
  json += "\"avg_respiration\":" + String(comp.averageRespiration) + ",";
  json += "\"avg_heartbeat\":" + String(comp.averageHeartbeat) + ",";
  json += "\"turns\":" + String(comp.turnoverNumber) + ",";
  json += "\"large_body_move\":" + String(comp.largeBodyMove) + ",";
  json += "\"minor_body_move\":" + String(comp.minorBodyMove) + ",";
  json += "\"apnea_events\":" + String(comp.apneaEvents) + "},";
  json += "\"abnormalities\":" + String(abnormalities) + ",";
  json += "\"statistics\":{";
  json += "\"sleep_quality_score\":" + String(stats.sleepQualityScore) + ",";
  json += "\"awake_time_pct\":" + String(stats.sleepTime) + ",";
  json += "\"light_sleep_pct\":" + String(stats.shallowSleepPercentage) + ",";
  json += "\"deep_sleep_pct\":" + String(stats.deepSleepPercentage) + ",";
  json += "\"out_of_bed_duration\":" + String(stats.timeOutOfBed) + ",";
  json += "\"exit_count\":" + String(stats.exitCount) + ",";
  json += "\"turn_over_count\":" + String(stats.turnOverCount) + ",";
  json += "\"avg_respiration\":" + String(stats.averageRespiration) + ",";
  json += "\"avg_heartbeat\":" + String(stats.averageHeartbeat) + "},";
  json += "\"quality_rating\":" + String(quality_rating) + ",";
  json += "\"abnormal_struggle\":" + String(abnormal_struggle);
  json += "}";

  sendToBackend(json);
}

void sendFallDetectionData() {
  int presence = hu.smHumanData(hu.eHumanPresence);
  int motion = hu.smHumanData(hu.eHumanMovement);
  int body_movement = hu.smHumanData(hu.eHumanMovingRange);
  int fall_status = hu.getFallData(hu.eFallState);
  int stationary_dwell = hu.getFallData(hu.estaticResidencyState);

  // Direct sensor readings (real-time values)
  int direct_heart_rate = hu.getHeartRate();
  int direct_respiration = hu.getBreatheValue();
  int human_movement = hu.smHumanData(hu.eHumanMovement);
  
  // Interpret movement status
  String movement_status = "Unknown";
  switch (human_movement) {
    case 0:
      movement_status = "None";
      break;
    case 1:
      movement_status = "Still";
      break;
    case 2:
      movement_status = "Active";
      break;
    default:
      movement_status = "Read error";
  }

  // Real-time fall detection alert (check every second)
  static int last_fall_status = 0;
  if (fall_status > 0 && last_fall_status == 0) {
    Serial.println("🚨🚨🚨 FALL DETECTED! 🚨🚨🚨");
    Serial.printf("   Fall status: %d\n", fall_status);
    Serial.printf("   Presence: %d | Motion: %d | Body movement: %d\n", presence, motion, body_movement);
    Serial.println("   Alert sent to backend!");
  }
  last_fall_status = fall_status;

  // Diagnostic output every 10 seconds
  static unsigned long lastDiagnostic = 0;
  static unsigned long sensorStartTime = 0;
  if (sensorStartTime == 0) {
    sensorStartTime = millis();
  }
  
  if (millis() - lastDiagnostic > 10000) {
    unsigned long runtime = (millis() - sensorStartTime) / 1000;
    Serial.println("=== FALL DETECTION DIAGNOSTICS ===");
    Serial.printf("Runtime: %lu seconds\n", runtime);
    Serial.printf("Presence: %d | Motion: %d | Body movement: %d\n", presence, motion, body_movement);
    Serial.printf("Fall status: %d | Stationary dwell: %d\n", fall_status, stationary_dwell);
    Serial.printf("Direct HR: %d | Direct Resp: %d\n", direct_heart_rate, direct_respiration);
    Serial.printf("Movement status: %s (raw: %d)\n", movement_status.c_str(), human_movement);
    
    // Status interpretation
    if (presence == 0) {
      Serial.println("⚠️  NO PERSON DETECTED");
      Serial.println("   - Make sure someone is in the detection area");
      Serial.println("   - Sensor range: 2-5 meters");
    } else {
      Serial.println("✓ Person detected!");
      if (motion > 0) {
        Serial.printf("   - Motion detected (level: %d)\n", motion);
      }
      if (body_movement > 0) {
        Serial.printf("   - Body movement detected (range: %d)\n", body_movement);
      }
      if (fall_status > 0) {
        Serial.println("   🚨 FALL DETECTED!");
      } else {
        Serial.println("   - No fall detected (stand up, then fall down to test)");
      }
    }
    
    Serial.println("===================================");
    lastDiagnostic = millis();
  }

  String json = "{";
  json += "\"mode\":\"fall_detection\",";
  json += "\"timestamp\":" + String(millis()/1000) + ",";
  json += "\"presence\":" + String(presence) + ",";
  json += "\"motion\":" + String(motion) + ",";
  json += "\"body_movement\":" + String(body_movement) + ",";
  json += "\"fall_status\":" + String(fall_status) + ",";
  json += "\"stationary_dwell\":" + String(stationary_dwell) + ",";
  // Direct sensor readings (real-time values)
  json += "\"heart_rate\":" + String(direct_heart_rate) + ",";
  json += "\"respiration_rate\":" + String(direct_respiration) + ",";
  json += "\"human_movement\":" + String(human_movement) + ",";
  json += "\"movement_status\":\"" + movement_status + "\"";
  json += "}";

  sendToBackend(json);
}

void sendToBackend(String json) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Set timeout (10 seconds)
    http.setTimeout(10000);
    
    if (!http.begin(backend_url)) {
      Serial.println("Error: Failed to begin HTTP connection");
      return;
    }
    
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(json);

    if (httpResponseCode > 0) {
      Serial.printf("✓ Data sent successfully (HTTP %d)\n", httpResponseCode);
      String response = http.getString();
      if (response.length() > 0) {
        Serial.printf("Response: %s\n", response.c_str());
      }
    } else {
      Serial.printf("✗ Error sending data: HTTP %d\n", httpResponseCode);
      Serial.printf("Backend URL: %s\n", backend_url);
      Serial.println("Check:");
      Serial.println("1. Backend server is running");
      Serial.println("2. Backend IP address is correct");
      Serial.println("3. Both devices are on same network");
    }

    http.end();
  } else {
    Serial.println("Wi-Fi not connected!");
  }
}

