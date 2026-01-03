# MPU6050 Data Collection Guide

This guide explains how to collect labeled sensor data for ML training.

## Prerequisites

- ESP32 with MPU6050 sensor running `record_data.ino`
- Python with `pyserial` and `pytz` installed
- Camera/phone for recording video

## Data Collection Steps

### 1. Start the Data Logger

```bash
cd backend
python log_mpu6050.py
```

You should see output like:
```
Opened serial port /dev/cu.usbserial-0001 at 115200 baud
Start logging... Press Ctrl+C to stop.
```

### 2. Start Recording Video IMMEDIATELY

⚠️ **Important**: Start your video recording as soon as the logger starts!

The video will be used later to label each data point with the correct activity.

### 3. Perform Activities (1-2 minutes)

Perform the activities you want to collect data for. Make clear, distinct movements so they're easy to identify in the video later.

### 4. Stop Collection

1. Press `Ctrl+C` to stop the data logger
2. Stop your video recording
3. The CSV file will be saved in `backend/collected_data/`

---

## Labeling the Data

### Step 1: Import CSV to Google Sheets or Excel

- Open Google Sheets or Excel
- Import the CSV file
- **Use 1 sheet per CSV file** (don't combine multiple recordings)

### Step 2: Add a "label" Column

Add a new column called `label` at the end of the data.

### Step 3: Watch Video and Label Each Row

Watch your recorded video and match the timestamps to label each row with the corresponding activity.

---

## Activity Labels

Use these exact labels (lowercase, with underscores):

| Label | Description |
|-------|-------------|
| `standing` | Standing still, stable |
| `walking` | Walking/moving around |
| `sitting` | Sitting on chair, stable |
| `sit_to_stand` | Transitioning from sitting to standing |
| `stand_to_sit` | Transitioning from standing to sitting |
| `unstable_standing` | Standing but wobbling/unsteady |
| `falling` | Active fall in progress |
| `after_fall_on_floor` | Lying on floor after a fall |
| `getting_up_from_floor` | Getting up from the floor |

---

## CSV Format

The data logger outputs the following columns:

| Column | Description |
|--------|-------------|
| `timestamp_ms` | Milliseconds since ESP32 boot |
| `ax` | Accelerometer X-axis |
| `ay` | Accelerometer Y-axis |
| `az` | Accelerometer Z-axis |
| `gx` | Gyroscope X-axis |
| `gy` | Gyroscope Y-axis |
| `gz` | Gyroscope Z-axis |
| `bkk_time` | Bangkok local time (for syncing with video) |
| `label` | *(You add this)* Activity label |

---

## Tips for Good Data Collection

1. **Sync video and data**: Note the `bkk_time` in the CSV - it matches real-world time
2. **Clear transitions**: Make distinct movements between activities
3. **Multiple sessions**: Collect multiple 1-2 minute sessions for variety
4. **Different scenarios**: Vary speed, direction, and style of movements
5. **Consistent labeling**: Use the exact labels listed above

---

## Example Workflow

```
Session 1: mpu6050_data_1.csv → Sheet "Session 1"
Session 2: mpu6050_data_2.csv → Sheet "Session 2"
Session 3: mpu6050_data_3.csv → Sheet "Session 3"
```

After labeling, export each sheet back to CSV for ML training.

