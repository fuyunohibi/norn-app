import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ImageBackground, ScrollView, Text, View } from 'react-native';
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
import { bucketActivityEventsByDay, criticalActivityTotals } from '../../utils/imu-activity';
import { HERO_MIN_HEIGHT, NornColors, heroTextShadow, shadowStyles } from '@/theme';

const StatisticsScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const insets = useSafeAreaInsets();
  const showStatsSignedIn = Boolean(userId);

  const { data: actTodayRes, isLoading: loadToday } = useActivityStatistics(userId, 'today');
  const { data: act7Res, isLoading: load7 } = useActivityStatistics(userId, '7d');
  const { data: act30Res, isLoading: load30 } = useActivityStatistics(userId, '30d');

  const activityToday = actTodayRes?.statistics;
  const activity7 = act7Res?.statistics;
  const activity30 = act30Res?.statistics;

  const isLoading = loadToday || load7 || load30;
  const hasActivityData = (activity30?.total_events ?? 0) > 0;
  const { data: persistedDailyStats = [] } = useQuery({
    queryKey: ['daily-statistics-summary', userId],
    queryFn: () => fetchDailyStatistics(userId!, 1),
    enabled: Boolean(userId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const { data: todayFallbackEvents = [] } = useQuery({
    queryKey: ['today-activity-events-fallback', userId],
    queryFn: () => fetchTodayActivityEvents(userId!),
    enabled: Boolean(userId),
    staleTime: 8_000,
    refetchInterval: 10_000,
  });
  const persistedTodaySummary = persistedDailyStats[0] ?? null;
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

  const imuDailyBuckets = useMemo(() => {
    if (!periodStats?.events?.length) return [];
    return bucketActivityEventsByDay(periodStats.events, chartDayCount);
  }, [periodStats?.events, chartDayCount]);

  const imuEventValues = imuDailyBuckets.map((b) => b.count);
  const imuChartLabels = imuDailyBuckets.map((b) => ({
    key: b.key,
    weekday: b.weekday,
    day: b.day,
  }));

  const imuCritical30 = useMemo(
    () => criticalActivityTotals(activity30?.by_activity),
    [activity30?.by_activity],
  );

  const imuTrackedMinutes = useMemo(() => {
    const by = activity30?.by_activity;
    if (!by) return 0;
    return Object.values(by).reduce((s, b) => s + (b.total_seconds ?? 0) / 60, 0);
  }, [activity30?.by_activity]);

  const topClassToday = useMemo(() => {
    const by = activityTodayEffective?.by_activity;
    if (!by || !Object.keys(by).length) return null;
    const sorted = Object.entries(by).sort((a, b) => (b[1].total_seconds ?? 0) - (a[1].total_seconds ?? 0));
    return sorted[0]?.[0] ?? null;
  }, [activityTodayEffective?.by_activity]);

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
            totalEvents30={activity30?.total_events ?? 0}
            safetySegments30={imuCritical30.count}
            trackedMinutes30={imuTrackedMinutes}
          />
        );
      case 'mode':
        return (
          <ModeBreakdownSection
            hasActivityData={hasActivityData}
            activity30={activity30 as ActivityStatistics | undefined}
            safetySegments30={imuCritical30.count}
          />
        );
      case 'activity':
        return (
          <ActivitySection
            activityMode={activityMode}
            setActivityMode={setActivityMode}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            timeRangeOptions={timeRangeOptions}
            hasActivityData={hasActivityData}
            showStatsSignedIn={showStatsSignedIn}
            chartDayCount={chartDayCount}
            imuEventValues={imuEventValues}
            imuChartLabels={imuChartLabels}
            activityToday={activityTodayEffective as ActivityStatistics | undefined}
            topClassToday={topClassToday}
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
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default StatisticsScreen;
