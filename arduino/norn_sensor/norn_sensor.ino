#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include "DFRobot_HumanDetection.h"

// Wi-Fi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend endpoint (where to POST sensor data)
const char* backend_url = "http://<YOUR_BACKEND_IP>:<PORT>/api/v1/sensor/data";

// Sensor UART pins
#define RXD2 4
#define TXD2 5

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

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connected!");
  Serial.print("ESP32 IP address: ");
  Serial.println(WiFi.localIP());

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
  while (hu.begin() != 0) {
    Serial.println("Sensor init error!");
    delay(1000);
  }

  if (mode == SLEEP) {
    while (hu.configWorkMode(hu.eSleepMode) != 0) {
      Serial.println("Error switching to sleep mode!");
      delay(1000);
    }
    hu.configLEDLight(hu.eHPLed, 1);
  } else if (mode == FALL) {
    while (hu.configWorkMode(hu.eFallingMode) != 0) {
      Serial.println("Error switching to fall mode!");
      delay(1000);
    }
    hu.configLEDLight(hu.eFALLLed, 1);
    hu.configLEDLight(hu.eHPLed, 1);
    hu.dmInstallHeight(270); // Example: 2.7m
    hu.dmFallTime(5);
    hu.dmUnmannedTime(1);
    hu.dmFallConfig(hu.eResidenceTime, 200);
    hu.dmFallConfig(hu.eFallSensitivityC, 3);
  }

  hu.sensorRet(); // Reset after config
  Serial.println("Sensor ready.");
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

  String json = "{";
  json += "\"mode\":\"sleep_detection\",";
  json += "\"timestamp\":" + String(millis()/1000) + ",";
  json += "\"in_bed\":" + String(in_bed) + ",";
  json += "\"sleep_status\":" + String(sleep_status) + ",";
  json += "\"awake_duration\":" + String(awake_duration) + ",";
  json += "\"deep_sleep_duration\":" + String(deep_sleep_duration) + ",";
  json += "\"sleep_quality_score\":" + String(sleep_quality_score) + ",";
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

  String json = "{";
  json += "\"mode\":\"fall_detection\",";
  json += "\"timestamp\":" + String(millis()/1000) + ",";
  json += "\"presence\":" + String(presence) + ",";
  json += "\"motion\":" + String(motion) + ",";
  json += "\"body_movement\":" + String(body_movement) + ",";
  json += "\"fall_status\":" + String(fall_status) + ",";
  json += "\"stationary_dwell\":" + String(stationary_dwell);
  json += "}";

  sendToBackend(json);
}

void sendToBackend(String json) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(backend_url);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(json);

    if (httpResponseCode > 0) {
      Serial.printf("Data sent: %s\n", json.c_str());
    } else {
      Serial.printf("Error sending data: %d\n", httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("Wi-Fi not connected!");
  }
}

