type ReadingType =
  | "sleep"
  | "fall"
  | "movement"
  | "presence"
  | "sleep_detection"
  | "fall_detection"
  | string
  | null
  | undefined;

interface ReadingLike {
  timestamp: string | null | undefined;
  reading_type?: ReadingType;
  raw_data?: Record<string, any> | null | undefined;
  is_person_detected?: boolean | null | undefined;
  is_fall_detected?: boolean | null | undefined;
}

const normalizeReadingType = (readingType: ReadingType): "sleep" | "fall" | null => {
  if (!readingType) return null;
  const value = readingType.toString().toLowerCase();
  if (value.includes("sleep")) {
    return "sleep";
  }
  if (value.includes("fall")) {
    return "fall";
  }
  return null;
};

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

const extractRespiration = (
  rawData: Record<string, any> | null | undefined
): number | null => {
  if (!rawData) return null;
  const candidates = [
    rawData.respiration_rate,
    rawData.respirationRate,
    rawData.breathingRate,
    rawData.avg_respiration,
    rawData.statistics?.avg_respiration,
    rawData.comprehensive?.avg_respiration,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }
  }
  return null;
};

const extractHRV = (
  rawData: Record<string, any> | null | undefined
): number | null => {
  if (!rawData) return null;
  const candidates = [
    rawData.hrv,
    rawData.heart_rate_variability,
    rawData.heartRateVariability,
    rawData.avg_hrv,
    rawData.statistics?.avg_hrv,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }
  }
  return null;
};

const determineCategory = (reading: ReadingLike): "sleep" | "fall" | null => {
  const fromReadingType = normalizeReadingType(reading.reading_type);
  const fromMode = normalizeReadingType(reading.raw_data?.mode);
  const category = fromMode ?? fromReadingType;

  if (!category) {
    return null;
  }

  if (category === "sleep") {
    const raw = reading.raw_data ?? {};
    const inBed =
      raw.in_bed === 1 ||
      raw.presence === 1 ||
      raw.comprehensive?.presence === 1;
    const sleepStatus =
      typeof raw.sleep_status === "number" ? raw.sleep_status : null;
    const personDetected = reading.is_person_detected === true;

    const hasSignals =
      inBed || personDetected || (sleepStatus !== null && sleepStatus > 0);

    if (!reading.raw_data && reading.is_person_detected == null) {
      return "sleep";
    }

    if (hasSignals) {
      return "sleep";
    }
    return null;
  }

  if (category === "fall") {
    const raw = reading.raw_data ?? {};
    const fallStatus =
      typeof raw.fall_status === "number" ? raw.fall_status : null;
    const motion = typeof raw.motion === "number" ? raw.motion : null;
    const fallDetected = reading.is_fall_detected === true;

    const bodyMovement =
      typeof raw.body_movement === "number" ? raw.body_movement : null;

    const hasSignals =
      fallDetected ||
      fallStatus === 1 ||
      (motion !== null && motion >= 3) ||
      (bodyMovement !== null && bodyMovement >= 20);

    if (!reading.raw_data && reading.is_fall_detected == null) {
      return "fall";
    }

    if (hasSignals) {
      return "fall";
    }
    return null;
  }

  return null;
};

export const aggregateReadingsToDailyStatistics = (
  readings: ReadingLike[]
): DailyStatisticAggregate[] => {
  const buckets = new Map<string, DailyStatisticAggregate>();

  readings.forEach((reading) => {
    const isoTimestamp = toISO(reading.timestamp ?? undefined);
    if (!isoTimestamp) {
      return;
    }

    const category = determineCategory(reading);
    if (!category) {
      return;
    }

    const date = new Date(isoTimestamp);
    const statDate = date.toISOString().split("T")[0];

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

    if (category === "sleep") {
      bucket.sleep_readings += 1;
      if (
        !bucket.last_sleep_reading_at ||
        new Date(isoTimestamp) > new Date(bucket.last_sleep_reading_at)
      ) {
        bucket.last_sleep_reading_at = isoTimestamp;
      }
    }
    if (category === "fall") {
      bucket.fall_readings += 1;
      if (
        !bucket.last_fall_reading_at ||
        new Date(isoTimestamp) > new Date(bucket.last_fall_reading_at)
      ) {
        bucket.last_fall_reading_at = isoTimestamp;
      }
    }

    if (
      !bucket.first_reading_at ||
      new Date(isoTimestamp) < new Date(bucket.first_reading_at)
    ) {
      bucket.first_reading_at = isoTimestamp;
    }
    if (
      !bucket.last_reading_at ||
      new Date(isoTimestamp) > new Date(bucket.last_reading_at)
    ) {
      bucket.last_reading_at = isoTimestamp;
    }

    const respiration = extractRespiration(reading.raw_data);
    if (typeof respiration === "number") {
      bucket.respiration_sum += respiration;
      bucket.respiration_count += 1;
    }

    const hrv = extractHRV(reading.raw_data);
    if (typeof hrv === "number") {
      bucket.hrv_sum += hrv;
      bucket.hrv_count += 1;
    }
  });

  return Array.from(buckets.values()).sort(
    (a, b) => new Date(b.stat_date).getTime() - new Date(a.stat_date).getTime()
  );
};
