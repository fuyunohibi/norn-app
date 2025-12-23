#include <Arduino.h>
#include "DFRobot_HumanDetection.h"

/* ================= CONFIG (INLINE) ================= */

// Sensor wiring
#define SENSOR_RX_PIN 4   // ESP32 RX  <- Sensor TX
#define SENSOR_TX_PIN 5   // ESP32 TX  -> Sensor RX
#define SENSOR_BAUD_RATE 9600   // IMPORTANT: sensor default baud

// Timing
#define DATA_SEND_INTERVAL 1000   // ms

/* =================================================== */

// Mode definitions
enum Mode { SLEEP, FALL };
Mode currentMode = SLEEP;

// IMPORTANT: use Serial2 (Serial1 is unreliable on ESP32)
DFRobot_HumanDetection hu(&Serial2);

// Program state
bool programRunning = false;
unsigned long programStartMillis = 0;

// Function declarations
void initSensor(Mode mode);
void waitForUser();

void setup() {
  Serial.begin(115200);

  Serial2.begin(
    SENSOR_BAUD_RATE,
    SERIAL_8N1,
    SENSOR_RX_PIN,
    SENSOR_TX_PIN
  );

  delay(3000); // sensor warm-up (CRITICAL)

  Serial.println();
  Serial.println("=== NORN SENSOR CONSOLE TEST ===");
  Serial.println("Wiring:");
  Serial.println("Sensor TX -> GPIO 4");
  Serial.println("Sensor RX -> GPIO 5");
  Serial.println();

  waitForUser();
}

void loop() {
  // Allow restart anytime
  if (Serial.available()) {
    char cmd = Serial.read();
    if (cmd == 'x') {
      Serial.println("\nRestart requested\n");
      programRunning = false;
      waitForUser();
      return;
    }
  }

  if (!programRunning) {
    delay(100);
    return;
  }

  unsigned long runtimeSec = (millis() - programStartMillis) / 1000;

  // -------- SLEEP MODE DATA --------
  int in_bed           = hu.smSleepData(hu.eInOrNotInBed);
  int sleep_status     = hu.smSleepData(hu.eSleepState);
  sSleepComposite comp = hu.getSleepComposite();

  int heart_rate       = hu.getHeartRate();
  int respiration      = hu.getBreatheValue();
  int movement_range   = hu.smHumanData(hu.eHumanMovingRange);
  int human_movement   = hu.smHumanData(hu.eHumanMovement);

  String json = "{";
  json += "\"mode\":\"sleep_detection\",";
  json += "\"runtime_sec\":" + String(runtimeSec) + ",";
  json += "\"in_bed\":" + String(in_bed) + ",";
  json += "\"sleep_status\":" + String(sleep_status) + ",";
  json += "\"heart_rate\":" + String(heart_rate) + ",";
  json += "\"respiration_rate\":" + String(respiration) + ",";
  json += "\"body_movement_range\":" + String(movement_range) + ",";
  json += "\"human_movement\":" + String(human_movement) + ",";
  json += "\"presence\":" + String(comp.presence);
  json += "}";

  Serial.println(json);
  delay(DATA_SEND_INTERVAL);
}

// ------------------------------------------------

void waitForUser() {
  Serial.println("Press 'r' to run, 'x' to restart");

  while (true) {
    if (Serial.available()) {
      char cmd = Serial.read();

      if (cmd == 'r') {
        Serial.println("\nInitializing sensor...\n");

        int ret = -1;
        int attempts = 0;

        while ((ret = hu.begin()) != 0) {
          Serial.print("Sensor init failed, code = ");
          Serial.println(ret);
          delay(1000);

          if (++attempts > 10) {
            Serial.println("❌ Sensor not responding");
            return;
          }
        }

        Serial.println("✅ Sensor initialized");

        initSensor(currentMode);
        programStartMillis = millis();
        programRunning = true;
        return;
      }
    }
  }
}

// ------------------------------------------------

void initSensor(Mode mode) {
  hu.sensorRet();
  delay(500);

  while (hu.configWorkMode(hu.eSleepMode) != 0) {
    delay(500);
  }

  hu.configLEDLight(hu.eHPLed, 1);
  Serial.println("✓ Sleep mode active");
}
