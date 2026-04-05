import { Activity, Shield, User, Zap } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { useAuth } from '../../contexts/auth-context';
import { useActivityStatistics } from '../../hooks/useActivityStatistics';
import {
  bucketActivityEventsByDay,
  criticalActivityTotals,
  formatActivityDisplayName,
} from '../../utils/imu-activity';

const windowWidth = Dimensions.get('window').width;

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
      <Text className="text-xs text-gray-500 font-hell">Not enough data to display a trend</Text>
    );
  }

  const areaFill = color.includes('rgb')
    ? color.replace('rgb', 'rgba').replace(')', ', 0.15)')
    : `${color}30`;

  const activePoint = tooltipIndex != null ? chartData.points[tooltipIndex] : null;
  const activeLabel = tooltipIndex != null ? labels[tooltipIndex] : undefined;

  return (
    <View style={{ height: chartHeight + 40 + (activePoint ? 16 : 0) }}>
      {activePoint && (
        <View className="absolute left-0 right-0 items-center z-10" style={{ top: 0 }}>
          <View style={{ transform: [{ translateX: activePoint.x - chartWidth / 2 }] }}>
            <View className="px-3 py-1.5 bg-gray-900 rounded-full">
              <Text className="text-xs font-hell-round-bold text-white text-center">
                {activeLabel ? `${activeLabel.weekday} ${activeLabel.day} • ` : ''}
                {Math.round(activePoint.value * 10) / 10} events
              </Text>
            </View>
          </View>
        </View>
      )}

      <View {...panResponder.panHandlers} style={{ paddingTop: 20 }}>
        <Svg width={chartWidth} height={chartHeight}>
          <Rect x={0} y={0} width={chartWidth} height={chartHeight} fill="transparent" />
          <Path d={chartData.areaPath} fill={areaFill} />
          <Path d={chartData.linePath} stroke={color} strokeWidth={2.5} fill="none" />
          {chartData.points.map((point, index) => (
            <Circle key={index} cx={point.x} cy={point.y} r={4} fill={color} />
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
    <View className="mb-6">
      <Text className="text-xl font-hell-round-bold text-gray-900 mb-4 ">Overview</Text>
      {!hasActivityData ? (
        <Card variant="outlined" className="mb-4">
          <View className="p-6">
            <Text className="text-gray-600 font-hell text-center">
              No IMU activity events in the last 30 days. When the clip reports class changes (st, si, w, r, nf, f,
              af), they appear here.
            </Text>
          </View>
        </Card>
      ) : (
        <View className="flex-row gap-3 flex-wrap mb-4">
          <Card variant="outlined" className="flex-1 min-w-[140px]">
            <View className="p-4">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 bg-primary-accent rounded-lg items-center justify-center mr-2">
                  <Activity size={20} color="white" />
                </View>
                <Text className="text-2xl font-hell-round-bold text-gray-900 ">
                  {activity30?.total_events ?? 0}
                </Text>
              </View>
              <Text className="text-xs font-hell font-medium text-gray-600">State changes (30 days)</Text>
            </View>
          </Card>

          <Card variant="outlined" className="flex-1 min-w-[140px]">
            <View className="p-4">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 bg-warning rounded-lg items-center justify-center mr-2">
                  <Shield size={20} color="white" />
                </View>
                <Text className="text-2xl font-hell-round-bold text-gray-900 ">{imuCritical30.count}</Text>
              </View>
              <Text className="text-xs font-hell font-medium text-gray-600">
                Safety segments (nf · f · af)
              </Text>
            </View>
          </Card>

          <Card variant="outlined" className="flex-1 min-w-[140px]">
            <View className="p-4">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 bg-primary-button rounded-lg items-center justify-center mr-2">
                  <Zap size={20} color="white" />
                </View>
                <Text className="text-2xl font-hell-round-bold text-gray-900 ">
                  {Math.round(imuTrackedMinutes)}
                </Text>
              </View>
              <Text className="text-xs font-hell font-medium text-gray-600">
                Est. tracked minutes (from event spacing)
              </Text>
            </View>
          </Card>
        </View>
      )}
    </View>
  );

  const renderModeBreakdown = () => (
    <View className="mb-6">
      <Text className="text-xl font-hell-round-bold text-gray-900 mb-4 ">Safety & classes (30 days)</Text>
      {!hasActivityData ? (
        <Text className="text-gray-600 font-hell">No class data yet.</Text>
      ) : (
        <View className="gap-y-4">
          <View className="flex-row gap-3">
            <Card variant="outlined" className="flex-1">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-3">
                    <User size={24} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-hell-round-bold text-gray-900 ">
                      {activity30?.total_events ?? 0}
                    </Text>
                    <Text className="text-xs text-gray-600 font-hell">Posture / movement changes</Text>
                  </View>
                </View>
              </View>
            </Card>

            <Card variant="outlined" className="flex-1">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <View className="w-12 h-12 bg-warning rounded-xl items-center justify-center mr-3">
                    <Shield size={24} color="white" fill="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-hell-round-bold text-gray-900 ">{imuCritical30.count}</Text>
                    <Text className="text-xs text-gray-600 font-hell">Near-fall, falling, after-fall</Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
          {activity30?.by_activity && Object.keys(activity30.by_activity).length > 0 && (
            <Card variant="outlined">
              <View className="p-4">
                <Text className="text-base font-hell-round-bold text-gray-900 mb-3">Time by class</Text>
                {Object.entries(activity30.by_activity).map(([name, bucket]) => (
                  <View key={name} className="flex-row justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-700 font-hell">{formatActivityDisplayName(name)}</Text>
                    <Text className="font-hell-round-bold text-gray-900">
                      {formatMinutesFromSeconds(bucket.total_seconds ?? 0)} · {bucket.count ?? 0} segments
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </View>
      )}
    </View>
  );

  const renderActivity = () => (
    <View className="gap-6">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row bg-gray-100 rounded-full p-1">
          {(['trends', 'today'] as const).map((mode) => {
            const isActive = activityMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setActivityMode(mode)}
                className={`px-4 py-2 rounded-full ${isActive ? 'bg-gray-900' : ''}`}
                android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: true }}
              >
                <Text
                  className={`text-xs font-hell-round-bold ${isActive ? 'text-white' : 'text-gray-500'}`}
                >
                  {mode === 'trends' ? 'Trends' : 'Today'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {activityMode === 'trends' && (
          <View className="flex-row bg-gray-100 rounded-full p-1">
            {timeRangeOptions.map((option) => {
              const isActive = timeRange === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setTimeRange(option.id)}
                  className={`px-4 py-2 rounded-full ${isActive ? 'bg-white' : ''}`}
                  android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: true }}
                >
                  <Text
                    className={`text-xs font-hell-round-bold ${
                      isActive ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {activityMode === 'trends' ? (
        !hasActivityData ? (
          <Card variant="outlined" className="mb-6">
            <View className="p-8 items-center">
              <Activity size={48} color="#9CA3AF" />
              <Text className="text-lg font-hell-round-bold text-gray-900 mt-4 ">No events yet</Text>
              <Text className="text-gray-600 text-center mt-2 font-hell">
                Wearable events will build a daily trend once the device posts activity changes.
              </Text>
            </View>
          </Card>
        ) : (
          <Card variant="outlined" className="overflow-hidden">
            <View className="pt-4 pb-4 px-4">
              <Text className="text-lg font-hell-round-bold text-gray-900">Events per day</Text>
              <Text className="text-sm text-gray-600 font-hell mt-2">
                IMU class transitions (st, si, w, r, nf, f, af) — last {chartDayCount} days of selected range
              </Text>
            </View>
            <View className="pb-6 px-4">
              <LineChart values={imuEventValues} color="#2563eb" labels={imuChartLabels} />
              {imuChartLabels.length > 0 && (
                <View className="flex-row justify-between mt-4">
                  {imuChartLabels.map((label) => (
                    <View key={label.key} className="items-center flex-1">
                      <Text className="text-xs font-hell text-gray-500">{label.weekday.charAt(0)}</Text>
                      <Text className="text-xs font-hell text-gray-400">{label.day}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-xl">
              <Text className="text-xs text-gray-500 font-hell">
                30-day view shows up to 14 days on the chart; 7-day view shows the full week.
              </Text>
            </View>
          </Card>
        )
      ) : !userId ? (
        <Card variant="outlined">
          <View className="p-6">
            <Text className="text-gray-600 font-hell text-center">Sign in to see today&apos;s activity.</Text>
          </View>
        </Card>
      ) : (
        <Card variant="outlined">
          <View className="p-6">
            <Text className="text-lg font-hell-round-bold text-gray-900 mb-4">Today (IMU)</Text>
            <View className="flex-row gap-3 flex-wrap">
              <Card variant="outlined" className="flex-1 min-w-[100px]">
                <View className="items-center py-2">
                  <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mb-3">
                    <User size={24} color="white" />
                  </View>
                  <Text className="text-xs font-hell font-medium text-gray-600 mb-2">Events</Text>
                  <Text className="text-base font-hell-round-bold text-gray-900">
                    {activityToday?.total_events ?? 0}
                  </Text>
                </View>
              </Card>
              <Card variant="outlined" className="flex-1 min-w-[100px]">
                <View className="items-center py-2">
                  <View className="w-12 h-12 bg-success rounded-xl items-center justify-center mb-3">
                    <Activity size={24} color="white" />
                  </View>
                  <Text className="text-xs font-hell font-medium text-gray-600 mb-2">Top class</Text>
                  <Text className="text-sm font-hell-round-bold text-gray-900 text-center">
                    {topClassToday ? formatActivityDisplayName(topClassToday) : '—'}
                  </Text>
                </View>
              </Card>
              <Card variant="outlined" className="flex-1 min-w-[100px]">
                <View className="items-center py-2">
                  <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mb-3">
                    <Zap size={24} color="white" />
                  </View>
                  <Text className="text-xs font-hell font-medium text-gray-600 mb-2">Tracked time</Text>
                  <Text className="text-sm font-hell-round-bold text-gray-900 text-center">
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
              </Card>
            </View>
          </View>
        </Card>
      )}
    </View>
  );

  const renderActiveSection = () => {
    if (!userId) {
      return (
        <Card variant="outlined" className="mb-6">
          <View className="p-8 items-center">
            <Text className="text-gray-600 text-center font-hell">Sign in to view activity statistics.</Text>
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
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1 px-6">
        <Header
          title="Statistics"
          subtitle="IMU classes: st · si · w · r · nf · f · af"
        />

        {isLoading ? (
          <Card variant="outlined" className="mb-6">
            <View className="p-6 items-center">
              <ActivityIndicator size="large" color="#FF7300" />
              <Text className="text-gray-600 mt-4 font-hell">Loading activity statistics…</Text>
            </View>
          </Card>
        ) : (
          <>
            <View className="flex-row bg-gray-100 rounded-full p-1 mb-6 mt-2">
              {sectionTabs.map((tab) => {
                const isActive = activeSection === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setActiveSection(tab.id)}
                    className={`flex-1 py-2 px-4 rounded-full items-center ${isActive ? 'bg-white' : ''}`}
                    android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: true }}
                  >
                    <Text
                      className={`text-sm font-hell-round-bold ${
                        isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {renderActiveSection()}
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
};

export default StatisticsScreen;
