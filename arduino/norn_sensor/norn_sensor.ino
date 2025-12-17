#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include "DFRobot_HumanDetection.h"

// Wi-Fi credentials
const char* ssid = "MONGKHOLTHAM";
const char* password = "0890025005";

// Backend endpoint (where to POST sensor data)
const char* backend_url = "http://192.168.1.46:8000/api/v1/sensor/data";

// Sensor UART pins
#define RXD2 23
#define TXD2 22

// HTTP server on port 80
WebServer server(80);

// Mode definitions
enum Mode { SLEEP, FALL };
Mode currentMode = SLEEP; // Default to sleep detection

// Sensor object
DFRobot_HumanDetection hu(&Serial1);

// Function declarations
void handleSetMode();
void initSensor(Mode mode);
void sendToBackend(String json);

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
  Serial.println("Start initialization");
  int initAttempts = 0;
  while (hu.begin() != 0) {
    Serial.println("init error!!!");
    delay(1000);
    initAttempts++;
    if (initAttempts > 10) {
      Serial.println("CRITICAL: Sensor initialization failed after 10 attempts!");
      return;
    }
  }
  Serial.println("Initialization successful");

  // Initialize sensor mode
  initSensor(currentMode);

  // HTTP server endpoint
  server.on("/set-mode", HTTP_GET, handleSetMode);
  server.begin();
  Serial.println("HTTP server started");
  Serial.println();
}

void loop() {
  server.handleClient();

  if (currentMode == FALL) {
    // --------------------------------------------------
    // FALL DETECTION MODE - FOCUSED DATA FOR ANALYSIS
    // --------------------------------------------------

    // Human-related data in fall mode
    uint16_t existence               = hu.dmHumanData(DFRobot_HumanDetection::eExistence);                // 0/1
    uint16_t motion                  = hu.dmHumanData(DFRobot_HumanDetection::eMotion);                   // 0/1/2
    uint16_t body_move               = hu.dmHumanData(DFRobot_HumanDetection::eBodyMove);
    uint16_t seated_distance_cm      = hu.dmHumanData(DFRobot_HumanDetection::eSeatedHorizontalDistance); // cm
    uint16_t motion_distance_cm      = hu.dmHumanData(DFRobot_HumanDetection::eMotionHorizontalDistance); // cm

    // Fall-specific data
    uint16_t fall_state              = hu.getFallData(DFRobot_HumanDetection::eFallState);                // 0/1
    uint16_t fall_break_height_cm    = hu.getFallData(DFRobot_HumanDetection::eFallBreakHeight);          // cm
    uint16_t static_residency_state  = hu.getFallData(DFRobot_HumanDetection::estaticResidencyState);     // 0/1

    // Vital signs
    uint8_t  heart_rate              = hu.getHeartRate();        // bpm, 0xFF if invalid
    uint8_t  respiration_rate        = hu.getBreatheValue();     // breaths/min, 0xFF if invalid

    // Minimal serial debug (good for checking during experiments)
    Serial.println("---- FALL MODE ----");
    Serial.printf("existence=%u, motion=%u, body_move=%u\n",
                  existence, motion, body_move);
    Serial.printf("seated_distance_cm=%u, motion_distance_cm=%u\n",
                  seated_distance_cm, motion_distance_cm);
    Serial.printf("fall_state=%u, fall_break_height_cm=%u, static_residency_state=%u\n",
                  fall_state, fall_break_height_cm, static_residency_state);
    Serial.printf("heart_rate=%u, respiration_rate=%u\n",
                  heart_rate, respiration_rate);

    // Simple real-time fall alert (for testing only)
    static uint16_t last_fall_state = 0;
    if (fall_state > 0 && last_fall_state == 0) {
      Serial.println("FALL DETECTED!");
    }
    last_fall_state = fall_state;

    // JSON payload for backend (numeric, compact)
    String json = "{";
    json += "\"mode\":\"fall_detection\",";
    json += "\"timestamp\":" + String(millis() / 1000) + ","; // seconds since boot
    json += "\"existence\":" + String(existence) + ",";
    json += "\"motion\":" + String(motion) + ",";
    json += "\"body_move\":" + String(body_move) + ",";
    json += "\"seated_distance_cm\":" + String(seated_distance_cm) + ",";
    json += "\"motion_distance_cm\":" + String(motion_distance_cm) + ",";
    json += "\"fall_state\":" + String(fall_state) + ",";
    json += "\"fall_break_height_cm\":" + String(fall_break_height_cm) + ",";
    json += "\"static_residency_state\":" + String(static_residency_state) + ",";
    json += "\"heart_rate_bpm\":" + String(heart_rate) + ",";
    json += "\"respiration_rate_bpm\":" + String(respiration_rate);
    json += "}";

    sendToBackend(json);

  } else if (currentMode == SLEEP) {
    // --------------------------------------------------
    // SLEEP DETECTION MODE - LEAVE AS IS
    // --------------------------------------------------
    int in_bed = hu.smSleepData(hu.eInOrNotInBed);
    int sleep_status = hu.smSleepData(hu.eSleepState);
    sSleepComposite comp = hu.getSleepComposite();
    
    // Direct sensor readings
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

    Serial.print("Existing information:");
    if (comp.presence == 1 || in_bed == 1) {
      Serial.println("Someone is present");
    } else {
      Serial.println("No one is present");
    }

    Serial.print("Motion information:");
    switch (human_movement) {
      case 0:
        Serial.println("None");
        break;
      case 1:
        Serial.println("Still");
        break;
      case 2:
        Serial.println("Active");
        break;
      default:
        Serial.println("Read error");
    }

    Serial.printf("Body movement parameters:%d\n", body_movement_range);
    Serial.printf("Respiration rate:%d\n", direct_respiration);
    Serial.printf("Heart rate:%d\n", direct_heart_rate);
    Serial.println();

    // Send data to backend
    String json = "{";
    json += "\"mode\":\"sleep_detection\",";
    json += "\"timestamp\":" + String(millis()/1000) + ",";
    json += "\"in_bed\":" + String(in_bed) + ",";
    json += "\"sleep_status\":" + String(sleep_status) + ",";
    json += "\"heart_rate\":" + String(direct_heart_rate) + ",";
    json += "\"respiration_rate\":" + String(direct_respiration) + ",";
    json += "\"body_movement_range\":" + String(body_movement_range) + ",";
    json += "\"human_movement\":" + String(human_movement) + ",";
    json += "\"movement_status\":\"" + movement_status + "\",";
    json += "\"comprehensive\":{";
    json += "\"presence\":" + String(comp.presence) + ",";
    json += "\"sleep_state\":" + String(comp.sleepState) + ",";
    json += "\"avg_respiration\":" + String(comp.averageRespiration) + ",";
    json += "\"avg_heartbeat\":" + String(comp.averageHeartbeat) + "}";
    json += "}";
    sendToBackend(json);
  }

  delay(1000); // Sampling interval (1 second)
}

