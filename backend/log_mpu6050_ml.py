#!/usr/bin/env python3
"""
MPU6050 ML Prediction Logger

Reads serial data from ESP32 running record_with_prediction.ino
and saves to CSV with timestamps and predictions.

Usage:
    python log_mpu6050_ml.py                    # Auto-detect port, default filename
    python log_mpu6050_ml.py --port /dev/ttyUSB0
    python log_mpu6050_ml.py --output my_session.csv
    python log_mpu6050_ml.py --port COM3 --output test.csv

Output CSV format:
    timestamp_ms,ax,ay,az,gx,gy,gz,bkk_time,prediction
"""

import argparse
import os
import sys
from datetime import datetime

import serial
import serial.tools.list_ports
from zoneinfo import ZoneInfo

# Bangkok timezone
BKK_TZ = ZoneInfo("Asia/Bangkok")

# Script directory for output
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "collected_data")


def find_esp32_port():
    """Auto-detect ESP32 serial port."""
    ports = serial.tools.list_ports.comports()
    
    # Common ESP32 identifiers
    esp32_keywords = ['CP210', 'CH340', 'USB Serial', 'UART', 'Silicon Labs', 'wch.cn']
    
    for port in ports:
        desc = f"{port.description} {port.manufacturer or ''}"
        if any(kw.lower() in desc.lower() for kw in esp32_keywords):
            print(f"Found ESP32 at: {port.device} ({port.description})")
            return port.device
    
    # Fallback: list all ports
    print("Available ports:")
    for port in ports:
        print(f"  {port.device}: {port.description}")
    
    if ports:
        return ports[0].device
    
    return None


def get_next_session_number():
    """Find the next available session number."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    existing = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("session_") and f.endswith(".csv")]
    
    max_num = 0
    for f in existing:
        try:
            # Extract number from session_XX.csv or session_XX_ml.csv
            num_part = f.replace("session_", "").replace("_ml", "").replace(".csv", "")
            num = int(num_part)
            max_num = max(max_num, num)
        except ValueError:
            pass
    
    return max_num + 1


def main():
    parser = argparse.ArgumentParser(description="Log MPU6050 data with ML predictions")
    parser.add_argument("--port", "-p", help="Serial port (auto-detect if not specified)")
    parser.add_argument("--baud", "-b", type=int, default=115200, help="Baud rate (default: 115200)")
    parser.add_argument("--output", "-o", help="Output CSV filename (auto-generate if not specified)")
    args = parser.parse_args()
    
    # Find serial port
    port = args.port or find_esp32_port()
    if not port:
        print("ERROR: No serial port found. Please specify with --port")
        sys.exit(1)
    
    # Generate output filename
    if args.output:
        output_path = args.output
        if not os.path.isabs(output_path):
            output_path = os.path.join(OUTPUT_DIR, output_path)
    else:
        session_num = get_next_session_number()
        output_path = os.path.join(OUTPUT_DIR, f"session_{session_num}_ml.csv")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    print(f"\n{'='*60}")
    print("MPU6050 ML Prediction Logger")
    print(f"{'='*60}")
    print(f"Port: {port}")
    print(f"Baud: {args.baud}")
    print(f"Output: {output_path}")
    print(f"{'='*60}")
    print("\nPress Ctrl+C to stop recording\n")
    
    # Open serial connection
    try:
        ser = serial.Serial(port, args.baud, timeout=1)
    except serial.SerialException as e:
        print(f"ERROR: Cannot open {port}: {e}")
        sys.exit(1)
    
    # Open output file
    with open(output_path, "w") as f:
        # Write header
        f.write("timestamp_ms,ax,ay,az,gx,gy,gz,bkk_time,prediction\n")
        
        line_count = 0
        prediction_counts = {}
        
        try:
            while True:
                # Read line from serial
                raw = ser.readline()
                if not raw:
                    continue
                
                try:
                    line = raw.decode("utf-8").strip()
                except UnicodeDecodeError:
                    continue
                
                if not line:
                    continue
                
                # Parse CSV: timestamp_ms,ax,ay,az,gx,gy,gz,prediction
                parts = line.split(",")
                if len(parts) != 8:
                    # Skip malformed lines (startup messages, etc.)
                    continue
                
                try:
                    timestamp_ms = int(parts[0])
                    ax = float(parts[1])
                    ay = float(parts[2])
                    az = float(parts[3])
                    gx = float(parts[4])
                    gy = float(parts[5])
                    gz = float(parts[6])
                    prediction = parts[7]
                except ValueError:
                    continue
                
                # Add Bangkok timestamp
                bkk_time = datetime.now(BKK_TZ).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                
                # Write to CSV
                f.write(f"{timestamp_ms},{ax:.3f},{ay:.3f},{az:.3f},{gx:.3f},{gy:.3f},{gz:.3f},{bkk_time},{prediction}\n")
                f.flush()
                
                line_count += 1
                
                # Count predictions
                prediction_counts[prediction] = prediction_counts.get(prediction, 0) + 1
                
                # Print progress every 50 lines (1 second at 50Hz)
                if line_count % 50 == 0:
                    print(f"[{line_count:6d}] {bkk_time} | {prediction:4s}")
                    
        except KeyboardInterrupt:
            print(f"\n\nStopped. Recorded {line_count} samples.")
            print(f"Output saved to: {output_path}")
            print(f"\nPrediction summary:")
            for pred, count in sorted(prediction_counts.items()):
                pct = count / line_count * 100 if line_count > 0 else 0
                print(f"  {pred}: {count} ({pct:.1f}%)")
    
    ser.close()


if __name__ == "__main__":
    main()
