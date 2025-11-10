import type {
  DailyStatistic,
  DailyStatisticInsert,
  DailyStatisticUpdate,
} from "@/database/types";
import { getMockFallData, getMockSleepData } from "@/utils/mock-statistics";
import { supabase } from "@/utils/supabase";
import { aggregateReadingsToDailyStatistics } from "../utils/statistics-aggregator";

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const SENSOR_READING_TYPES = ["sleep", "fall", "sleep_detection", "fall_detection"] as const;
const SENSOR_READING_FETCH_LIMIT = 2000;

type SensorReadingRow = {
  timestamp: string | null;
  reading_type: string | null;
  raw_data: Record<string, any> | null;
  is_person_detected?: boolean | null;
  is_fall_detected?: boolean | null;
};

const normalizeDailyStatisticRow = (row: DailyStatistic): DailyStatistic => ({
  ...row,
  total_readings: toNumber(row.total_readings),
  sleep_readings: toNumber(row.sleep_readings),
  fall_readings: toNumber(row.fall_readings),
  respiration_sum: toNumber(row.respiration_sum),
  respiration_count: toNumber(row.respiration_count),
  hrv_sum: toNumber(row.hrv_sum),
  hrv_count: toNumber(row.hrv_count),
});

const selectDailyStatistics = async (userId: string, limit: number): Promise<DailyStatistic[]> => {
  const { data, error } = await supabase
    .from("daily_statistics")
    .select("*")
    .eq("user_id", userId)
    .order("stat_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching daily statistics:", error);
    return [];
  }

  return (data ?? []).map((row) => normalizeDailyStatisticRow(row as DailyStatistic));
};

const rebuildDailyStatisticsFromSensorReadings = async (
  userId: string,
  limit: number
): Promise<DailyStatistic[]> => {
  const { data: readings, error: sensorError } = await supabase
    .from("sensor_readings")
    .select("timestamp, reading_type, raw_data, is_person_detected, is_fall_detected")
    .eq("user_id", userId)
    .in("reading_type", SENSOR_READING_TYPES)
    .order("timestamp", { ascending: false })
    .limit(SENSOR_READING_FETCH_LIMIT);

  if (sensorError) {
    console.error("Error fetching sensor readings for statistics rebuild:", sensorError);
    return [];
  }

  const readingRows = (readings ?? []) as SensorReadingRow[];
  if (!readingRows.length) {
    return [];
  }

  const aggregates = aggregateReadingsToDailyStatistics(readingRows);
  if (!aggregates.length) {
    return [];
  }

  const now = new Date().toISOString();
  const payload: DailyStatisticInsert[] = aggregates.map((aggregate) => ({
    user_id: userId,
    stat_date: aggregate.stat_date,
    total_readings: aggregate.total_readings,
    sleep_readings: aggregate.sleep_readings,
    fall_readings: aggregate.fall_readings,
    respiration_sum: aggregate.respiration_sum,
    respiration_count: aggregate.respiration_count,
    hrv_sum: aggregate.hrv_sum,
    hrv_count: aggregate.hrv_count,
    first_reading_at: aggregate.first_reading_at,
    last_reading_at: aggregate.last_reading_at,
    last_sleep_reading_at: aggregate.last_sleep_reading_at,
    last_fall_reading_at: aggregate.last_fall_reading_at,
    created_at: now,
    updated_at: now,
  }));

  const { error: upsertError } = await supabase
    .from("daily_statistics")
    .upsert(payload, { onConflict: "user_id,stat_date" });

  if (upsertError) {
    console.error("Error upserting rebuilt daily statistics:", upsertError);
    // Even if upsert fails, return the aggregates so UI can still display data.
    return payload.slice(0, limit).map((row) =>
      normalizeDailyStatisticRow(
        {
          id: `temp-${row.user_id}-${row.stat_date}`,
          ...row,
        } as DailyStatistic
      )
    );
  }

  return await selectDailyStatistics(userId, limit);
};

export const fetchDailyStatistics = async (
  userId: string,
  limit = 90
): Promise<DailyStatistic[]> => {
  if (!userId) return [];

  const rebuilt = await rebuildDailyStatisticsFromSensorReadings(userId, limit);
  if (rebuilt.length) {
    return rebuilt;
  }

  return await selectDailyStatistics(userId, limit);
};

export const upsertDailyStatistics = async (
  entries: Array<DailyStatisticInsert | DailyStatisticUpdate>
) => {
  if (!entries.length) return;

  const payload = entries.map((entry) => ({
    ...entry,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("daily_statistics")
    .upsert(payload, { onConflict: "user_id,stat_date" });

  if (error) {
    console.error("Error upserting daily statistics:", error);
    throw error;
  }
};

export const seedDailyStatisticsFromMock = async (
  userId: string
): Promise<void> => {
  if (!__DEV__) return;

  const sleepReadings = getMockSleepData(userId).readings || [];
  const fallReadings = getMockFallData(userId).readings || [];
  const combinedReadings = [...sleepReadings, ...fallReadings];

  if (!combinedReadings.length) {
    return;
  }

  const aggregates = aggregateReadingsToDailyStatistics(combinedReadings);

  if (!aggregates.length) {
    return;
  }

  const rows: DailyStatisticInsert[] = aggregates.map((aggregate) => ({
    user_id: userId,
    stat_date: aggregate.stat_date,
    total_readings: aggregate.total_readings,
    sleep_readings: aggregate.sleep_readings,
    fall_readings: aggregate.fall_readings,
    respiration_sum: aggregate.respiration_sum,
    respiration_count: aggregate.respiration_count,
    hrv_sum: aggregate.hrv_sum,
    hrv_count: aggregate.hrv_count,
    first_reading_at: aggregate.first_reading_at,
    last_reading_at: aggregate.last_reading_at,
    last_sleep_reading_at: aggregate.last_sleep_reading_at,
    last_fall_reading_at: aggregate.last_fall_reading_at,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  await supabase
    .from("daily_statistics")
    .upsert(rows, { onConflict: "user_id,stat_date", ignoreDuplicates: false });
};
