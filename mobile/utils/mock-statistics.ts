/**
 * Mock statistics data for development and visualization
 */

interface MockReading {
  id: string;
  reading_type: 'sleep' | 'fall' | 'movement' | 'presence';
  timestamp: string;
  raw_data?: any;
  is_person_detected?: boolean;
  is_movement_detected?: boolean;
  is_fall_detected?: boolean;
  sleep_quality_score?: number;
}

/**
 * Generate mock sleep detection readings
 */
const generateMockSleepReadings = (count: number = 150): MockReading[] => {
  const readings: MockReading[] = [];
  const now = new Date();
  
  // Generate readings over the past 7 days
  for (let i = 0; i < count; i++) {
    // Spread readings over the past 7 days
    const daysAgo = Math.floor(i / (count / 7));
    const hoursAgo = (i % (count / 7)) * (24 / (count / 7));
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    timestamp.setMinutes(Math.floor(Math.random() * 60));
    
    readings.push({
      id: `sleep-${i}`,
      reading_type: 'sleep',
      timestamp: timestamp.toISOString(),
      is_person_detected: true,
      is_movement_detected: Math.random() > 0.7,
      sleep_quality_score: Math.random() * 100,
      raw_data: {
        distance: 50 + Math.random() * 30,
        movement_intensity: Math.random() * 100,
        respiration_rate: 12 + Math.random() * 6,
        heart_rate: 60 + Math.random() * 20,
        hrv: 60 + Math.random() * 40,
      },
    });
  }
  
  // Sort by timestamp descending (most recent first)
  return readings.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Generate mock fall detection readings
 */
const generateMockFallReadings = (count: number = 25): MockReading[] => {
  const readings: MockReading[] = [];
  const now = new Date();
  
  // Generate readings over the past 7 days (fewer than sleep)
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    timestamp.setMinutes(Math.floor(Math.random() * 60));
    
    readings.push({
      id: `fall-${i}`,
      reading_type: 'fall',
      timestamp: timestamp.toISOString(),
      is_person_detected: true,
      is_fall_detected: Math.random() > 0.8, // 20% chance of fall
      raw_data: {
        distance: 30 + Math.random() * 40,
        movement_intensity: 80 + Math.random() * 20,
        fall_confidence: Math.random() * 100,
      },
    });
  }
  
  // Sort by timestamp descending (most recent first)
  return readings.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Get mock sleep detection data
 */
export const getMockSleepData = (userId?: string) => {
  return {
    readings: generateMockSleepReadings(150),
  };
};

/**
 * Get mock fall detection data
 */
export const getMockFallData = (userId?: string) => {
  return {
    readings: generateMockFallReadings(25),
  };
};

/**
 * Check if mock data should be used
 * Set this to true to enable mock data
 */
export const USE_MOCK_STATISTICS = __DEV__; // Enable in development mode