// --- HTTP Handler ---
void handleSetMode() {
  if (!server.hasArg("mode")) {
    server.send(400, "application/json", "{\"error\":\"Missing mode parameter\"}");
    return;
  }

  String modeArg = server.arg("mode");
  modeArg.toLowerCase();

  Mode requestedMode;
  if (modeArg == "sleep" || modeArg == "sleep_detection") {
    requestedMode = SLEEP;
  } else if (modeArg == "fall" || modeArg == "fall_detection") {
    requestedMode = FALL;
  } else {
    server.send(400, "application/json", "{\"error\":\"Invalid mode\"}");
    Serial.printf("Received unknown mode request: %s\n", modeArg.c_str());
    return;
  }

  if (requestedMode != currentMode) {
    currentMode = requestedMode;
    initSensor(currentMode);
    if (currentMode == SLEEP) {
      Serial.println("Switched to SLEEP mode via HTTP");
    } else {
      Serial.println("Switched to FALL mode via HTTP");
    }
  } else {
    Serial.println("Mode change requested, but sensor is already in the requested mode");
  }

  const char* responseMode = currentMode == SLEEP ? "sleep" : "fall";
  server.send(200, "application/json", String("{\"status\":\"ok\",\"mode\":\"") + responseMode + "\"}");
}

// --- Sensor Initialization ---
void initSensor(Mode mode) {
  Serial.println("Start switching work mode");
  if (hu.sensorRet() != 0) {
    Serial.println("Sensor reset failed");
  }
  delay(500);
  
  if (mode == SLEEP) {
    while (hu.configWorkMode(hu.eSleepMode) != 0) {
      Serial.println("error!!!");
      delay(1000);
    }
    Serial.println("Work mode switch successful");
    hu.configLEDLight(hu.eHPLed, 1);
    Serial.println("✓ Sleep mode configured");
  } else if (mode == FALL) {
    while (hu.configWorkMode(hu.eFallingMode) != 0) {
      Serial.println("error!!!");
      delay(1000);
    }
    Serial.println("Work mode switch successful");
    
    hu.configLEDLight(hu.eFALLLed, 1);
    hu.configLEDLight(hu.eHPLed, 1);
    
    // Fall detection configuration
    int install_height_cm = 270; // CHANGE to your actual floor-to-sensor height
    hu.dmInstallHeight(install_height_cm);
    
    hu.dmFallTime(2);          // wait until detect fall
    hu.dmUnmannedTime(1);      // time before outputting a no person status
    hu.dmFallConfig(hu.eResidenceTime, 50);
    hu.dmFallConfig(hu.eFallSensitivityC, 3); // Max sensitivity (0–3)

    Serial.println("✓ Fall detection mode configured");
    Serial.printf("Radar installation height: %d cm\n", hu.dmGetInstallHeight());
    Serial.printf("Fall duration: %d seconds\n", hu.getFallTime());
    Serial.printf("Unattended duration: %d seconds\n", hu.getUnmannedTime());
    Serial.printf("Dwell duration: %d seconds\n", hu.getStaticResidencyTime());
    Serial.printf("Fall sensitivity: %d\n", hu.getFallData(hu.eFallSensitivity));
  }
  Serial.println();
  Serial.println();
}

// --- Backend Communication ---
void sendToBackend(String json) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
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
    }

    http.end();
  } else {
    Serial.println("Wi-Fi not connected!");
  }
}