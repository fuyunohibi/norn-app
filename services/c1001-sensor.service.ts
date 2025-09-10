import { FallData, SensorConfig, SensorData, SleepComposite, SleepData, SleepStatistics } from '../types/sensor.types';

class C1001SensorService {
  private currentMode: 'sleep' | 'fall' = 'sleep';
  private isConnected = true;

  // Mock data generators
  private generateSleepData(): SleepData {
    return {
      inOrNotInBed: Math.random() > 0.1 ? 1 : 0, // 90% chance in bed
      sleepState: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
      wakeDuration: Math.floor(Math.random() * 120), // 0-120 minutes
      deepSleepDuration: Math.floor(Math.random() * 300), // 0-300 minutes
      sleepQuality: Math.floor(Math.random() * 100), // 0-100 score
      sleepDisturbances: Math.random() > 0.8 ? Math.floor(Math.random() * 3) as 0 | 1 | 2 : 3,
      sleepQualityRating: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
      abnormalStruggle: Math.random() > 0.9 ? 2 : Math.random() > 0.5 ? 1 : 0,
    };
  }

  private generateFallData(): FallData {
    return {
      fallState: Math.random() > 0.95 ? 1 : 0, // 5% chance of fall
      staticResidencyState: Math.random() > 0.3 ? 1 : 0, // 70% chance of stationary
      installHeight: 270, // cm
      fallTime: 5, // seconds
      unmannedTime: 1, // seconds
      fallSensitivity: 3, // 0-3
    };
  }

  private generateSleepComposite(): SleepComposite {
    return {
      presence: Math.random() > 0.05 ? 1 : 0, // 95% chance present
      sleepState: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
      averageRespiration: 12 + Math.floor(Math.random() * 8), // 12-20 breaths/min
      averageHeartbeat: 60 + Math.floor(Math.random() * 40), // 60-100 bpm
      turnoverNumber: Math.floor(Math.random() * 20), // 0-20 turns
      largeBodyMove: Math.floor(Math.random() * 30), // 0-30%
      minorBodyMove: Math.floor(Math.random() * 50), // 0-50%
      apneaEvents: Math.floor(Math.random() * 5), // 0-5 events
    };
  }

  private generateSleepStatistics(): SleepStatistics {
    return {
      sleepQualityScore: 60 + Math.floor(Math.random() * 40), // 60-100
      sleepTime: Math.floor(Math.random() * 20), // 0-20% awake
      wakeDuration: Math.floor(Math.random() * 30), // 0-30% light sleep
      shallowSleepPercentage: 40 + Math.floor(Math.random() * 30), // 40-70%
      deepSleepPercentage: 20 + Math.floor(Math.random() * 30), // 20-50%
      timeOutOfBed: Math.floor(Math.random() * 60), // 0-60 minutes
      exitCount: Math.floor(Math.random() * 5), // 0-5 times
      turnOverCount: Math.floor(Math.random() * 25), // 0-25 turns
      averageRespiration: 14 + Math.floor(Math.random() * 6), // 14-20
      averageHeartbeat: 65 + Math.floor(Math.random() * 25), // 65-90
    };
  }

  private getSleepStateText(state: number): string {
    switch (state) {
      case 0: return 'Deep Sleep';
      case 1: return 'Light Sleep';
      case 2: return 'Awake';
      case 3: return 'None';
      default: return 'Unknown';
    }
  }

  private getSleepQualityText(rating: number): string {
    switch (rating) {
      case 1: return 'Good';
      case 2: return 'Average';
      case 3: return 'Poor';
      default: return 'None';
    }
  }

  private getMovementText(movement: number): string {
    switch (movement) {
      case 0: return 'None';
      case 1: return 'Still';
      case 2: return 'Active';
      default: return 'Unknown';
    }
  }

  // Public methods
  async getSensorData(): Promise<SensorData> {
    if (!this.isConnected) {
      throw new Error('Sensor not connected');
    }

    const humanData = {
      presence: (Math.random() > 0.05 ? 1 : 0) as 0 | 1,
      movement: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      movingRange: Math.floor(Math.random() * 100),
    };

    const respirationRate = 12 + Math.floor(Math.random() * 8);
    const heartRate = 60 + Math.floor(Math.random() * 40);

    const baseData: SensorData = {
      humanData,
      respirationRate,
      heartRate,
      lastUpdated: new Date(),
      mode: this.currentMode,
    };

    if (this.currentMode === 'sleep') {
      baseData.sleepData = this.generateSleepData();
      baseData.sleepComposite = this.generateSleepComposite();
      baseData.sleepStatistics = this.generateSleepStatistics();
    } else {
      baseData.fallData = this.generateFallData();
    }

    return baseData;
  }

  async getSensorConfig(): Promise<SensorConfig> {
    return {
      workMode: this.currentMode === 'sleep' ? 2 : 1,
      hpLedStatus: 1,
      fallLedStatus: this.currentMode === 'fall' ? 1 : undefined,
    };
  }

  setMode(mode: 'sleep' | 'fall') {
    this.currentMode = mode;
  }

  getCurrentMode(): 'sleep' | 'fall' {
    return this.currentMode;
  }

  // Helper methods for UI display
  getSleepStateDisplay(sleepData?: SleepData): string {
    if (!sleepData) return 'No Data';
    return this.getSleepStateText(sleepData.sleepState);
  }

  getSleepQualityDisplay(sleepData?: SleepData): string {
    if (!sleepData) return 'No Data';
    return this.getSleepQualityText(sleepData.sleepQualityRating);
  }

  getMovementDisplay(humanData: any): string {
    return this.getMovementText(humanData.movement);
  }

  getFallStatusDisplay(fallData?: FallData): string {
    if (!fallData) return 'No Data';
    return fallData.fallState === 1 ? 'Fall Detected' : 'Safe';
  }

  getPresenceDisplay(humanData: any): string {
    return humanData.presence === 1 ? 'Present' : 'Not Present';
  }
}

export const c1001SensorService = new C1001SensorService();
