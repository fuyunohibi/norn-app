import { FallData, HumanData, SensorConfig, SensorData } from '../types/sensor.types';

class C1001SensorService {
  private currentMode: 'activity' | 'fall' = 'activity';
  private isConnected = true;

  private generateFallData(): FallData {
    return {
      fallState: Math.random() > 0.95 ? 1 : 0,
      staticResidencyState: Math.random() > 0.3 ? 1 : 0,
      installHeight: 270,
      fallTime: 5,
      unmannedTime: 1,
      fallSensitivity: 3,
    };
  }

  private getMovementText(movement: number): string {
    switch (movement) {
      case 0:
        return 'None';
      case 1:
        return 'Still';
      case 2:
        return 'Active';
      default:
        return 'Unknown';
    }
  }

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

    if (this.currentMode === 'fall') {
      baseData.fallData = this.generateFallData();
    }

    return baseData;
  }

  async getSensorConfig(): Promise<SensorConfig> {
    return {
      workMode: this.currentMode === 'activity' ? 2 : 1,
      hpLedStatus: 1,
      fallLedStatus: this.currentMode === 'fall' ? 1 : undefined,
    };
  }

  setMode(mode: 'activity' | 'fall') {
    this.currentMode = mode;
  }

  getCurrentMode(): 'activity' | 'fall' {
    return this.currentMode;
  }

  getMovementDisplay(humanData: HumanData): string {
    return this.getMovementText(humanData.movement);
  }

  getFallStatusDisplay(fallData?: FallData): string {
    if (!fallData) return 'No Data';
    return fallData.fallState === 1 ? 'Fall Detected' : 'Safe';
  }

  getPresenceDisplay(humanData: HumanData): string {
    return humanData.presence === 1 ? 'Present' : 'Not Present';
  }
}

export const c1001SensorService = new C1001SensorService();
