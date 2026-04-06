import { LinearGradient } from 'expo-linear-gradient';
import { Activity, BarChart3, Shield, User, Zap } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity as RNTouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../contexts/auth-context';
import { useActivityStatistics } from '../../hooks/useActivityStatistics';
import {
  bucketActivityEventsByDay,
  criticalActivityTotals,
  formatActivityDisplayName,
} from '../../utils/imu-activity';
import { HERO_MIN_HEIGHT, NornColors, heroTextShadow, shadowPresets, shadowStyles } from '@/theme';

const windowWidth = Dimensions.get('window').width;

/**
 * NativeWind's jsx wrapper replaces RN `TouchableOpacity` with a css-interop implementation
 * that can throw "Couldn't find a navigation context" inside tab navigators. Using
 * `createElement` targets the real RN component and avoids that wrapper.
 */
function RawTouchableOpacity(
  props: React.ComponentProps<typeof RNTouchableOpacity>,
): React.ReactElement {
  return React.createElement(RNTouchableOpacity, props);
}

const touchStyles = StyleSheet.create({
  sectionTab: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sectionTabActive: {
    backgroundColor: NornColors.brandOrange,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...shadowPresets.pill,
  },
  trendsPill: {
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  trendsPillActive: {
    backgroundColor: NornColors.brandOrange,
  },
  rangePillActive: {
    backgroundColor: NornColors.brandOrange,
  },
});

function formatMinutesFromSeconds(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

type ChartLabel = { key: string; weekday: string; day: string };

const LineChart: React.FC<{
  values: number[];
  color: string;
  labels: ChartLabel[];
}> = ({ values, color, labels }) => {
  const chartWidth = useMemo(() => Math.max(windowWidth - 80, 260), []);
  const chartHeight = 120;
  const verticalPadding = 12;

  const chartData = useMemo(() => {
    const validValues = values.filter(
      (value) => typeof value === 'number' && value > 0 && !Number.isNaN(value),
    );

    if (validValues.length < 2) {
      return {
        points: [] as Array<{ x: number; y: number; value: number }>,
        linePath: '',
        areaPath: '',
      };
    }

    let previousValue = validValues[0];
    const safeValues = values.map((value) => {
      if (typeof value === 'number' && value > 0 && !Number.isNaN(value)) {
        previousValue = value;
        return value;
      }
      return previousValue;
    });

    const minValue = Math.min(...safeValues);
    const maxValue = Math.max(...safeValues);
    const range = maxValue - minValue || 1;
    const yRange = chartHeight - verticalPadding * 2;

    const points = safeValues.map((value, index) => {
      const x = safeValues.length === 1 ? chartWidth / 2 : (index / (safeValues.length - 1)) * chartWidth;
      const normalized = (value - minValue) / range;
      const y = chartHeight - verticalPadding - normalized * yRange;
      return { x, y, value };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

    return { points, linePath, areaPath };
  }, [chartHeight, chartWidth, values]);

  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  const handleGesture = useCallback(
    (x: number) => {
      const { points } = chartData;
      if (!points.length) return;
      const clampedX = Math.max(0, Math.min(x, chartWidth));
      const index = Math.round((clampedX / chartWidth) * (points.length - 1));
      setTooltipIndex(index);
    },
    [chartData, chartWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => chartData.points.length > 0,
        onMoveShouldSetPanResponder: () => chartData.points.length > 0,
        onPanResponderGrant: (evt) => handleGesture(evt.nativeEvent.locationX),
        onPanResponderMove: (evt) => handleGesture(evt.nativeEvent.locationX),
        onPanResponderRelease: () => setTooltipIndex(null),
        onPanResponderTerminate: () => setTooltipIndex(null),
      }),
    [chartData.points.length, handleGesture],
  );

  if (chartData.points.length < 2) {
    return (
      <View className="items-center justify-center rounded-2xl bg-orange-50/60 px-4 py-8">
        <BarChart3 size={28} color={NornColors.brandOrange} strokeWidth={2} />
        <Text className="mt-3 text-center text-sm font-hell text-gray-600">
          Not enough days with events to show a trend yet.
        </Text>
      </View>
    );
  }

  const areaGradId = 'statsChartAreaFill';

  const activePoint = tooltipIndex != null ? chartData.points[tooltipIndex] : null;
  const activeLabel = tooltipIndex != null ? labels[tooltipIndex] : undefined;

  return (
    <View style={{ height: chartHeight + 40 + (activePoint ? 16 : 0) }}>
      {activePoint && (
        <View className="absolute left-0 right-0 z-10 items-center" style={{ top: 0 }}>
          <View style={{ transform: [{ translateX: activePoint.x - chartWidth / 2 }] }}>
            <View className="rounded-2xl border border-white/15 bg-gray-900/95 px-3.5 py-2">
              <Text className="text-center text-xs font-hell-round-bold text-white">
                {activeLabel ? `${activeLabel.weekday} ${activeLabel.day} · ` : ''}
                {Math.round(activePoint.value * 10) / 10} events
              </Text>
            </View>
          </View>
        </View>
      )}

      <View {...panResponder.panHandlers} style={{ paddingTop: 20 }}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <SvgLinearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0.03} />
            </SvgLinearGradient>
          </Defs>
          <Rect x={0} y={0} width={chartWidth} height={chartHeight} fill="transparent" />
          <Path d={chartData.areaPath} fill={`url(#${areaGradId})`} />
          <Path
            d={chartData.linePath}
            stroke={color}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chartData.points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={5}
              fill="#ffffff"
              stroke={color}
              strokeWidth={2.5}
            />
          ))}
          {activePoint && (
            <Path
              d={`M ${activePoint.x} 0 L ${activePoint.x} ${chartHeight}`}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="4"
            />
          )}
        </Svg>
      </View>
    </View>
  );
};

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

  const [activeSection, setActiveSection] = useState<'overview' | 'mode' | 'activity'>('activity');
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [activityMode, setActivityMode] = useState<'trends' | 'today'>('trends');

  const sectionTabs = [
    { id: 'activity', label: 'Activity' },
    { id: 'mode', label: 'Safety' },
    { id: 'overview', label: 'Overview' },
  ] as const;

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
    const by = activityToday?.by_activity;
    if (!by || !Object.keys(by).length) return null;
    const sorted = Object.entries(by).sort((a, b) => (b[1].total_seconds ?? 0) - (a[1].total_seconds ?? 0));
    return sorted[0]?.[0] ?? null;
  }, [activityToday?.by_activity]);

  const renderOverview = () => (
    <View className="mb-2">
      <Text className="mb-1 text-xs font-hell-round-bold uppercase tracking-[0.08em] text-gray-400">
        Summary
      </Text>
      <Text className="mb-5 text-xl font-hell-round-bold text-gray-900">Overview</Text>
      {!hasActivityData ? (
        <View
          className="overflow-hidden rounded-3xl border border-orange-100/80 bg-orange-50/35 px-5 py-8"
          style={shadowStyles.card}
        >
          <Text className="text-center font-hell text-base leading-6 text-gray-600">
            No activity from your clip in the last 30 days. When it picks up changes in how you move or rest, those
            moments will appear here.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          <View
            className="min-w-[140px] flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
            style={shadowStyles.card}
          >
            <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/90">
              <Activity size={22} color={NornColors.brandOrange} strokeWidth={2.2} />
            </View>
            <Text className="text-3xl font-hell-round-bold text-gray-900">{activity30?.total_events ?? 0}</Text>
            <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">State changes (30 days)</Text>
          </View>

          <View
            className="min-w-[140px] flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
            style={shadowStyles.card}
          >
            <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50/90">
              <Shield size={22} color="#D97706" strokeWidth={2.2} />
            </View>
            <Text className="text-3xl font-hell-round-bold text-gray-900">{imuCritical30.count}</Text>
            <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">
              Safety segments (near-fall, falling, after-fall)
            </Text>
          </View>

          <View
            className="min-w-[140px] flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
            style={shadowStyles.card}
          >
            <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/90">
              <Zap size={22} color="#306DEE" strokeWidth={2.2} />
            </View>
            <Text className="text-3xl font-hell-round-bold text-gray-900">{Math.round(imuTrackedMinutes)}</Text>
            <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">Est. tracked minutes</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderModeBreakdown = () => (
    <View className="mb-2">
      <Text className="mb-1 text-xs font-hell-round-bold uppercase tracking-[0.08em] text-gray-400">
        Safety
      </Text>
      <Text className="mb-5 text-xl font-hell-round-bold text-gray-900">Activity breakdown (30 days)</Text>
      {!hasActivityData ? (
        <View className="rounded-3xl border border-gray-100 bg-gray-50/80 px-5 py-6">
          <Text className="text-center font-hell text-gray-600">No activity breakdown yet.</Text>
        </View>
      ) : (
        <View className="gap-4">
          <View className="flex-row gap-3">
            <View
              className="flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
              style={shadowStyles.card}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/90">
                  <User size={24} color="#306DEE" fill="#306DEE" strokeWidth={2.2} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-2xl font-hell-round-bold text-gray-900">
                    {activity30?.total_events ?? 0}
                  </Text>
                  <Text className="mt-0.5 font-hell text-xs leading-4 text-gray-500">Posture / movement changes</Text>
                </View>
              </View>
            </View>

            <View
              className="flex-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
              style={shadowStyles.card}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50/90">
                  <Shield size={24} color="#D97706" fill="#D97706" strokeWidth={2} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-2xl font-hell-round-bold text-gray-900">{imuCritical30.count}</Text>
                  <Text className="mt-0.5 font-hell text-xs leading-4 text-gray-500">
                    Near-fall, falling, after-fall
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {activity30?.by_activity && Object.keys(activity30.by_activity).length > 0 && (
            <View
              className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-4"
              style={shadowStyles.card}
            >
              <Text className="mb-3 text-base font-hell-round-bold text-gray-900">Time by activity</Text>
              {Object.entries(activity30.by_activity).map(([name, bucket]) => {
                const segmentCount = bucket.count ?? 0;
                const segmentLabel = segmentCount === 1 ? 'segment' : 'segments';
                return (
                  <View
                    key={name}
                    className="mb-2 flex-row items-center justify-between rounded-2xl bg-gray-50/90 px-3.5 py-3 last:mb-0"
                  >
                    <Text className="mr-2 flex-shrink font-hell text-gray-800">{formatActivityDisplayName(name)}</Text>
                    <Text className="font-hell-round-bold text-gray-900">
                      {formatMinutesFromSeconds(bucket.total_seconds ?? 0)} · {segmentCount} {segmentLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderActivity = () => (
    <View className="gap-5">
      <View className="mb-1">
        <Text className="text-xs font-hell-round-bold uppercase tracking-[0.08em] text-gray-400">Activity</Text>
        <Text className="mt-1 text-xl font-hell-round-bold text-gray-900">Trends & today</Text>
      </View>

      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-row rounded-full bg-gray-100 p-1">
          {(['trends', 'today'] as const).map((mode) => {
            const isActive = activityMode === mode;
            return (
              <RawTouchableOpacity
                key={mode}
                activeOpacity={0.88}
                onPress={() => setActivityMode(mode)}
                style={[touchStyles.trendsPill, isActive && touchStyles.trendsPillActive]}
              >
                <Text
                  className={`text-xs font-hell-round-bold ${isActive ? 'text-white' : 'text-gray-500'}`}
                >
                  {mode === 'trends' ? 'Trends' : 'Today'}
                </Text>
              </RawTouchableOpacity>
            );
          })}
        </View>
        {activityMode === 'trends' && (
          <View className="flex-row rounded-full bg-gray-100 p-1">
            {timeRangeOptions.map((option) => {
              const isActive = timeRange === option.id;
              return (
                <RawTouchableOpacity
                  key={option.id}
                  activeOpacity={0.88}
                  onPress={() => setTimeRange(option.id)}
                  style={[touchStyles.trendsPill, isActive && touchStyles.rangePillActive]}
                >
                  <Text
                    className={`text-xs font-hell-round-bold ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {option.label}
                  </Text>
                </RawTouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {activityMode === 'trends' ? (
        !hasActivityData ? (
          <View
            className="items-center overflow-hidden rounded-3xl border border-gray-100 bg-gray-50/90 px-6 py-10"
            style={shadowStyles.card}
          >
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <BarChart3 size={30} color="#9CA3AF" strokeWidth={2} />
            </View>
            <Text className="mt-5 text-lg font-hell-round-bold text-gray-900">No events yet</Text>
            <Text className="mt-2 max-w-xs text-center font-hell text-sm leading-5 text-gray-600">
              Daily trends appear once your clip starts posting activity changes.
            </Text>
          </View>
        ) : (
          <View
            className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
            style={shadowStyles.card}
          >
            <ImageBackground
              source={require('../../assets/images/backgrounds/daytime-bg.png')}
              resizeMode="cover"
              className="w-full overflow-hidden rounded-t-3xl"
              style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}
            >
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255, 255, 255, 0.82)' }]}
              />
              <View>
                <Text className="text-lg font-hell-round-bold text-gray-900">Events per day</Text>
                <Text className="mt-1.5 font-hell text-sm leading-5 text-gray-600">
                  {`How often your clip reported a change in movement or posture — last ${chartDayCount} days in this range`}
                </Text>
              </View>
            </ImageBackground>
            <View className="px-4 pb-6 pt-1">
              <LineChart values={imuEventValues} color={NornColors.brandOrange} labels={imuChartLabels} />
              {imuChartLabels.length > 0 && (
                <View className="mt-5 flex-row justify-between border-t border-gray-100 pt-4">
                  {imuChartLabels.map((label) => (
                    <View key={label.key} className="flex-1 items-center">
                      <Text className="text-xs font-hell-round-bold text-gray-700">{label.weekday.charAt(0)}</Text>
                      <Text className="mt-0.5 text-[10px] font-hell text-gray-400">{label.day}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View className="border-t border-gray-100 bg-gray-50/80 px-5 py-3.5">
              <Text className="text-center text-xs font-hell leading-4 text-gray-500">
                14-day view plots the last 14 days; 7-day shows the full week.
              </Text>
            </View>
          </View>
        )
      ) : !showStatsSignedIn ? (
        <View className="rounded-3xl border border-orange-100/80 bg-orange-50/35 px-5 py-8">
          <Text className="text-center font-hell text-base text-gray-600">Sign in to see today&apos;s activity.</Text>
        </View>
      ) : (
        <View
          className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
          style={shadowStyles.card}
        >
          <ImageBackground
            source={require('../../assets/images/backgrounds/daytime-bg.png')}
            resizeMode="cover"
            className="w-full overflow-hidden rounded-t-3xl"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0.48)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View className="px-5 pb-3.5 pt-[18px]">
              <Text className="text-lg font-hell-round-bold text-white" style={heroTextShadow}>
                Today
              </Text>
              <Text className="mt-1 font-hell text-xs leading-4 text-white/90" style={heroTextShadow}>
                Snapshot from your clip so far today
              </Text>
            </View>
          </ImageBackground>
          <View className="flex-row flex-wrap gap-3 px-4 pb-5 pt-1">
            <View className="min-w-[108px] flex-1 rounded-2xl border border-gray-200/70 bg-white px-3.5 py-4 shadow-sm">
              <View className="mx-auto mb-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-blue-100/90 bg-blue-50">
                <User size={22} color="#306DEE" strokeWidth={2.2} fill="#306DEE" />
              </View>
              <Text className="text-center text-[10px] font-hell-round-bold uppercase tracking-[0.06em] text-gray-400">
                Events
              </Text>
              <Text className="mt-1.5 text-center text-2xl font-hell-round-bold text-gray-900">
                {activityToday?.total_events ?? 0}
              </Text>
            </View>
            <View className="min-w-[108px] flex-1 rounded-2xl border border-gray-200/70 bg-white px-3.5 py-4 shadow-sm">
              <View className="mx-auto mb-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100/90 bg-emerald-50">
                <Activity size={22} color="#059669" strokeWidth={2.2} />
              </View>
              <Text className="text-center text-[10px] font-hell-round-bold uppercase tracking-[0.06em] text-gray-400">
                Top activity
              </Text>
              <Text
                className="mt-1.5 min-h-[40px] text-center text-sm font-hell-round-bold leading-5 text-gray-900"
                numberOfLines={2}
              >
                {topClassToday ? formatActivityDisplayName(topClassToday) : '—'}
              </Text>
            </View>
            <View className="min-w-[108px] flex-1 rounded-2xl border border-gray-200/70 bg-white px-3.5 py-4 shadow-sm">
              <View className="mx-auto mb-3.5 h-12 w-12 items-center justify-center rounded-2xl border border-orange-100/90 bg-orange-50/90">
                <Zap size={22} color={NornColors.brandOrange} strokeWidth={2.2} />
              </View>
              <Text className="text-center text-[10px] font-hell-round-bold uppercase tracking-[0.06em] text-gray-400">
                Tracked time
              </Text>
              <Text className="mt-1.5 text-center text-lg font-hell-round-bold text-gray-900">
                {activityToday?.by_activity
                  ? formatMinutesFromSeconds(
                      Object.values(activityToday.by_activity).reduce(
                        (s, b) => s + (b.total_seconds ?? 0),
                        0,
                      ),
                    )
                  : '—'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderActiveSection = () => {
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
        return renderOverview();
      case 'mode':
        return renderModeBreakdown();
      case 'activity':
        return renderActivity();
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

              <View
                className="mt-4 overflow-hidden rounded-3xl border border-gray-200/90 bg-gray-100 p-1"
                style={shadowStyles.card}
              >
                <View className="flex-row">
                  {sectionTabs.map((tab) => {
                    const isActive = activeSection === tab.id;
                    return (
                      <RawTouchableOpacity
                        key={tab.id}
                        activeOpacity={0.88}
                        onPress={() => setActiveSection(tab.id)}
                        style={[touchStyles.sectionTab, isActive && touchStyles.sectionTabActive]}
                      >
                        <Text
                          className={`text-sm font-hell-round-bold ${
                            isActive ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {tab.label}
                        </Text>
                      </RawTouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="mt-8">{renderActiveSection()}</View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default StatisticsScreen;
