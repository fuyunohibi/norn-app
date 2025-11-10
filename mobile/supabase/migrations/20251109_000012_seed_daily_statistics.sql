-- =============================================
-- SEED DAILY STATISTICS USING MOCK DATASET
-- =============================================
-- Populates daily_statistics with the same historical
-- values generated in mobile/utils/mock-statistics.ts.
-- =============================================

DO $$
DECLARE
    v_user_id UUID := '0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61';
    v_default_times TEXT[] := ARRAY['02:30:00', '03:15:00', '01:45:00', '04:05:00'];
    v_raw_sleep_timestamps TEXT[] := ARRAY[
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
        '2025-08-13 02:25:11'
    ];
    v_whoop_csv TEXT := $CSV$
Cycle start time,Cycle end time,Cycle timezone,Sleep onset,Wake onset,Sleep performance %,Respiratory rate (rpm),Asleep duration (min),In bed duration (min),Light sleep duration (min),Deep (SWS) duration (min),REM duration (min),Awake duration (min),Sleep need (min),Sleep debt (min),Sleep efficiency %,Sleep consistency %,Nap
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
$CSV$;

    v_idx INTEGER;
    v_time TEXT;
    v_timestamp TIMESTAMPTZ;
    v_stat_date DATE;
    v_sleep_ts TIMESTAMPTZ[] := ARRAY[]::TIMESTAMPTZ[];
    v_whoop_performance NUMERIC;
    v_whoop_respiration NUMERIC;
    v_base_performance NUMERIC;
    v_respiration NUMERIC;
    v_respiration_sample NUMERIC;
    v_respiration_count INTEGER;
    v_hrv_sample NUMERIC;
    v_exists BOOLEAN;
    v_ref_index INTEGER;
    v_offset_minutes INTEGER;
    v_fall_timestamp TIMESTAMPTZ;
    v_fall_session_count CONSTANT INTEGER := 540;
