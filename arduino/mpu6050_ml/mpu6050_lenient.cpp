#include <Arduino.h>
#include <Adafruit_BusIO_Register.h>
#include <Adafruit_I2CDevice.h>

#define private public
#define protected public
#include <Adafruit_MPU6050.h>
#undef private
#undef protected

#include "mpu6050_lenient.h"

// WHO_AM_I at reg 0x75: genuine MPU-6050 = 0x68; many clones = 0x98; MPU-6500 (often labeled MPU6050) = 0x70.
// ElectronicCats-style 6-bit id in bits [6:1]: id6 0x34/0x0C/0x3A for 6050-class; 0x38 for 0x70 (MPU-6500).
static bool mpu6050WhoAmAcceptable(uint8_t who) {
  if (who == 0xFF) {
    return false;
  }
  if (who == 0x68 || who == 0x70 || who == 0x98 || who == 0x34 || who == 0x4C) {
    return true;
  }
  uint8_t id6 = (uint8_t)((who >> 1) & 0x3F);
  return (id6 == 0x34) || (id6 == 0x0C) || (id6 == 0x3A) || (id6 == 0x38);
}

bool mpu6050BeginLenient(Adafruit_MPU6050 &mpu, uint8_t i2cAddr, TwoWire *wire, bool skipWhoAmiCheck) {
  if (!wire) {
    wire = &Wire;
  }
  Adafruit_MPU6050 *p = &mpu;

  if (p->i2c_dev) {
    delete p->i2c_dev;
    p->i2c_dev = nullptr;
  }

  p->i2c_dev = new Adafruit_I2CDevice(i2cAddr, wire);

  bool found = false;
  for (uint8_t tries = 0; tries < 5; tries++) {
    if (p->i2c_dev->begin()) {
      found = true;
      break;
    }
    delay(10);
  }
  if (!found) {
    return false;
  }

  if (!skipWhoAmiCheck) {
    Adafruit_BusIO_Register chipId(p->i2c_dev, MPU6050_WHO_AM_I, 1);
    uint8_t who = (uint8_t)chipId.read();
    if (!mpu6050WhoAmAcceptable(who)) {
      return false;
    }
  }

  return p->_init(0);
}
