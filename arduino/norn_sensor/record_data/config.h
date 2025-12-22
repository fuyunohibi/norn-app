#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// CONFIGURATION FILE FOR NORN ESP32 SENSOR
// ==========================================
// Copy this file and update with your actual values

// Wi-Fi Configuration
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Backend API Configuration
#define BACKEND_HOST "192.168.1.100"  // Your backend server IP
#define BACKEND_PORT "8000"            // Your backend server port
#define BACKEND_ENDPOINT "/api/v1/sensor/data"

// Sensor Configuration
#define SENSOR_RX_PIN 4
#define SENSOR_TX_PIN 5
#define SENSOR_BAUD_RATE 115200

// Fall Detection Settings
#define FALL_INSTALL_HEIGHT 270        // Installation height in cm (2.7m)
#define FALL_TIME_THRESHOLD 5          // Fall time threshold in seconds
#define FALL_UNMANNED_TIME 1           // Unmanned time in seconds
#define FALL_RESIDENCE_TIME 200        // Residence time in seconds
#define FALL_SENSITIVITY 3             // Fall sensitivity (1-5)

// Data Transmission Settings
#define DATA_SEND_INTERVAL 1000        // Send data every 1000ms (1 second)

// HTTP Server Settings
#define HTTP_SERVER_PORT 80

#endif // CONFIG_H

