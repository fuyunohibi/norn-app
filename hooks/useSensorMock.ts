import { useQuery } from '@tanstack/react-query';

export interface SensorReading {
  id: string;
  type: 'respiration' | 'heart_rate' | 'movement' | 'presence';
  value: number | null;
  unit: string;
  status: 'connected' | 'disconnected' | 'error';
  lastUpdated: Date;
}

export interface SensorMode {
  id: string;
  name: 'Sleep Mode' | 'Fall Mode';
  description: string;
  isActive: boolean;
}

// Mock sensor data generator
const generateMockSensorData = (): SensorReading[] => {
  const now = new Date();
  return [
    {
      id: 'respiration',
      type: 'respiration',
      value: Math.floor(Math.random() * 10) + 12, // 12-22 breaths per minute
      unit: 'bpm',
      status: 'connected',
      lastUpdated: now,
    },
    {
      id: 'heart_rate',
      type: 'heart_rate',
      value: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
      unit: 'bpm',
      status: 'connected',
      lastUpdated: now,
    },
    {
      id: 'movement',
      type: 'movement',
      value: Math.floor(Math.random() * 100), // 0-100 movement intensity
      unit: '%',
      status: 'connected',
      lastUpdated: now,
    },
    {
      id: 'presence',
      type: 'presence',
      value: Math.random() > 0.1 ? 1 : 0, // 90% chance of presence
      unit: '',
      status: 'connected',
      lastUpdated: now,
    },
  ];
};

// Mock sensor modes
const mockSensorModes: SensorMode[] = [
  {
    id: 'sleep',
    name: 'Sleep Mode',
    description: 'Optimized for sleep monitoring and detection',
    isActive: true,
  },
  {
    id: 'fall',
    name: 'Fall Mode',
    description: 'Enhanced fall detection and emergency response',
    isActive: false,
  },
];

export const useSensorReadings = () => {
  return useQuery({
    queryKey: ['sensor-readings'],
    queryFn: async (): Promise<SensorReading[]> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generateMockSensorData();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 3000, // Consider data stale after 3 seconds
  });
};

export const useSensorModes = () => {
  return useQuery({
    queryKey: ['sensor-modes'],
    queryFn: async (): Promise<SensorMode[]> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockSensorModes;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useSensorConnection = () => {
  return useQuery({
    queryKey: ['sensor-connection'],
    queryFn: async (): Promise<{ connected: boolean; deviceName: string }> => {
      // Simulate connection check
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        connected: Math.random() > 0.3, // 70% chance of being connected
        deviceName: 'C1001 SEN0623',
      };
    },
    refetchInterval: 10000, // Check connection every 10 seconds
  });
};
