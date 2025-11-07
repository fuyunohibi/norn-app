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

interface WhoopSleepRow {
  date: string;
  cycleStart: string;
  sleepOnset?: string;
  wakeOnset?: string;
  performance: number;
  respiration: number;
  asleepMinutes: number;
  inBedMinutes: number;
  lightMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  sleepNeedMinutes: number | null;
  sleepDebtMinutes: number | null;
  efficiency: number;
  consistency: number | null;
}

const WHOOP_SLEEP_CSV = `Cycle start time,Cycle end time,Cycle timezone,Sleep onset,Wake onset,Sleep performance %,Respiratory rate (rpm),Asleep duration (min),In bed duration (min),Light sleep duration (min),Deep (SWS) duration (min),REM duration (min),Awake duration (min),Sleep need (min),Sleep debt (min),Sleep efficiency %,Sleep consistency %,Nap
2025-11-05 04:59:53,,UTC+07:00,2025-11-05 04:59:53,2025-11-05 10:59:08,49,13.6,286,359,97,104,85,73,530,127,80,49,false
2025-11-04 03:10:36,2025-11-05 04:59:53,UTC+07:00,2025-11-04 03:10:36,2025-11-04 09:17:37,66,13.7,327,367,174,112,41,40,627,127,89,88,false
2025-11-03 03:08:42,2025-11-04 03:10:36,UTC+07:00,2025-11-03 03:08:42,2025-11-03 08:49:43,53,13.7,283,341,133,88,62,58,596,114,83,79,false
2025-11-02 02:37:44,2025-11-03 03:08:42,UTC+07:00,2025-11-02 02:37:44,2025-11-02 10:28:21,82,13.7,427,470,229,69,129,43,605,127,91,79,false
2025-11-01 03:07:51,2025-11-02 02:37:44,UTC+07:00,2025-11-01 03:07:51,2025-11-01 10:29:52,62,13.5,347,442,169,108,70,95,604,127,78,75,false
2025-10-31 03:07:00,2025-11-01 03:07:51,UTC+07:00,2025-10-31 03:07:00,2025-10-31 09:30:20,58,13.9,317,383,107,94,116,66,610,127,83,71,false
2025-10-30 03:12:37,2025-10-31 03:07:00,UTC+07:00,2025-10-30 03:12:37,2025-10-30 08:59:45,65,14.1,297,347,135,91,71,50,495,127,85,53,false
2025-10-29 03:35:10,2025-10-30 03:12:37,UTC+07:00,2025-10-29 03:35:10,2025-10-29 11:04:12,77,13.7,407,449,166,121,120,42,625,127,90,70,false
2025-10-28 02:26:52,2025-10-29 03:35:10,UTC+07:00,2025-10-28 02:26:52,2025-10-28 08:09:53,61,13.8,319,343,155,100,64,24,608,127,93,56,false
2025-10-27 03:59:26,2025-10-28 02:26:52,UTC+07:00,2025-10-27 03:59:26,2025-10-27 11:48:04,63,13.7,372,468,198,86,88,96,610,127,79,65,false
2025-10-26 03:51:34,2025-10-27 03:59:26,UTC+07:00,2025-10-26 03:51:34,2025-10-26 09:04:47,52,13.5,271,313,119,105,47,42,607,127,86,80,false
2025-10-25 02:39:02,2025-10-26 03:51:34,UTC+07:00,2025-10-25 02:39:02,2025-10-25 09:48:33,70,13.7,376,429,221,66,89,53,642,127,87,67,false
2025-10-24 03:26:58,2025-10-25 02:39:02,UTC+07:00,2025-10-24 03:26:58,2025-10-24 08:29:59,40,13.6,255,303,108,103,44,48,631,127,87,63,false
2025-10-23 04:31:20,2025-10-24 03:26:58,UTC+07:00,2025-10-23 04:31:20,2025-10-23 10:51:21,60,13.8,321,380,150,99,72,59,609,127,85,69,false
2025-10-22 04:37:25,2025-10-23 04:31:20,UTC+07:00,2025-10-22 04:37:25,2025-10-22 10:52:55,65,13.8,346,375,154,107,85,29,606,127,94,49,false
2025-10-21 04:33:17,2025-10-22 04:37:25,UTC+07:00,2025-10-21 04:33:17,2025-10-21 08:51:48,46,13.1,231,258,89,99,43,27,509,82,90,42,false
2025-10-20 02:29:33,2025-10-21 04:33:17,UTC+07:00,2025-10-20 02:29:33,2025-10-20 09:21:37,64,13.4,333,412,173,88,72,79,461,127,81,42,false
2025-10-19 01:43:42,2025-10-20 02:29:33,UTC+07:00,2025-10-19 01:43:42,2025-10-19 08:08:43,69,13.4,338,385,187,68,83,47,558,127,88,56,false
2025-10-18 01:17:51,2025-10-19 01:43:42,UTC+07:00,2025-10-18 01:17:51,2025-10-18 08:00:31,71,13.7,381,402,169,93,119,21,605,127,94,53,false
2025-10-17 00:25:04,2025-10-18 01:17:51,UTC+07:00,2025-10-17 00:25:04,2025-10-17 03:43:04,25,13.5,182,198,49,83,50,16,611,127,92,36,false
2025-10-16 01:09:53,2025-10-17 00:25:04,UTC+07:00,2025-10-16 01:09:53,2025-10-16 06:54:24,56,13.8,332,343,149,120,63,11,605,127,97,29,false
2025-10-15 04:13:16,2025-10-16 01:09:53,UTC+07:00,2025-10-15 04:13:16,2025-10-15 08:48:47,61,13.6,251,271,121,74,56,20,456,127,93,43,false
2025-10-14 04:00:16,2025-10-15 04:13:16,UTC+07:00,2025-10-14 04:00:16,2025-10-14 10:00:47,67,13.5,329,355,152,102,75,26,588,110,93,70,false
2025-10-13 04:06:29,2025-10-14 04:00:16,UTC+07:00,2025-10-13 04:06:29,2025-10-13 12:20:30,71,13.7,394,494,199,119,76,100,566,88,80,67,false
2025-10-12 03:56:50,2025-10-13 04:06:29,UTC+07:00,2025-10-12 03:56:50,2025-10-12 13:05:21,60,13.7,407,544,196,123,88,137,544,116,74,48,false
2025-10-11 02:27:33,2025-10-12 03:56:50,UTC+07:00,2025-10-11 02:27:33,2025-10-11 10:32:34,77,13.7,423,482,183,104,136,59,605,127,87,63,false
2025-10-10 03:44:55,2025-10-11 02:27:33,UTC+07:00,2025-10-10 03:44:55,2025-10-10 09:43:26,61,13.5,315,356,123,126,66,41,611,127,88,66,false
2025-10-09 03:34:49,2025-10-10 03:44:55,UTC+07:00,2025-10-09 03:34:49,2025-10-09 07:50:49,35,14.1,223,245,76,94,53,22,598,120,92,53,false
2025-10-08 04:43:33,2025-10-09 03:34:49,UTC+07:00,2025-10-08 04:43:33,2025-10-08 11:41:03,35,14.3,282,411,173,65,44,129,524,93,68,47,false
2025-10-07 00:29:24,2025-10-08 04:43:33,UTC+07:00,2025-10-07 00:29:24,2025-10-07 09:19:56,70,13.9,458,529,287,86,85,71,604,127,86,37,false
2025-10-06 04:30:49,2025-10-07 00:29:24,UTC+07:00,2025-10-06 04:30:49,2025-10-06 08:03:50,36,14.0,204,209,83,77,44,5,647,127,98,83,false
2025-10-05 03:48:01,2025-10-06 04:30:49,UTC+07:00,2025-10-05 03:48:01,2025-10-05 10:59:32,78,13.7,382,431,199,95,88,49,611,127,89,87,false
2025-10-04 03:46:46,2025-10-05 03:48:01,UTC+07:00,2025-10-04 03:46:46,2025-10-04 10:41:17,47,14.0,299,404,141,95,63,105,604,127,74,79,false
2025-10-03 04:15:54,2025-10-04 03:46:46,UTC+07:00,2025-10-03 04:15:54,2025-10-03 11:00:25,59,13.7,336,402,153,100,83,66,640,127,83,70,false
2025-10-02 03:13:27,2025-10-03 04:15:54,UTC+07:00,2025-10-02 03:13:27,2025-10-02 08:00:58,33,13.8,242,286,117,81,44,44,614,127,86,47,false
2025-10-01 04:02:53,2025-10-02 03:13:27,UTC+07:00,2025-10-01 04:02:53,2025-10-01 11:24:25,65,13.5,365,441,160,117,88,76,605,127,83,62,false
2025-09-30 04:18:59,2025-10-01 04:02:53,UTC+07:00,2025-09-30 04:18:59,2025-09-30 10:04:30,66,13.1,299,345,169,83,47,46,509,72,86,56,false
2025-09-29 04:21:37,2025-09-30 04:18:59,UTC+07:00,2025-09-29 04:21:37,2025-09-29 10:11:08,76,13.4,324,344,161,76,87,20,437,94,94,57,false
2025-09-28 03:46:11,2025-09-29 04:21:37,UTC+07:00,2025-09-28 03:46:11,2025-09-28 10:20:42,74,13.6,343,386,121,121,101,43,491,127,88,48,false
2025-09-27 03:42:18,2025-09-28 03:46:11,UTC+07:00,2025-09-27 03:42:18,2025-09-27 09:58:49,45,13.7,301,376,123,96,82,75,605,127,80,54,false
2025-09-26 05:50:47,2025-09-27 03:42:18,UTC+07:00,2025-09-26 05:50:47,2025-09-26 12:10:48,53,13.7,323,378,134,117,72,55,602,124,85,38,false
2025-09-25 00:29:31,2025-09-26 05:50:47,UTC+07:00,2025-09-25 00:29:31,2025-09-25 08:05:02,54,13.7,356,455,212,76,68,99,605,127,78,49,false
2025-09-24 04:38:38,2025-09-25 00:29:31,UTC+07:00,2025-09-24 04:38:38,2025-09-24 10:53:09,55,13.6,311,372,137,91,83,61,604,127,83,61,false
2025-09-23 02:00:57,2025-09-24 04:38:38,UTC+07:00,2025-09-23 02:00:57,2025-09-23 09:13:58,75,13.7,378,432,194,106,78,54,608,105,88,77,false
2025-09-22 02:35:40,2025-09-23 02:00:57,UTC+07:00,2025-09-22 02:35:40,2025-09-22 09:29:41,78,13.6,360,407,147,134,79,47,524,46,88,70,false
2025-09-21 02:55:51,2025-09-22 02:35:40,UTC+07:00,2025-09-21 02:55:51,2025-09-21 11:24:23,79,13.9,458,508,235,109,114,50,531,54,90,55,false
2025-09-20 01:39:53,2025-09-21 02:55:51,UTC+07:00,2025-09-20 01:39:53,2025-09-20 09:40:25,74,13.5,401,478,199,86,116,77,485,7,83,55,false
2025-09-18 23:23:35,2025-09-20 01:39:53,UTC+07:00,2025-09-18 23:23:35,2025-09-19 10:18:07,69,13.8,527,654,306,95,126,127,540,127,80,32,false
2025-09-18 03:30:48,2025-09-18 23:23:35,UTC+07:00,2025-09-18 03:30:48,2025-09-18 06:49:18,25,13.7,176,198,64,96,16,22,605,127,89,43,false
2025-09-17 03:58:01,2025-09-18 03:30:48,UTC+07:00,2025-09-17 03:58:01,2025-09-17 10:44:02,49,13.9,346,406,145,118,83,60,629,107,85,26,false
2025-09-15 00:55:36,2025-09-15 20:54:22,UTC+07:00,2025-09-15 00:55:36,2025-09-15 09:03:07,68,13.9,416,485,236,81,99,69,583,98,85,35,false
2025-09-13 22:54:22,2025-09-15 02:55:36,UTC+09:00,2025-09-13 22:54:22,2025-09-14 07:02:27,73,13.8,436,484,272,58,106,48,590,107,90,36,false
2025-09-13 00:26:50,2025-09-13 22:54:22,UTC+09:00,2025-09-13 00:26:50,2025-09-13 07:46:21,68,14.1,384,436,219,79,86,52,551,127,88,26,false
2025-09-12 03:03:55,2025-09-13 00:26:50,UTC+09:00,2025-09-12 03:03:55,2025-09-12 06:16:25,26,13.7,177,192,98,56,23,15,557,127,92,40,false
2025-09-11 02:02:22,2025-09-12 01:03:55,UTC+07:00,2025-09-11 02:02:22,2025-09-11 06:48:23,41,14.1,243,283,97,95,51,40,531,127,86,39,false
2025-09-10 04:59:56,2025-09-11 02:02:22,UTC+07:00,2025-09-10 04:59:56,2025-09-10 10:13:57,53,13.5,289,314,149,91,49,25,588,68,92,49,false
2025-09-09 00:58:22,2025-09-10 04:59:56,UTC+07:00,2025-09-09 00:58:22,2025-09-09 09:21:53,80,14.1,447,502,248,83,116,55,554,77,89,66,false
2025-09-08 01:44:45,2025-09-09 00:58:22,UTC+07:00,2025-09-08 01:44:45,2025-09-08 09:07:46,73,13.8,385,443,209,91,85,58,505,119,87,47,false
2025-09-07 00:42:31,2025-09-08 01:44:45,UTC+07:00,2025-09-07 00:42:31,2025-09-07 08:47:32,70,13.5,412,485,164,139,109,73,598,121,85,48,false
2025-09-06 04:46:45,2025-09-07 00:42:31,UTC+07:00,2025-09-06 04:46:45,2025-09-06 11:02:16,52,13.8,316,375,137,98,81,59,559,81,84,27,false
2025-09-04 21:32:26,2025-09-06 04:46:45,UTC+07:00,2025-09-04 21:32:26,2025-09-05 07:00:27,71,14.0,481,563,288,92,101,82,609,127,85,41,false
2025-09-04 01:54:43,2025-09-04 21:32:26,UTC+07:00,2025-09-04 01:54:43,2025-09-04 07:02:44,50,13.9,272,299,170,62,40,27,599,121,90,63,false
2025-09-03 01:20:48,2025-09-04 01:54:43,UTC+07:00,2025-09-03 01:20:48,2025-09-03 09:03:20,73,13.7,378,459,199,101,78,81,566,86,82,74,false
2025-09-01 23:47:26,2025-09-03 01:20:48,UTC+07:00,2025-09-01 23:47:26,2025-09-02 09:23:58,76,14.0,499,576,281,103,115,77,634,127,86,55,false
2025-09-01 02:06:44,2025-09-01 23:47:26,UTC+07:00,2025-09-01 02:06:44,2025-09-01 09:16:15,71,13.8,370,427,214,90,66,57,606,127,86,71,false
2025-08-31 03:36:48,2025-09-01 02:06:44,UTC+07:00,2025-08-31 03:36:48,2025-08-31 10:23:50,71,14.0,353,407,154,85,114,54,606,127,87,88,false
2025-08-30 03:33:00,2025-08-31 03:36:48,UTC+07:00,2025-08-30 03:33:00,2025-08-30 11:05:32,63,13.5,351,442,183,84,84,91,629,127,79,79,false
2025-08-29 03:36:53,2025-08-30 03:33:00,UTC+07:00,2025-08-29 03:36:53,2025-08-29 09:16:54,55,13.7,292,334,160,78,54,42,604,121,87,71,false
2025-08-28 02:33:24,2025-08-29 03:36:53,UTC+07:00,2025-08-28 02:33:24,2025-08-28 10:42:25,77,14.1,417,486,214,103,100,69,606,107,86,75,false
2025-08-27 03:11:57,2025-08-28 02:33:24,UTC+07:00,2025-08-27 03:11:57,2025-08-27 09:59:58,76,13.9,355,401,201,90,64,46,522,44,88,66,false
2025-08-26 02:44:39,2025-08-27 03:11:57,UTC+07:00,2025-08-26 02:44:39,2025-08-26 12:07:10,76,14.1,472,559,259,111,102,87,542,125,84,58,false
2025-08-25 04:50:15,2025-08-26 02:44:39,UTC+07:00,2025-08-25 04:50:15,2025-08-25 10:41:46,62,13.5,305,351,152,97,56,46,555,77,86,59,false
2025-08-24 03:48:43,2025-08-25 04:50:15,UTC+07:00,2025-08-24 03:48:43,2025-08-24 11:27:45,74,14.1,394,455,177,115,102,61,514,93,86,49,false
2025-08-23 00:29:04,2025-08-24 03:48:43,UTC+07:00,2025-08-23 00:29:04,2025-08-23 09:53:06,71,14.2,456,562,254,127,75,106,602,124,81,60,false
2025-08-22 02:24:22,2025-08-23 00:29:04,UTC+07:00,2025-08-22 02:24:22,2025-08-22 10:45:54,72,14.2,415,496,180,100,135,81,609,127,83,63,false
2025-08-21 01:38:35,2025-08-22 02:24:22,UTC+07:00,2025-08-21 01:38:35,2025-08-21 07:22:36,48,13.9,308,337,171,75,62,29,651,127,91,43,false
2025-08-20 04:31:04,2025-08-21 01:38:35,UTC+07:00,2025-08-20 04:31:04,2025-08-20 11:09:05,67,13.8,341,396,189,90,62,55,594,92,86,74,false
2025-08-19 03:18:19,2025-08-20 04:31:04,UTC+07:00,2025-08-19 03:18:19,2025-08-19 11:03:54,71,14.1,377,461,216,65,96,84,521,127,81,59,false
2025-08-18 04:11:37,2025-08-19 03:18:19,UTC+07:00,2025-08-18 04:11:37,2025-08-18 09:26:17,35,13.9,243,307,129,82,32,64,578,100,79,64,false
2025-08-17 04:16:15,2025-08-18 04:11:37,UTC+07:00,2025-08-17 04:16:15,2025-08-17 11:01:46,67,13.8,346,402,164,95,87,56,548,70,86,50,false
2025-08-16 01:27:43,2025-08-17 04:16:15,UTC+07:00,2025-08-16 01:27:43,2025-08-16 09:36:14,77,14.1,411,480,195,113,103,69,521,43,85,65,false
2025-08-15 01:19:27,2025-08-16 01:27:43,UTC+07:00,2025-08-15 01:19:27,2025-08-15 12:10:58,74,14.0,550,651,304,90,156,101,617,74,84,47,false
2025-08-14 01:34:38,2025-08-15 01:19:27,UTC+07:00,2025-08-14 01:34:38,2025-08-14 07:19:39,68,14.1,297,345,170,81,46,48,447,62,86,42,false
2025-08-13 02:25:11,2025-08-14 01:34:38,UTC+07:00,2025-08-13 02:25:11,2025-08-13 10:32:42,71,14.3,382,476,208,101,73,94,479,51,80,58,false
`;

