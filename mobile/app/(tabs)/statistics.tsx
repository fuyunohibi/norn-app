import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ImageBackground, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/card';
import { ActivitySection } from '../../components/statistics/activity-section';
import { ModeBreakdownSection } from '../../components/statistics/mode-breakdown-section';
import { OverviewSection } from '../../components/statistics/overview-section';
import { SectionTabs } from '../../components/statistics/section-tabs';
import type { TabId } from '../../components/statistics/section-tabs';
import type { ActivityStatistics } from '../../services/backend-api.service';
import { useAuth } from '../../contexts/auth-context';
import { useActivityStatistics } from '../../hooks/useActivityStatistics';
import { fetchDailyStatistics } from '../../actions/statistics.actions';
import { fetchTodayActivityEvents, buildTodayStatsFromEvents } from '../../actions/statistics.actions';
import { backendAPIService } from '../../services/backend-api.service';
import { bucketActivityEventsByDay, criticalActivityTotals } from '../../utils/imu-activity';
import { HERO_MIN_HEIGHT, NornColors, heroTextShadow, shadowStyles } from '@/theme';

const StatisticsScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const insets = useSafeAreaInsets();
  const showStatsSignedIn = Boolean(userId);

  const {
    data: actTodayRes,
    isLoading: loadToday,
    refetch: refetchToday,
  } = useActivityStatistics(userId, 'today');
  const {
    data: act7Res,
    isLoading: load7,
    refetch: refetch7,
  } = useActivityStatistics(userId, '7d');
  const {
    data: act30Res,
    isLoading: load30,
    refetch: refetch30,
  } = useActivityStatistics(userId, '30d');

  const activityToday = actTodayRes?.statistics;
  const activity7 = act7Res?.statistics;
  const activity30 = act30Res?.statistics;

  const isLoading = loadToday || load7 || load30;
  const {
    data: persistedDailyStats = [],
    refetch: refetchDailyStats,
  } = useQuery({
    queryKey: ['daily-statistics-summary', userId],
    queryFn: () => fetchDailyStatistics(userId!, 120),
    enabled: Boolean(userId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  });
  const {
    data: todayFallbackEvents = [],
    refetch: refetchTodayFallbackEvents,
  } = useQuery({
    queryKey: ['today-activity-events-fallback-statistics', userId],
    queryFn: () => fetchTodayActivityEvents(userId!),
    enabled: Boolean(userId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  });
  const persistedTodaySummary = persistedDailyStats[0] ?? null;
  const { data: recentAlerts = [] } = useQuery({
    queryKey: ['statistics-recent-alerts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await backendAPIService.listAlerts(userId, { limit: 5 });
      return res.alerts ?? [];
    },
    enabled: Boolean(userId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  });
  const activityTodayEffective = useMemo(() => {
    if (activityToday) return activityToday;
    if (todayFallbackEvents.length) return buildTodayStatsFromEvents(todayFallbackEvents) as ActivityStatistics;
    if (!persistedTodaySummary) return undefined;
    const raw = persistedTodaySummary.activity_class_breakdown;
    const byActivity =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, { count?: number; total_seconds?: number }>)
        : {};
    return {
      period: 'today',
      from: `${persistedTodaySummary.stat_date}T00:00:00.000Z`,
      to: `${persistedTodaySummary.stat_date}T23:59:59.999Z`,
      by_activity: byActivity,
      events: [],
      total_events:
        persistedTodaySummary.imu_activity_event_count ??
        persistedTodaySummary.total_readings ??
        0,
    } as ActivityStatistics;
  }, [activityToday, persistedTodaySummary, todayFallbackEvents]);

  const [activeSection, setActiveSection] = useState<TabId>('activity');
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [activityMode, setActivityMode] = useState<'trends' | 'today'>('trends');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sectionTabs: ReadonlyArray<{ id: TabId; label: string }> = [
    { id: 'activity', label: 'Activity' },
    { id: 'mode', label: 'Safety' },
    { id: 'overview', label: 'Overview' },
  ];

  const timeRangeOptions = [
    { id: '7d' as const, label: '7-day' },
    { id: '30d' as const, label: '30-day' },
  ];

  const periodStats = timeRange === '7d' ? activity7 : activity30;
  const chartDayCount = timeRange === '7d' ? 7 : 14;

  const persistedRecentValues = useMemo(() => {
    if (!persistedDailyStats.length) return [];
    const byDate = new Map(
      persistedDailyStats.map((row) => [
        row.stat_date,
        (row.imu_activity_event_count ?? 0) > 0
          ? (row.imu_activity_event_count ?? 0)
          : (row.total_readings ?? 0),
      ]),
    );
    const out: number[] = [];
    for (let i = chartDayCount - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push(byDate.get(key) ?? 0);
    }
    return out;
  }, [persistedDailyStats, chartDayCount]);

  const imuDailyBuckets = useMemo(() => {
    if (!periodStats?.events?.length) return [];
    return bucketActivityEventsByDay(periodStats.events, chartDayCount);
  }, [periodStats?.events, chartDayCount]);

  const imuEventValues = imuDailyBuckets.length
    ? imuDailyBuckets.map((b) => b.count)
    : persistedRecentValues;
  const imuChartLabels = imuDailyBuckets.length
    ? imuDailyBuckets.map((b) => ({
        key: b.key,
        weekday: b.weekday,
        day: b.day,
      }))
    : persistedRecentValues.map((_, idx) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (chartDayCount - 1 - idx));
        const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
        return {
          key: d.toISOString().slice(0, 10),
          weekday,
          day: String(d.getDate()),
        };
      });

  const imuCritical30 = useMemo(
    () => criticalActivityTotals(activity30?.by_activity),
    [activity30?.by_activity],
  );

  const imuTrackedMinutes = useMemo(() => {
    const by = activity30?.by_activity;
    if (!by) return 0;
    return Object.values(by).reduce((s, b) => s + (b.total_seconds ?? 0) / 60, 0);
  }, [activity30?.by_activity]);

  const persisted30Summary = useMemo(() => {
    if (!persistedDailyStats.length) {
      return {
        totalEvents: 0,
        safetySegments: 0,
        trackedMinutes: 0,
        byActivity: {} as Record<string, { count: number; total_seconds: number }>,
      };
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    const startKey = start.toISOString().slice(0, 10);
    const rows = persistedDailyStats.filter((row) => row.stat_date >= startKey);

    const byActivity: Record<string, { count: number; total_seconds: number }> = {};
    let totalEvents = 0;
    let safetySegments = 0;
    let trackedSeconds = 0;

    for (const row of rows) {
      totalEvents +=
        (row.imu_activity_event_count ?? 0) > 0
          ? (row.imu_activity_event_count ?? 0)
          : (row.total_readings ?? 0);
      safetySegments +=
        (row.imu_critical_event_count ?? 0) > 0
          ? (row.imu_critical_event_count ?? 0)
          : (row.fall_readings ?? 0);

      const raw = row.activity_class_breakdown;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      for (const [name, val] of Object.entries(raw)) {
        if (!val || typeof val !== 'object') continue;
        const bucket = byActivity[name] ?? { count: 0, total_seconds: 0 };
        const count = typeof (val as { count?: unknown }).count === 'number' ? ((val as { count: number }).count ?? 0) : 0;
        const total_seconds =
          typeof (val as { total_seconds?: unknown }).total_seconds === 'number'
            ? ((val as { total_seconds: number }).total_seconds ?? 0)
            : 0;
        bucket.count += count;
        bucket.total_seconds += total_seconds;
        byActivity[name] = bucket;
        trackedSeconds += total_seconds;
      }
    }

    return {
      totalEvents,
      safetySegments,
      trackedMinutes: trackedSeconds / 60,
      byActivity,
    };
  }, [persistedDailyStats]);

  const totalEvents30Effective = Math.max(activity30?.total_events ?? 0, persisted30Summary.totalEvents);
  const safetySegments30Effective = Math.max(imuCritical30.count, persisted30Summary.safetySegments);
  const trackedMinutes30Effective = Math.max(imuTrackedMinutes, persisted30Summary.trackedMinutes);
  const activity30ByActivityEffective =
    activity30?.by_activity && Object.keys(activity30.by_activity).length > 0
      ? activity30.by_activity
      : persisted30Summary.byActivity;
  const hasActivityData =
    totalEvents30Effective > 0 || persistedRecentValues.some((value) => value > 0);

  const topClassToday = useMemo(() => {
    const by = activityTodayEffective?.by_activity;
    if (!by || !Object.keys(by).length) return null;
    const sorted = Object.entries(by).sort((a, b) => (b[1].total_seconds ?? 0) - (a[1].total_seconds ?? 0));
    return sorted[0]?.[0] ?? null;
  }, [activityTodayEffective?.by_activity]);

  const getAlertAccent = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-amber-400';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const renderActiveSection = (): React.ReactNode => {
    if (!showStatsSignedIn) {
      return (
        <Card variant="outlined" className="border-gray-100 bg-gray-50/80">
          <View className="items-center px-4 py-8">
            <Text className="text-center font-hell text-base leading-6 text-gray-600">
              Sign in to view activity statistics.
            </Text>
          </View>
        </Card>
      );
    }

    switch (activeSection) {
      case 'overview':
        return (
          <OverviewSection
            hasActivityData={hasActivityData}
            totalEvents30={totalEvents30Effective}
            safetySegments30={safetySegments30Effective}
            trackedMinutes30={trackedMinutes30Effective}
          />
        );
      case 'mode':
        return (
          <ModeBreakdownSection
            hasActivityData={hasActivityData}
            activity30={
              {
                period: activity30?.period ?? 'last_30_days',
                from: activity30?.from ?? '',
                to: activity30?.to ?? '',
                events: activity30?.events ?? [],
                error: activity30?.error,
                total_events: totalEvents30Effective,
                by_activity: activity30ByActivityEffective,
              } as ActivityStatistics
            }
            safetySegments30={safetySegments30Effective}
          />
        );
      case 'activity':
        return (
          <ActivitySection
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            timeRangeOptions={timeRangeOptions}
            hasActivityData={hasActivityData}
            chartDayCount={chartDayCount}
            imuEventValues={imuEventValues}
            imuChartLabels={imuChartLabels}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-gray-900">
      <ImageBackground
        source={require('../../assets/images/backgrounds/daytime-bg.png')}
        resizeMode="cover"
        className="w-full overflow-hidden rounded-b-[2.5rem]"
        style={{ minHeight: HERO_MIN_HEIGHT + insets.top }}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.38)']}
          start={{ x: 0.5, y: 0.2 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <View className="flex-1 justify-end px-6 pb-6" style={{ paddingTop: insets.top + 8 }}>
          <Text className="text-3xl font-hell-round-bold text-white" style={heroTextShadow}>
            Statistics
          </Text>
          <Text
            className="mt-2 max-w-[92%] font-hell text-base leading-6 text-white/95"
            style={heroTextShadow}
          >
            Movement and safety from your NORN clip.
          </Text>
        </View>
      </ImageBackground>

      <View className="flex-1 bg-gray-900">
        <ScrollView
          className="mt-6 flex-1 rounded-t-[2.5rem] bg-white px-6 pt-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={async () => {
                if (!userId) return;
                setIsRefreshing(true);
                try {
                  await Promise.all([
                    refetchToday(),
                    refetch7(),
                    refetch30(),
                    refetchDailyStats(),
                    refetchTodayFallbackEvents(),
                  ]);
                } finally {
                  setIsRefreshing(false);
                }
              }}
              tintColor={NornColors.brandOrange}
            />
          }
        >
          {isLoading ? (
            <View
              className="mb-4 overflow-hidden rounded-3xl border border-gray-100 bg-gray-50/80"
              style={shadowStyles.card}
            >
              <View className="items-center py-12">
                <ActivityIndicator size="large" color={NornColors.brandOrange} />
                <Text className="mt-4 font-hell text-sm text-gray-600">Loading activity statistics…</Text>
              </View>
            </View>
          ) : (
            <>
              <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-gray-400">
                Sections
              </Text>
              <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">What to view</Text>
              <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">
                Switch between activity trends, safety breakdown, and a quick overview.
              </Text>

              <SectionTabs
                tabs={sectionTabs}
                activeSection={activeSection}
                onChange={(id) => setActiveSection(id)}
              />

              <View className="mt-8">{renderActiveSection()}</View>
              <View className="mt-8">
                <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-gray-400">
                  Alerts
                </Text>
                <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">Recent alerts</Text>
                <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">
                  Latest safety notifications from your NORN clip.
                </Text>

                <View
                  className="mt-4 overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
                  style={shadowStyles.card}
                >
                  {recentAlerts.length === 0 ? (
                    <View className="px-5 py-6">
                      <Text className="font-hell text-sm text-gray-600">No recent alerts.</Text>
                    </View>
                  ) : (
                    recentAlerts.map((alert, idx) => (
                      <View
                        key={alert.id}
                        className={`flex-row items-start px-5 py-4 ${idx < recentAlerts.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <View className={`mt-1 h-2.5 w-2.5 rounded-full ${getAlertAccent(alert.severity)}`} />
                        <View className="ml-3 flex-1">
                          <Text className="font-hell-round-bold text-sm text-gray-900">{alert.title}</Text>
                          <Text className="mt-0.5 font-hell text-xs leading-4 text-gray-600">
                            {alert.message}
                          </Text>
                          <Text className="mt-1.5 font-hell text-[11px] text-gray-400">
                            {alert.created_at
                              ? new Date(alert.created_at).toLocaleString()
                              : 'Unknown time'}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default StatisticsScreen;
