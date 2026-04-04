// C1001 / mmWave-style mock sensor types (activity vs fall focus)

export interface HumanData {
  presence: 0 | 1; // 0: No one present, 1: Someone present
  movement: 0 | 1 | 2; // 0: None, 1: Still, 2: Active
  movingRange: number; // Body movement parameters
}

export interface FallData {
  fallState: 0 | 1; // 0: Not fallen, 1: Fallen
  staticResidencyState: 0 | 1; // 0: No stationary dwell, 1: Stationary dwell present
  installHeight: number; // Installation height in cm
  fallTime: number; // Fall duration in seconds
  unmannedTime: number; // Unattended duration in seconds
  fallSensitivity: number; // Fall sensitivity 0-3
}

export interface SensorData {
  humanData: HumanData;
  fallData?: FallData;
  respirationRate: number;
  heartRate: number;
  lastUpdated: Date;
  mode: 'activity' | 'fall';
}

export interface SensorConfig {
  workMode: 1 | 2; // 1: Fall detection, 2: Activity / presence
  hpLedStatus: 0 | 1; // 0: Off, 1: On
  fallLedStatus?: 0 | 1; // 0: Off, 1: On (fall mode only)
}
