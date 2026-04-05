import type { EmergencyContact } from "@/database/types";
import type {
  ActivityStatistics,
  ImuWearableStatusResponse,
} from "../services/backend-api.service";

/** Fixed “today” window for stable previews in Storybook / dev. */
const MOCK_DAY_START = new Date();
MOCK_DAY_START.setHours(0, 0, 0, 0);

function atToday(hours: number, minutes: number): string {
  const d = new Date(MOCK_DAY_START);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

/** UTC midnight of “today” (matches `bucketActivityEventsByDay` bucketing). */
function utcTodayMidnightMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** `dayOffset` 0 = today UTC, -1 = yesterday, etc. */
function atUtcDay(dayOffset: number, hourUTC: number, minuteUTC: number): string {
  const d = new Date(utcTodayMidnightMs() + dayOffset * 86_400_000);
  d.setUTCHours(hourUTC, minuteUTC, 0, 0);
  return d.toISOString();
}

const MOCK_STATS_ACTIVITY_ROTATION = [
  "walking",
  "sitting",
  "standing",
  "walking",
  "sitting",
  "running",
  "walking",
  "standing",
  "unstable_standing",
  "walking",
  "sitting",
  "falling",
  "after_fall",
] as const;

const MOCK_STATS_SECONDS_PER_ACTIVITY: Record<string, number> = {
  walking: 3 * 60,
  sitting: 18 * 60,
  standing: 5 * 60,
  running: 4 * 60,
  unstable_standing: 45,
  falling: 25,
  after_fall: 8 * 60,
};

function buildMockPeriodStatistics(
  period: "7d" | "30d",
  dailyEventCounts: number[],
): ActivityStatistics {
  const n = dailyEventCounts.length;
  const events: ActivityStatistics["events"] = [];
  for (let i = 0; i < n; i++) {
    const dayOffset = i - (n - 1);
    const count = dailyEventCounts[i] ?? 0;
    for (let j = 0; j < count; j++) {
      const activity = MOCK_STATS_ACTIVITY_ROTATION[j % MOCK_STATS_ACTIVITY_ROTATION.length]!;
      const hourUTC = 6 + Math.floor(((j * 37) % 14) + (j % 3));
      const minuteUTC = (j * 11) % 60;
      events.push({
        activity,
        created_at: atUtcDay(dayOffset, hourUTC, minuteUTC),
      });
    }
  }

  const by_activity: ActivityStatistics["by_activity"] = {};
  for (const ev of events) {
    const a = ev.activity;
    const sec = MOCK_STATS_SECONDS_PER_ACTIVITY[a] ?? 120;
    if (!by_activity[a]) {
      by_activity[a] = { count: 0, total_seconds: 0 };
    }
    by_activity[a]!.count += 1;
    by_activity[a]!.total_seconds += sec;
  }

  const oldestOffset = -(n - 1);
  const from = atUtcDay(oldestOffset, 0, 0);
  const to = new Date().toISOString();

  return {
    period,
    from,
    to,
    total_events: events.length,
    by_activity,
    events,
  };
}

/** 7-day window: event counts per UTC day (oldest → today). */
const MOCK_STATS_7D_DAILY_COUNTS = [9, 12, 10, 15, 11, 18, 14];

/** 30-day window: synthetic trend (oldest → today); chart uses the last 14 UTC days. */
const MOCK_STATS_30D_DAILY_COUNTS = [
  4, 5, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17, 19, 16,
];

export const MOCK_STATS_ACTIVITY_7D: ActivityStatistics = buildMockPeriodStatistics(
  "7d",
  MOCK_STATS_7D_DAILY_COUNTS,
);

export const MOCK_STATS_ACTIVITY_30D: ActivityStatistics = buildMockPeriodStatistics(
  "30d",
  MOCK_STATS_30D_DAILY_COUNTS,
);

export const MOCK_HOME_USER_ID = "00000000-0000-0000-0000-000000000001";

export const MOCK_HOME_ACTIVITY_STATISTICS: ActivityStatistics = {
  period: "today",
  from: MOCK_DAY_START.toISOString(),
  to: new Date().toISOString(),
  total_events: 47,
  by_activity: {
    walking: { count: 18, total_seconds: 42 * 60 },
    sitting: { count: 12, total_seconds: 95 * 60 },
    standing: { count: 9, total_seconds: 28 * 60 },
    running: { count: 2, total_seconds: 8 * 60 },
    unstable_standing: { count: 1, total_seconds: 45 },
  },
  events: [
    { activity: "walking", created_at: atToday(8, 5) },
    { activity: "standing", created_at: atToday(8, 42) },
    { activity: "sitting", created_at: atToday(9, 10) },
    { activity: "walking", created_at: atToday(10, 3) },
    { activity: "running", created_at: atToday(10, 48) },
    { activity: "walking", created_at: atToday(11, 2) },
    { activity: "sitting", created_at: atToday(12, 15) },
    { activity: "walking", created_at: atToday(14, 20) },
    { activity: "unstable_standing", created_at: atToday(15, 5) },
    { activity: "walking", created_at: atToday(15, 8) },
    { activity: "sitting", created_at: atToday(16, 40) },
  ],
};

export const MOCK_HOME_IMU_STATUS: ImuWearableStatusResponse = {
  status: "ok",
  online: true,
  last_seen_at: new Date().toISOString(),
  age_seconds: 12,
  activity_code: "w",
  activity_label: "Walking",
  device_id: "mock-clip-01",
};

export const MOCK_HOME_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    user_id: MOCK_HOME_USER_ID,
    full_name: "Alex Morgan",
    phone_number: "+1 555 0100",
    relationship: "Partner",
    is_primary: true,
    priority: 0,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    user_id: MOCK_HOME_USER_ID,
    full_name: "Jordan Lee",
    phone_number: "+1 555 0199",
    relationship: "Neighbor",
    is_primary: false,
    priority: 1,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
