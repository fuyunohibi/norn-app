type ReadingType = 'sleep' | 'fall' | 'movement' | 'presence' | string | null | undefined;

interface ReadingLike {
  timestamp: string | null | undefined;
  reading_type?: ReadingType;
  raw_data?: Record<string, any> | null | undefined;
}

export interface DailyStatisticAggregate {
  stat_date: string;
  total_readings: number;
  sleep_readings: number;
  fall_readings: number;
  respiration_sum: number;
  respiration_count: number;
  hrv_sum: number;
  hrv_count: number;
  first_reading_at: string | null;
  last_reading_at: string | null;
  last_sleep_reading_at: string | null;
  last_fall_reading_at: string | null;
}

const toISO = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const extractRespiration = (rawData: Record<string, any> | null | undefined): number | null => {
  if (!rawData) return null;
  const candidates = [
    rawData.respiration_rate,
    rawData.respirationRate,
    rawData.breathingRate,
    rawData.avg_respiration,
  ];
  for (const value of candidates) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
  }
  return null;
};

const extractHRV = (rawData: Record<string, any> | null | undefined): number | null => {
  if (!rawData) return null;
  const candidates = [
    rawData.hrv,
    rawData.heart_rate_variability,
    rawData.heartRateVariability,
    rawData.avg_hrv,
  ];
  for (const value of candidates) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
  }
  return null;
};

export const aggregateReadingsToDailyStatistics = (readings: ReadingLike[]): DailyStatisticAggregate[] => {
  const buckets = new Map<string, DailyStatisticAggregate>();

  readings.forEach((reading) => {
    const isoTimestamp = toISO(reading.timestamp ?? undefined);
    if (!isoTimestamp) {
      return;
    }

    const date = new Date(isoTimestamp);
    const statDate = date.toISOString().split('T')[0];

    if (!buckets.has(statDate)) {
      buckets.set(statDate, {
        stat_date: statDate,
        total_readings: 0,
        sleep_readings: 0,
        fall_readings: 0,
        respiration_sum: 0,
        respiration_count: 0,
        hrv_sum: 0,
        hrv_count: 0,
        first_reading_at: isoTimestamp,
        last_reading_at: isoTimestamp,
        last_sleep_reading_at: null,
        last_fall_reading_at: null,
      });
    }

    const bucket = buckets.get(statDate)!;
    bucket.total_readings += 1;

    const readingType = reading.reading_type ?? null;
    if (readingType === 'sleep') {
      bucket.sleep_readings += 1;
      if (!bucket.last_sleep_reading_at || new Date(isoTimestamp) > new Date(bucket.last_sleep_reading_at)) {
        bucket.last_sleep_reading_at = isoTimestamp;
      }
    }
    if (readingType === 'fall') {
      bucket.fall_readings += 1;
      if (!bucket.last_fall_reading_at || new Date(isoTimestamp) > new Date(bucket.last_fall_reading_at)) {
        bucket.last_fall_reading_at = isoTimestamp;
      }
    }

    if (!bucket.first_reading_at || new Date(isoTimestamp) < new Date(bucket.first_reading_at)) {
      bucket.first_reading_at = isoTimestamp;
    }
    if (!bucket.last_reading_at || new Date(isoTimestamp) > new Date(bucket.last_reading_at)) {
      bucket.last_reading_at = isoTimestamp;
    }

    const respiration = extractRespiration(reading.raw_data);
    if (typeof respiration === 'number') {
      bucket.respiration_sum += respiration;
      bucket.respiration_count += 1;
    }

    const hrv = extractHRV(reading.raw_data);
    if (typeof hrv === 'number') {
      bucket.hrv_sum += hrv;
      bucket.hrv_count += 1;
    }
  });

  return Array.from(buckets.values()).sort(
    (a, b) => new Date(b.stat_date).getTime() - new Date(a.stat_date).getTime()
  );
};