const parseNumber = (value?: string): number | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
};

const toISODateTime = (value?: string): string | null => {
  if (!value || value.trim() === '') return null;
  const normalized = value.trim().replace(' ', 'T');
  const iso = `${normalized}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const WHOOP_SLEEP_DATA: Record<string, WhoopSleepRow> = (() => {
  const rows = WHOOP_SLEEP_CSV.trim().split('\n');
  rows.shift();
  const map: Record<string, WhoopSleepRow> = {};

  rows.forEach((row) => {
    const cells = row.split(',');
    if (cells.length < 6) return;

    const napRaw = cells[cells.length - 1]?.trim().toLowerCase();
    if (napRaw === 'true') return;

    const cycleStart = cells[0]?.trim();
    if (!cycleStart) return;

    const date = cycleStart.split(' ')[0];

    const performance = parseNumber(cells[5]) ?? 70;
    const respiration = parseNumber(cells[6]) ?? 13.5;
    const asleepMinutes = parseNumber(cells[7]) ?? 320;
    const inBedMinutes = parseNumber(cells[8]) ?? asleepMinutes;
    const lightMinutes = parseNumber(cells[9]) ?? Math.max(0, asleepMinutes * 0.45);
    const deepMinutes = parseNumber(cells[10]) ?? Math.max(0, asleepMinutes * 0.25);
    const remMinutes = parseNumber(cells[11]) ?? Math.max(0, asleepMinutes * 0.22);
    const awakeMinutes = parseNumber(cells[12]) ?? Math.max(0, inBedMinutes - asleepMinutes);
    const sleepNeedMinutes = parseNumber(cells[13]);
    const sleepDebtMinutes = parseNumber(cells[14]);
    const efficiency = parseNumber(cells[15]) ?? Math.round((asleepMinutes / Math.max(inBedMinutes, 1)) * 100);
    const consistency = parseNumber(cells[16]);
    const sleepOnset = cells[3]?.trim();
    const wakeOnset = cells[4]?.trim();

    const record: WhoopSleepRow = {
      date,
      cycleStart,
      sleepOnset,
      wakeOnset,
      performance,
      respiration,
      asleepMinutes,
      inBedMinutes,
      lightMinutes,
      deepMinutes,
      remMinutes,
      awakeMinutes,
      sleepNeedMinutes,
      sleepDebtMinutes,
      efficiency,
      consistency,
    };

    const existing = map[date];
    if (!existing || asleepMinutes > existing.asleepMinutes) {
      map[date] = record;
    }
  });

  return map;
})();

const RAW_SLEEP_TIMESTAMPS = [
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
  '2025-10-20 02:29:33',
  '2025-10-19 01:43:42',
  '2025-10-19 01:43:42',
  '2025-10-18 01:17:51',
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

const SLEEP_EVENT_TIMESTAMPS = RAW_SLEEP_TIMESTAMPS.map((input, index) => normalizeTimestamp(input, index));
const SLEEP_EVENT_DATES = new Set(SLEEP_EVENT_TIMESTAMPS.map((ts) => ts.split('T')[0]));

const FALL_SESSION_COUNT = 540;

const getGradeFromScore = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
};

const getRecommendationsForGrade = (grade: string): string[] => {
  switch (grade) {
    case 'A':
      return ['Maintain your consistent bedtime routine.'];
    case 'B':
      return ['Slightly reduce late-night screen time for better rest.'];
    case 'C':
      return ['Consider a calming wind-down routine to improve sleep quality.'];
    case 'D':
      return ['Prioritize earlier sleep and limit caffeine after noon.'];
    default:
      return ['Focus on regular rest habits and consult a specialist if issues persist.'];
  }
};

const buildSleepReading = (timestamp: string, index: number): MockReading => {
  const dateKey = timestamp.split('T')[0];
  const whoop = WHOOP_SLEEP_DATA[dateKey];

  const basePerformance = whoop?.performance ?? 70 + (index % 5) * 4;
  const adjustedPerformance = Math.min(100, Math.max(40, basePerformance + ((index % 3) - 1) * 2));
  const respiration = whoop?.respiration ?? 13.5 + ((index % 4) - 1) * 0.4;
  const heartRate = 58 + Math.max(0, 100 - basePerformance) * 0.3 + (index % 6);

  return {
    id: `sleep-${index}`,
    reading_type: 'sleep',
    timestamp,
    is_person_detected: true,
    is_movement_detected: (index + 3) % 5 === 0,
    sleep_quality_score: Math.round(adjustedPerformance * 10) / 10,
    raw_data: {
      distance: 45 + (index % 10) * 2,
      movement_intensity: 30 + (index % 6) * 12,
      respiration_rate: Math.round(respiration * 10) / 10,
      heart_rate: Math.round(heartRate),
      hrv: 55 + ((index * 4) % 45),
    },
  };
};

const generateMockSleepReadings = (): MockReading[] => {
  const readings = SLEEP_EVENT_TIMESTAMPS.map((timestamp, index) => buildSleepReading(timestamp, index));
  return readings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const generateMockFallReadings = (): MockReading[] => {
  const referenceDates = SLEEP_EVENT_TIMESTAMPS.map((ts) => new Date(ts).getTime());
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

const buildSleepSummary = (date: string): { date: string; summary: any } => {
  const whoop = WHOOP_SLEEP_DATA[date];
  if (!whoop) {
    const fallbackScore = 72;
    const grade = getGradeFromScore(fallbackScore);
    const totalSleepMinutes = 380;
    const awakeMinutes = 45;
    const inBedMinutes = totalSleepMinutes + awakeMinutes;
    const sessionStart = `${date}T22:15:00Z`;
    const sessionEnd = new Date(new Date(sessionStart).getTime() + inBedMinutes * 60 * 1000).toISOString();

    return {
      date,
      summary: {
        overall_quality: fallbackScore,
        sleep_score_grade: grade,
        total_sleep_time_minutes: totalSleepMinutes,
        time_in_bed_minutes: inBedMinutes,
        sleep_efficiency_percent: Math.round((totalSleepMinutes / inBedMinutes) * 100),
        sleep_stages: {
          deep_sleep_minutes: 100,
          deep_sleep_percent: 26,
          light_sleep_minutes: 210,
          light_sleep_percent: 55,
          awake_minutes,
          awake_percent: Math.round((awakeMinutes / inBedMinutes) * 100),
        },
        vital_signs: {
          avg_heart_rate: 60,
          min_heart_rate: 49,
          max_heart_rate: 78,
          avg_respiration: 13.6,
          min_respiration: 12.4,
          max_respiration: 14.5,
        },
        sleep_patterns: {
          avg_body_movement: 22,
          restlessness_score: 35,
          apnea_events: 0,
        },
        sleep_onset: sessionStart,
        wake_time: sessionEnd,
        recommendations: getRecommendationsForGrade(grade),
        ml_model_version: 'mock-sleep-v1.2.0',
        user_id: 'mock-user',
        date,
        session_start: sessionStart,
        session_end: sessionEnd,
        total_readings: Math.round((inBedMinutes * 60) / 5),
      },
    };
  }

  const grade = getGradeFromScore(whoop.performance);
  const totalSleepMinutes = whoop.asleepMinutes;
  const awakeMinutes = whoop.awakeMinutes;
  const inBedMinutes = whoop.inBedMinutes || totalSleepMinutes + awakeMinutes;
  const efficiency = whoop.efficiency ?? Math.round((totalSleepMinutes / Math.max(inBedMinutes, 1)) * 100);
  const sessionStart = toISODateTime(whoop.sleepOnset) ?? `${date}T22:15:00Z`;
  const sessionEnd = toISODateTime(whoop.wakeOnset) ?? new Date(new Date(sessionStart).getTime() + inBedMinutes * 60 * 1000).toISOString();

  const deepMinutes = whoop.deepMinutes;
  const lightMinutes = whoop.lightMinutes;
  const remMinutes = whoop.remMinutes;
  const totalMinutes = totalSleepMinutes + awakeMinutes;

  const avgRespiration = whoop.respiration;
  const avgHeartRate = Math.round(56 + Math.max(0, 100 - whoop.performance) * 0.35);

  const restlessnessScore = Math.min(100, Math.round((awakeMinutes / Math.max(inBedMinutes, 1)) * 150));
  const avgBodyMovement = Math.max(12, Math.round((awakeMinutes / Math.max(totalMinutes, 1)) * 140));
  const apneaEvents = whoop.performance < 55 ? 3 : whoop.performance < 70 ? 1 : 0;

  return {
    date,
    summary: {
      overall_quality: Math.round(whoop.performance * 10) / 10,
      sleep_score_grade: grade,
      total_sleep_time_minutes: totalSleepMinutes,
      time_in_bed_minutes: inBedMinutes,
      sleep_efficiency_percent: efficiency,
      sleep_stages: {
        deep_sleep_minutes: deepMinutes,
        deep_sleep_percent: Math.round((deepMinutes / Math.max(totalSleepMinutes, 1)) * 100),
        light_sleep_minutes: lightMinutes,
        light_sleep_percent: Math.round((lightMinutes / Math.max(totalSleepMinutes, 1)) * 100),
        awake_minutes: awakeMinutes,
        awake_percent: Math.round((awakeMinutes / Math.max(totalMinutes, 1)) * 100),
      },
      vital_signs: {
        avg_heart_rate: avgHeartRate,
        min_heart_rate: Math.max(42, avgHeartRate - 11),
        max_heart_rate: avgHeartRate + 12,
        avg_respiration: Math.round(avgRespiration * 10) / 10,
        min_respiration: Math.max(8, Math.round((avgRespiration - 1.1) * 10) / 10),
        max_respiration: Math.round((avgRespiration + 1.2) * 10) / 10,
      },
      sleep_patterns: {
        avg_body_movement: avgBodyMovement,
        restlessness_score: restlessnessScore,
        apnea_events: apneaEvents,
      },
      sleep_onset: sessionStart,
      wake_time: sessionEnd,
      recommendations: getRecommendationsForGrade(grade),
      ml_model_version: 'mock-sleep-v1.2.0',
      user_id: 'mock-user',
      date,
      session_start: sessionStart,
      session_end: sessionEnd,
      total_readings: Math.round((inBedMinutes * 60) / 5),
    },
  };
};

const generateMockSleepSummaries = () => {
  const uniqueDates = Array.from(SLEEP_EVENT_DATES).filter((date) => WHOOP_SLEEP_DATA[date]);
  uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return uniqueDates.map((date) => buildSleepSummary(date));
};

export const getMockSleepData = (userId?: string) => {
  return {
    readings: generateMockSleepReadings(),
  };
};

export const getMockFallData = (userId?: string) => {
  return {
    readings: generateMockFallReadings(),
  };
};

export const getMockSleepSummaries = () => generateMockSleepSummaries();

/**
 * Check if mock data should be used
 * Set this to true to enable mock data
 */
export const USE_MOCK_STATISTICS = __DEV__;


