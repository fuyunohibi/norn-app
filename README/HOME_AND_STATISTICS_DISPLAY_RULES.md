# Home and Statistics Display Rules

This document explains what the app displays after the latest Home/Statistics fallback and messaging updates.

## Home Screen (`app/(tabs)/index.tsx`)

### Data source priority (today)

When rendering **Today at a glance**, **Activity mix**, and **Today activities**, the app uses:

1. API today stats (`useActivityStatistics(..., "today")`)
2. Fallback built from `activity_events` (Supabase)
3. Persisted `daily_statistics` summary row

## Loading and error behavior

- Spinner is shown only on initial load when no usable today data exists.
- During background refresh, existing content stays visible (no flicker).
- Error state is shown only if both API and fallback data are unavailable.

## "Today at a glance" insight logic

Card title is dynamic (caregiver-focused):

- No events -> **"Clip wearer movement"**
- Safety events present -> **"Safety watch"**
- Sedentary-heavy recent trend -> **"Sedentary trend"**
- Active recent trend -> **"Active trend"**
- Otherwise -> **"Balanced movement"**

Insight message is period-based:

- `this morning` if current local hour `< 12`
- `this afternoon` if hour `< 18`
- `this evening` otherwise

Displayed message rules:

1. No events today -> neutral "waiting for clip data" message
2. Safety events present (`falling`, `after_fall`, `unstable_standing`) -> safety-focused alert message
3. Recent sedentary-heavy trend -> suggest short walk/posture reset
4. Recent active trend -> positive reinforcement + hydration reminder
5. Otherwise -> balanced/mixed movement guidance

## Activity Mix section

Uses normalized `by_activity` data from effective today stats source.

- Tiles update from live API when available
- Falls back to Supabase-derived values when API today fails

## Today Activities timeline

- Shows latest **20** non-`ping` events
- Sorted by newest first (`created_at` descending)
- Time label is formatted from each event timestamp

## Minutes / wear-time estimation (fallback path)

When API today stats are unavailable, minutes are estimated from `activity_events`:

1. Build segments between consecutive non-`ping` events
2. Prefer `timestamp_device` deltas when valid and increasing
3. Otherwise use `created_at` delta
4. Heartbeat-aware continuity:
   - If `ping` cadence covers the full segment, count full gap
   - If not, apply capped segment fallback
5. Sum `total_seconds` across buckets -> convert to minutes

## Daily persistence (`daily_statistics`)

Home continuously upserts daily summary:

- Primary path: API today stats -> `daily_statistics`
- Fallback path: aggregate from `activity_events` -> `daily_statistics`

This ensures Statistics/Home still have usable day-level summary data even when API today stats fail temporarily.

## Statistics Screen (`app/(tabs)/statistics.tsx`)

- "Saved day summary" panel has been removed.
- "Today" section uses effective today stats (API first, fallback second).
- Existing sections (Activity/Safety/Overview) remain unchanged in layout.

