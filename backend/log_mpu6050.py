import serial
import csv
import datetime
import pytz
import os

# ---------- CONFIG ----------
SERIAL_PORT = "/dev/cu.usbserial-0001"
BAUD_RATE = 115200

# Output folder: ./collected_data/ (relative to this script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "collected_data")
os.makedirs(DATA_DIR, exist_ok=True)

OUTPUT_CSV = os.path.join(DATA_DIR, "mpu6050_data_20.csv")

# Timezone for Bangkok
BKK_TZ = pytz.timezone("Asia/Bangkok")

# ---------- SCRIPT ----------
def main():
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    print(f"Opened serial port {SERIAL_PORT} at {BAUD_RATE} baud")

    with open(OUTPUT_CSV, mode="w", newline="") as f:
        writer = csv.writer(f)

        # CSV header (we define it; Arduino sends no header)
        header = [
            "timestamp_ms",  # from ESP32
            "ax", "ay", "az",
            "gx", "gy", "gz",
            "bkk_time"       # local real-world time string
        ]
        writer.writerow(header)

        print("Start logging... Press Ctrl+C to stop.")
        try:
            while True:
                line = ser.readline().decode("utf-8", errors="ignore").strip()
                if not line:
                    continue

                parts = line.split(",")
                if len(parts) != 7:
                    # Not a valid data line; skip
                    # print("Skipping line:", line)
                    continue

                # Get current Bangkok time
                now_utc = datetime.datetime.utcnow().replace(tzinfo=pytz.utc)
                now_bkk = now_utc.astimezone(BKK_TZ)
                bkk_str = now_bkk.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]  # e.g. 2025-12-09 15:32:40.123

                row = parts + [bkk_str]
                writer.writerow(row)
                f.flush()  # ensure data is written

                print(row)

        except KeyboardInterrupt:
            print("\nStopped by user.")
        finally:
            ser.close()
            print("Serial port closed, CSV saved:", OUTPUT_CSV)

if __name__ == "__main__":
    main()