BEGIN
    CREATE TEMP TABLE tmp_whoop (
        date DATE,
        performance NUMERIC,
        respiration NUMERIC,
        asleep_minutes NUMERIC
    );

    WITH raw_lines AS (
        SELECT *
        FROM regexp_split_to_table(v_whoop_csv, E'\n') WITH ORDINALITY AS t(line_text, line_no)
    ),
    parsed AS (
        SELECT line_no, string_to_array(line_text, ',') AS cols
        FROM raw_lines
        WHERE trim(line_text) <> ''
    )
    INSERT INTO tmp_whoop (date, performance, respiration, asleep_minutes)
    SELECT
        (split_part(cols[1], ' ', 1))::date AS date,
        COALESCE(NULLIF(cols[6], '')::numeric, 70) AS performance,
        COALESCE(NULLIF(cols[7], '')::numeric, 13.5) AS respiration,
        COALESCE(NULLIF(cols[8], '')::numeric, 320) AS asleep_minutes
    FROM parsed
    WHERE line_no > 1
      AND cols[1] <> 'Cycle start time';

    CREATE TEMP TABLE tmp_whoop_dedup AS
    SELECT DISTINCT ON (date)
        date,
        performance,
        respiration,
        asleep_minutes
    FROM tmp_whoop
    ORDER BY date, asleep_minutes DESC;

    DELETE FROM tmp_whoop;

    INSERT INTO tmp_whoop (date, performance, respiration, asleep_minutes)
    SELECT date, performance, respiration, asleep_minutes
    FROM tmp_whoop_dedup;

    CREATE TEMP TABLE tmp_stats (
        stat_date DATE PRIMARY KEY,
        total_readings INTEGER NOT NULL DEFAULT 0,
        sleep_readings INTEGER NOT NULL DEFAULT 0,
        fall_readings INTEGER NOT NULL DEFAULT 0,
        respiration_sum NUMERIC NOT NULL DEFAULT 0,
        respiration_count INTEGER NOT NULL DEFAULT 0,
        hrv_sum NUMERIC NOT NULL DEFAULT 0,
        hrv_count INTEGER NOT NULL DEFAULT 0,
        first_reading_at TIMESTAMPTZ,
        last_reading_at TIMESTAMPTZ,
        last_sleep_reading_at TIMESTAMPTZ,
        last_fall_reading_at TIMESTAMPTZ
    );

    FOR v_idx IN 1..array_length(v_raw_sleep_timestamps, 1) LOOP
        IF position(' ' IN v_raw_sleep_timestamps[v_idx]) > 0 THEN
            v_stat_date := split_part(v_raw_sleep_timestamps[v_idx], ' ', 1)::date;
            v_time := split_part(v_raw_sleep_timestamps[v_idx], ' ', 2);
        ELSE
            v_stat_date := v_raw_sleep_timestamps[v_idx]::date;
            v_time := v_default_times[((v_idx - 1) % array_length(v_default_times, 1)) + 1];
        END IF;

        v_timestamp := (v_stat_date::text || 'T' || v_time || 'Z')::timestamptz;
        v_sleep_ts := array_append(v_sleep_ts, v_timestamp);

        SELECT performance, respiration
        INTO v_whoop_performance, v_whoop_respiration
        FROM tmp_whoop
        WHERE date = v_stat_date
        LIMIT 1;

        IF NOT FOUND THEN
            v_whoop_performance := 72;
            v_whoop_respiration := 13.5;
        END IF;

        v_base_performance := COALESCE(v_whoop_performance, 70) + ((v_idx - 1) % 5) * 4;
        v_respiration := COALESCE(v_whoop_respiration, 13.5) + (((v_idx - 1) % 4) - 1) * 0.4;
        v_respiration_sample := ROUND(v_respiration * 10) / 10;
        v_respiration_count := CASE WHEN v_respiration_sample IS NULL THEN 0 ELSE 1 END;
        v_hrv_sample := 55 + (((v_idx - 1) * 4) % 45);

        SELECT TRUE INTO v_exists FROM tmp_stats WHERE stat_date = v_stat_date LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO tmp_stats (
                stat_date,
                total_readings,
                sleep_readings,
                fall_readings,
                respiration_sum,
                respiration_count,
                hrv_sum,
                hrv_count,
                first_reading_at,
                last_reading_at,
                last_sleep_reading_at,
                last_fall_reading_at
            )
            VALUES (
                v_stat_date,
                1,
                1,
                0,
                COALESCE(v_respiration_sample, 0),
                v_respiration_count,
                v_hrv_sample,
                1,
                v_timestamp,
                v_timestamp,
                v_timestamp,
                NULL
            );
        ELSE
            UPDATE tmp_stats
            SET
                total_readings = total_readings + 1,
                sleep_readings = sleep_readings + 1,
                respiration_sum = respiration_sum + COALESCE(v_respiration_sample, 0),
                respiration_count = respiration_count + v_respiration_count,
                hrv_sum = hrv_sum + v_hrv_sample,
                hrv_count = hrv_count + 1,
                first_reading_at = CASE
                    WHEN first_reading_at IS NULL OR v_timestamp < first_reading_at THEN v_timestamp
                    ELSE first_reading_at
                END,
                last_reading_at = CASE
                    WHEN last_reading_at IS NULL OR v_timestamp > last_reading_at THEN v_timestamp
                    ELSE last_reading_at
                END,
                last_sleep_reading_at = CASE
                    WHEN last_sleep_reading_at IS NULL OR v_timestamp > last_sleep_reading_at THEN v_timestamp
                    ELSE last_sleep_reading_at
                END
            WHERE stat_date = v_stat_date;
        END IF;
    END LOOP;

    IF array_length(v_sleep_ts, 1) IS NOT NULL AND array_length(v_sleep_ts, 1) > 0 THEN
        FOR v_idx IN 0..v_fall_session_count - 1 LOOP
            v_ref_index := (v_idx % array_length(v_sleep_ts, 1)) + 1;
            v_timestamp := v_sleep_ts[v_ref_index];
            v_offset_minutes := (v_idx % 16) * 9 + (v_idx / 32);
            v_fall_timestamp := v_timestamp
                - make_interval(mins => v_offset_minutes)
                - make_interval(secs => v_idx * 45);
            v_stat_date := v_fall_timestamp::date;

            SELECT TRUE INTO v_exists FROM tmp_stats WHERE stat_date = v_stat_date LIMIT 1;
            IF NOT FOUND THEN
                INSERT INTO tmp_stats (
                    stat_date,
                    total_readings,
                    sleep_readings,
                    fall_readings,
                    respiration_sum,
                    respiration_count,
                    hrv_sum,
                    hrv_count,
                    first_reading_at,
                    last_reading_at,
                    last_sleep_reading_at,
                    last_fall_reading_at
                )
                VALUES (
                    v_stat_date,
                    1,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    v_fall_timestamp,
                    v_fall_timestamp,
                    NULL,
                    v_fall_timestamp
                );
            ELSE
                UPDATE tmp_stats
                SET
                    total_readings = total_readings + 1,
                    fall_readings = fall_readings + 1,
                    first_reading_at = CASE
                        WHEN first_reading_at IS NULL OR v_fall_timestamp < first_reading_at THEN v_fall_timestamp
                        ELSE first_reading_at
                    END,
                    last_reading_at = CASE
                        WHEN last_reading_at IS NULL OR v_fall_timestamp > last_reading_at THEN v_fall_timestamp
                        ELSE last_reading_at
                    END,
                    last_fall_reading_at = CASE
                        WHEN last_fall_reading_at IS NULL OR v_fall_timestamp > last_fall_reading_at THEN v_fall_timestamp
                        ELSE last_fall_reading_at
                    END
            WHERE stat_date = v_stat_date;
        END IF;
    END LOOP;
