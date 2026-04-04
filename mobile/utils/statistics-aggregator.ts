type ReadingType = 'fall' | 'movement' | 'presence' | string | null | undefined;

interface ReadingLike {
  timestamp: string | null | undefined;
  reading_type?: ReadingType;
}

export interface DailyStatisticAggregate {
  stat_date: string;
  total_readings: number;
  fall_readings: number;
  first_reading_at: string | null;
  last_reading_at: string | null;
  last_fall_reading_at: string | null;
}

const toISO = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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
        fall_readings: 0,
        first_reading_at: isoTimestamp,
        last_reading_at: isoTimestamp,
        last_fall_reading_at: null,
      });
    }

    const bucket = buckets.get(statDate)!;
    bucket.total_readings += 1;

    const readingType = reading.reading_type ?? null;
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
  });

  return Array.from(buckets.values()).sort(
    (a, b) => new Date(b.stat_date).getTime() - new Date(a.stat_date).getTime()
  );
};
