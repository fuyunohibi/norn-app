#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

Adafruit_MPU6050 mpu;

// Target sampling interval (ms)
const unsigned long SAMPLE_INTERVAL_MS = 20; // 50 Hz
unsigned long lastSampleMs = 0;

void setup(void) {
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  }

  if (!mpu.begin()) {
    // If you want, you can blink an LED here instead of Serial prints
    while (1) {
      delay(1000);
    }
  }

  // Configure accelerometer & gyro (no prints to keep serial clean)
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  delay(100);
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleMs < SAMPLE_INTERVAL_MS) {
    return; // keep timing
  }
  lastSampleMs = now;

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Acceleration components (m/s^2)
  float ax = a.acceleration.x;
  float ay = a.acceleration.y;
  float az = a.acceleration.z;

  // Gyro components (rad/s)
  float gx = g.gyro.x;
  float gy = g.gyro.y;
  float gz = g.gyro.z;

  // Print as CSV: timestamp_ms,ax,ay,az,gx,gy,gz
  Serial.print(now);    Serial.print(",");
  Serial.print(ax, 3);  Serial.print(",");
  Serial.print(ay, 3);  Serial.print(",");
  Serial.print(az, 3);  Serial.print(",");
  Serial.print(gx, 3);  Serial.print(",");
  Serial.print(gy, 3);  Serial.print(",");
  Serial.println(gz, 3);
}