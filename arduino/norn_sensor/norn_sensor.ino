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
    // Fall detection mode - read and display data every second (like sample code)
    Serial.print("Existing information:");
    int presence = hu.smHumanData(hu.eHumanPresence);
    switch (presence) {
      case 0:
        Serial.println("No one is present");
        break;
      case 1:
        Serial.println("Someone is present");
        break;
      default:
        Serial.println("Read error");
    }

    Serial.print("Motion information:");
    int motion = hu.smHumanData(hu.eHumanMovement);
    switch (motion) {
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

    int body_movement = hu.smHumanData(hu.eHumanMovingRange);
    Serial.printf("Body movement parameters:%d\n", body_movement);

    Serial.print("Fall status:");
    int fall_status = hu.getFallData(hu.eFallState);
    switch (fall_status) {
      case 0:
        Serial.println("Not fallen");
        break;
      case 1:
        Serial.println("Fallen");
        break;
      default:
        Serial.println("Read error");
    }

    Serial.print("Stationary dwell status:");
    int stationary_dwell = hu.getFallData(hu.estaticResidencyState);
    switch (stationary_dwell) {
      case 0:
        Serial.println("No stationary dwell");
        break;
      case 1:
        Serial.println("Stationary dwell present");
        break;
      default:
        Serial.println("Read error");
    }

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

    Serial.printf("Respiration rate:%d\n", direct_respiration);
    Serial.printf("Heart rate:%d\n", direct_heart_rate);
    Serial.println();

    // Real-time fall detection alert
    static int last_fall_status = 0;
    if (fall_status > 0 && last_fall_status == 0) {
      Serial.println("🚨🚨🚨 FALL DETECTED! 🚨🚨🚨");
    }
    last_fall_status = fall_status;

    // Send data to backend
    String json = "{";
    json += "\"mode\":\"fall_detection\",";
    json += "\"timestamp\":" + String(millis()/1000) + ",";
    json += "\"presence\":" + String(presence) + ",";
    json += "\"motion\":" + String(motion) + ",";
    json += "\"body_movement\":" + String(body_movement) + ",";
    json += "\"fall_status\":" + String(fall_status) + ",";
    json += "\"stationary_dwell\":" + String(stationary_dwell) + ",";
    json += "\"heart_rate\":" + String(direct_heart_rate) + ",";
    json += "\"respiration_rate\":" + String(direct_respiration) + ",";
    json += "\"human_movement\":" + String(human_movement) + ",";
    json += "\"movement_status\":\"" + movement_status + "\"";
    json += "}";
    sendToBackend(json);

  } else if (currentMode == SLEEP) {
    // Sleep detection mode
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

  delay(1000); // Wait 1 second before next reading (like sample code)
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
    
    // Fall detection configuration - OPTIMIZED FOR CLOSE RANGE (15-20cm above head)
    // Based on DFRobot C1001 documentation: https://wiki.dfrobot.com/SKU_SEN0623_C1001_mmWave_Human_Detection_Sensor
    // If sensor is 15-20cm above head, typical height is ~180-200cm (1.8-2.0m)
    // Adjust this value to match your ACTUAL installation height from floor to sensor
    int install_height_cm = 190; // CHANGE THIS to your actual height in cm (floor to sensor)
    hu.dmInstallHeight(install_height_cm);
    
    // For close range detection, use faster response times
    hu.dmFallTime(1); // Minimum fall time (1 second) for fastest detection
    hu.dmUnmannedTime(1); // Minimum time before considering area unmanned
    hu.dmFallConfig(hu.eResidenceTime, 50); // Even faster response for close range
    hu.dmFallConfig(hu.eFallSensitivityC, 3); // Maximum sensitivity (range 0-3, 3 = highest)
    
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
