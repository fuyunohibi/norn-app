/**
 * Mock fall / movement readings for dev seeding of daily_statistics (optional).
 */

interface MockReading {
  id: string;
  reading_type: 'fall' | 'movement' | 'presence';
  timestamp: string;
  raw_data?: Record<string, unknown>;
  is_person_detected?: boolean;
  is_movement_detected?: boolean;
  is_fall_detected?: boolean;
}

/** Date list used only as a timeline reference for scattered fall events. */
const REFERENCE_DATE_STRINGS = [
  '2025-11-06',
  '2025-11-05',
  '2025-11-04 03:10:36',
  '2025-11-04 03:10:36',
  '2025-11-03 03:08:42',
  '2025-11-02 02:37:44',
  '2025-11-01 03:07:51',
  '2025-10-31 03:07:00',
  '2025-10-30 03:12:37',
  '2025-10-29 03:35:10',
  '2025-10-29 03:35:10',
  '2025-10-28 02:26:52',
  '2025-10-27 03:59:26',
  '2025-10-26 03:51:34',
  '2025-10-25 02:39:02',
  '2025-10-24 03:26:58',
  '2025-10-23 04:31:20',
  '2025-10-22 04:37:25',
  '2025-10-21 04:33:17',
  '2025-10-20 02:29:33',
  '2025-10-19 01:43:42',
  '2025-10-18 01:17:51',
  '2025-10-17 00:25:04',
  '2025-10-16 01:09:53',
  '2025-10-15 04:13:16',
  '2025-10-14 04:00:16',
  '2025-10-14 04:00:16',
  '2025-10-13 04:06:29',
  '2025-10-12 03:56:50',
  '2025-10-11 02:27:33',
  '2025-10-11 02:27:33',
  '2025-10-10 03:44:55',
  '2025-10-09 03:34:49',
  '2025-10-08 04:43:33',
  '2025-10-07 00:29:24',
  '2025-10-07 00:29:24',
  '2025-10-06 04:30:49',
  '2025-10-06 04:30:49',
  '2025-10-05 03:48:01',
  '2025-10-04 03:46:46',
  '2025-10-03 04:15:54',
  '2025-10-02 03:13:27',
  '2025-10-01 04:02:53',
  '2025-09-30 04:18:59',
  '2025-09-29 04:21:37',
  '2025-09-29 04:21:37',
  '2025-09-28 03:46:11',
  '2025-09-28 03:46:11',
  '2025-09-27 03:42:18',
  '2025-09-27 03:42:18',
  '2025-09-26 05:50:47',
  '2025-09-25 00:29:31',
  '2025-09-24 04:38:38',
  '2025-09-23 02:00:57',
  '2025-09-22 02:35:40',
  '2025-09-21 02:55:51',
  '2025-09-20 01:39:53',
  '2025-09-18 23:23:35',
  '2025-09-18 03:30:48',
  '2025-09-18 03:30:48',
  '2025-09-17 03:58:01',
  '2025-09-15 00:55:36',
  '2025-09-13 22:54:22',
  '2025-09-13 00:26:50',
  '2025-09-12 03:03:55',
  '2025-09-12 03:03:55',
  '2025-09-11 02:02:22',
  '2025-09-11 02:02:22',
  '2025-09-10 04:59:56',
  '2025-09-10 04:59:56',
  '2025-09-09 00:58:22',
  '2025-09-08 01:44:45',
  '2025-09-07 00:42:31',
  '2025-09-07 00:42:31',
  '2025-09-06 04:46:45',
  '2025-09-04 21:32:26',
  '2025-09-04 01:54:43',
  '2025-09-03 01:20:48',
  '2025-09-01 23:47:26',
  '2025-09-01 02:06:44',
  '2025-08-31 03:36:48',
  '2025-08-30 03:33:00',
  '2025-08-29 03:36:53',
  '2025-08-28 02:33:24',
  '2025-08-27 03:11:57',
  '2025-08-26 02:44:39',
  '2025-08-25 04:50:15',
  '2025-08-25 04:50:15',
  '2025-08-24 03:48:43',
  '2025-08-23 00:29:04',
  '2025-08-23 00:29:04',
  '2025-08-22 02:24:22',
  '2025-08-21 01:38:35',
  '2025-08-20 04:31:04',
  '2025-08-19 03:18:19',
  '2025-08-18 04:11:37',
  '2025-08-18 04:11:37',
  '2025-08-17 04:16:15',
  '2025-08-16 01:27:43',
  '2025-08-15 01:19:27',
  '2025-08-14 01:34:38',
  '2025-08-13 02:25:11',
];

const normalizeTimestamp = (input: string, index: number): string => {
  const hasTime = input.includes(' ');
  const datePart = input.split(' ')[0];
  const defaultTimes = ['02:30:00', '03:15:00', '01:45:00', '04:05:00'];
  const time = hasTime ? input.split(' ')[1] : defaultTimes[index % defaultTimes.length];
  const iso = `${datePart}T${time}Z`;
  return new Date(iso).toISOString();
};

const REFERENCE_TIMESTAMPS = REFERENCE_DATE_STRINGS.map((input, index) =>
  normalizeTimestamp(input, index),
);

const FALL_SESSION_COUNT = 160;

const generateMockFallReadings = (): MockReading[] => {
  const referenceDates = REFERENCE_TIMESTAMPS.map((ts) => new Date(ts).getTime());
  const readings: MockReading[] = [];

  for (let i = 0; i < FALL_SESSION_COUNT; i++) {
    const refIndex = i % referenceDates.length;
    const baseTime = referenceDates[refIndex];
    const offsetMinutes = (i % 16) * 9 + Math.floor(i / 32);
    const offsetMillis = offsetMinutes * 60 * 1000;
    const timestamp = new Date(baseTime - offsetMillis - i * 45000).toISOString();

    readings.push({
      id: `fall-${i}`,
      reading_type: 'fall',
      timestamp,
      is_person_detected: true,
      is_fall_detected: i % 6 === 0,
      raw_data: {
        distance: 40 + (i % 20),
        movement_intensity: 65 + ((i * 7) % 35),
        fall_confidence: 55 + ((i * 13) % 45),
        fall_risk_level: i % 6 === 0 ? 'critical' : i % 3 === 0 ? 'warning' : 'low',
      },
    });
  }

  return readings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getMockFallData = (_userId?: string) => ({
  readings: generateMockFallReadings(),
});
