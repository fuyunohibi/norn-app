// C1001 Sensor Data Types based on documentation

export interface HumanData {
  presence: 0 | 1; // 0: No one present, 1: Someone present
  movement: 0 | 1 | 2; // 0: None, 1: Still, 2: Active
  movingRange: number; // Body movement parameters
}

export interface SleepData {
  inOrNotInBed: 0 | 1; // 0: Out of bed, 1: In bed
  sleepState: 0 | 1 | 2 | 3; // 0: Deep sleep, 1: Light sleep, 2: Awake, 3: None
  wakeDuration: number; // Awake duration
  deepSleepDuration: number; // Deep sleep duration
  sleepQuality: number; // Sleep quality score
  sleepDisturbances: 0 | 1 | 2 | 3; // 0: <4h, 1: >12h, 2: Long absence, 3: None
  sleepQualityRating: 0 | 1 | 2 | 3; // 0: None, 1: Good, 2: Average, 3: Poor
  abnormalStruggle: 0 | 1 | 2; // 0: None, 1: Normal, 2: Abnormal
}

export interface FallData {
  fallState: 0 | 1; // 0: Not fallen, 1: Fallen
  staticResidencyState: 0 | 1; // 0: No stationary dwell, 1: Stationary dwell present
  installHeight: number; // Installation height in cm
  fallTime: number; // Fall duration in seconds
  unmannedTime: number; // Unattended duration in seconds
  fallSensitivity: number; // Fall sensitivity 0-3
}

export interface SleepComposite {
  presence: 0 | 1;
  sleepState: 0 | 1 | 2 | 3;
  averageRespiration: number;
  averageHeartbeat: number;
  turnoverNumber: number;
  largeBodyMove: number; // Proportion of significant body movement
  minorBodyMove: number; // Proportion of minor body movement
  apneaEvents: number; // Number of apneas
}

export interface SleepStatistics {
  sleepQualityScore: number;
  sleepTime: number; // Proportion of awake time
  wakeDuration: number; // Proportion of light sleep time
  shallowSleepPercentage: number;
  deepSleepPercentage: number;
  timeOutOfBed: number;
  exitCount: number; // Number of times out of bed
  turnOverCount: number; // Number of turns
  averageRespiration: number;
  averageHeartbeat: number;
}

export interface SensorData {
  humanData: HumanData;
  sleepData?: SleepData;
  fallData?: FallData;
  sleepComposite?: SleepComposite;
  sleepStatistics?: SleepStatistics;
  respirationRate: number;
  heartRate: number;
  lastUpdated: Date;
  mode: 'sleep' | 'fall';
}

export interface SensorConfig {
  workMode: 1 | 2; // 1: Fall detection, 2: Sleep detection
  hpLedStatus: 0 | 1; // 0: Off, 1: On
  fallLedStatus?: 0 | 1; // 0: Off, 1: On (fall mode only)
}