END IF;

INSERT INTO daily_statistics (
    user_id,
    stat_date,
    total_readings,
    sleep_readings,
    fall_readings,
    respiration_sum,
    respiration_count,
    hrv_sum,
    hrv_count,
    first_reading_at,
    last_reading_at,
    last_sleep_reading_at,
    last_fall_reading_at,
    created_at,
    updated_at
)
SELECT
    v_user_id,
    stat_date,
    total_readings,
    sleep_readings,
    fall_readings,
    respiration_sum,
    respiration_count,
    hrv_sum,
    hrv_count,
    first_reading_at,
    last_reading_at,
    last_sleep_reading_at,
    last_fall_reading_at,
    NOW(),
    NOW()
FROM tmp_stats
ON CONFLICT (user_id, stat_date) DO UPDATE
SET
    total_readings = EXCLUDED.total_readings,
    sleep_readings = EXCLUDED.sleep_readings,
    fall_readings = EXCLUDED.fall_readings,
    respiration_sum = EXCLUDED.respiration_sum,
    respiration_count = EXCLUDED.respiration_count,
    hrv_sum = EXCLUDED.hrv_sum,
    hrv_count = EXCLUDED.hrv_count,
    first_reading_at = LEAST(
        COALESCE(daily_statistics.first_reading_at, EXCLUDED.first_reading_at),
        EXCLUDED.first_reading_at
    ),
    last_reading_at = GREATEST(
        COALESCE(daily_statistics.last_reading_at, EXCLUDED.last_reading_at),
        EXCLUDED.last_reading_at
    ),
    last_sleep_reading_at = CASE
        WHEN daily_statistics.last_sleep_reading_at IS NULL THEN EXCLUDED.last_sleep_reading_at
        WHEN EXCLUDED.last_sleep_reading_at IS NULL THEN daily_statistics.last_sleep_reading_at
        ELSE GREATEST(daily_statistics.last_sleep_reading_at, EXCLUDED.last_sleep_reading_at)
    END,
    last_fall_reading_at = CASE
        WHEN daily_statistics.last_fall_reading_at IS NULL THEN EXCLUDED.last_fall_reading_at
        WHEN EXCLUDED.last_fall_reading_at IS NULL THEN daily_statistics.last_fall_reading_at
        ELSE GREATEST(daily_statistics.last_fall_reading_at, EXCLUDED.last_fall_reading_at)
    END,
    updated_at = EXCLUDED.updated_at;

END $$;

