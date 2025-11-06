# ESP32 Wi-Fi Setup Guide

## ⚠️ Important: 2.4GHz Network Requirement

**The ESP32 only supports 2.4GHz Wi-Fi networks. It cannot connect to 5GHz networks.**

## Common Issues

### Problem: "Connecting to Wi-Fi..." (infinite loop)

If your ESP32 is stuck trying to connect to Wi-Fi, it's likely because:

1. **You're trying to connect to a 5GHz network** - ESP32 doesn't support 5GHz
2. **Wrong SSID or password** - Double-check your credentials
3. **Network out of range** - Move closer to your router

## How to Identify Your Network Type

### Check Your Router Settings

1. Log into your router admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Look for Wi-Fi settings
3. You should see separate networks for 2.4GHz and 5GHz

### Common Network Naming Patterns

- **2.4GHz networks**: Often named like:
  - `YourNetwork`
  - `YourNetwork-2.4G`
  - `YourNetwork-2.4`
  - `YourNetwork-24`

- **5GHz networks**: Often named like:
  - `YourNetwork-5G`
  - `YourNetwork-5GHz`
  - `YourNetwork-5`

### If Your Router Uses Combined SSIDs

Some modern routers combine both bands under one name. You need to:

1. **Split the bands** in your router settings:
   - Create separate SSIDs for 2.4GHz and 5GHz
   - Name them differently (e.g., `Home-2.4G` and `Home-5G`)

2. **Connect ESP32 to the 2.4GHz SSID**

## Configuration Steps

### 1. Find Your 2.4GHz Network

- Check your router admin panel
- Look for a network name that doesn't have "5G" or "5GHz" in it
- Or create a separate 2.4GHz network

### 2. Update Arduino Code

In `arduino/norn_sensor/norn_sensor.ino`, update:

```cpp
const char* ssid = "YOUR_2.4GHz_NETWORK_NAME";
const char* password = "YOUR_PASSWORD";
```

**Example:**
```cpp
const char* ssid = "NapLab404";           // 2.4GHz network
const char* password = "NapLab759";
```

**NOT:**
```cpp
const char* ssid = "NapLab404-5G";        // ❌ 5GHz - won't work!
```

### 3. Upload and Monitor

1. Upload the code to your ESP32
2. Open Serial Monitor (115200 baud)
3. You should see:
   ```
   Connecting to Wi-Fi...
   Wi-Fi connected!
   ESP32 IP address: 10.0.0.xxx
   ```

### 4. Connection Timeout

The code includes a 15-second timeout. If connection fails, you'll see:
```
Wi-Fi connection FAILED!
Please check:
1. SSID and password are correct
2. Network is 2.4GHz (ESP32 doesn't support 5GHz)
3. Network is in range
```

## Troubleshooting

### Still Can't Connect?

1. **Verify network frequency:**
   - Use a phone/computer to check available networks
   - Look for your network in the list
   - Check if it shows "2.4 GHz" or "5 GHz"

2. **Check credentials:**
   - Double-check SSID spelling (case-sensitive)
   - Verify password is correct

3. **Test with phone:**
   - Try connecting your phone to the same network
   - If phone can't see it, ESP32 won't either

4. **Router settings:**
   - Some routers hide 2.4GHz by default
   - Enable it in router settings
   - Check if MAC filtering is blocking the ESP32

5. **Distance:**
   - Move ESP32 closer to router
   - ESP32 has weaker Wi-Fi than modern devices

## Additional Resources

- [ESP32 Wi-Fi Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/network/esp_wifi.html)
- [Arduino ESP32 Wi-Fi Examples](https://github.com/espressif/arduino-esp32/tree/master/libraries/WiFi/examples)

## Quick Reference

| Network Type | ESP32 Support | Example SSID |
|-------------|---------------|--------------|
| 2.4GHz      | ✅ Yes        | `Home-2.4G` |
| 5GHz        | ❌ No         | `Home-5G` |

**Remember: Always use a 2.4GHz network for ESP32!**

