#ifndef MPU6050_LENIENT_H
#define MPU6050_LENIENT_H

#include <Wire.h>
#include <Adafruit_MPU6050.h>

bool mpu6050BeginLenient(Adafruit_MPU6050 &mpu, uint8_t i2cAddr, TwoWire *wire = &Wire,
                         bool skipWhoAmiCheck = false);

#endif
