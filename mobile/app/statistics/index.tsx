import { useQuery } from '@tanstack/react-query';
import { Activity, Calendar, Moon, Shield, Star, TrendingUp } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { fetchDailyStatistics, seedDailyStatisticsFromMock } from '../../actions/statistics.actions';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { useAuth } from '../../contexts/auth-context';
import { useSleepSummaries } from '../../hooks/useSleepSummaries';
import { getMockSleepSummaries, USE_MOCK_STATISTICS } from '../../utils/mock-statistics';

const windowWidth = Dimensions.get('window').width;

type ChartLabel = {
  key: string;
  weekday: string;
  day: string;
};

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
      (value) => typeof value === 'number' && value > 0 && !Number.isNaN(value)
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

    return {
      points,
      linePath,
      areaPath,
    };
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
    [chartData, chartWidth]
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
    [chartData.points.length, handleGesture]
  );

  if (chartData.points.length < 2) {
    return (
      <Text className="text-xs text-gray-500 font-hell">
        Not enough data to display trend
      </Text>
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
        <View
          className="absolute left-0 right-0 items-center z-10"
          style={{ top: 0 }}
        >
          <View
            style={{
              transform: [{ translateX: activePoint.x - chartWidth / 2 }],
            }}
          >
            <View className="px-3 py-1.5 bg-gray-900 rounded-full">
              <Text className="text-xs font-hell-round-bold text-white text-center">
                {activeLabel ? `${activeLabel.weekday} ${activeLabel.day} • ` : ''}
                {Math.round(activePoint.value * 10) / 10}
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
  const fallbackUserId = '0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61';
  const userId = useMemo(() => user?.id ?? fallbackUserId, [user?.id]);
  const insets = useSafeAreaInsets();

  const { data: dailyStats = [], isLoading: dailyStatsLoading, refetch: refetchDailyStats } = useQuery({
    queryKey: ['daily-statistics', userId],
    queryFn: async () => {
      if (!userId) return [];
      let rows = await fetchDailyStatistics(userId, 120);
      if (!rows.length && __DEV__) {
        await seedDailyStatisticsFromMock(userId);
        rows = await fetchDailyStatistics(userId, 120);
      }
      return rows;
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Generate dates for the last 7 days to fetch sleep summaries
  const sleepSummaryDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  // Fetch sleep summaries for the last 7 days
  const shouldFetchRealSummaries = !USE_MOCK_STATISTICS && !!userId;
  const { data: fetchedSleepSummaries, isLoading: sleepSummariesLoading } = useSleepSummaries(
    shouldFetchRealSummaries ? userId : undefined,
    shouldFetchRealSummaries ? sleepSummaryDates : []
  );
  const mockSleepSummaries = useMemo(
    () => (USE_MOCK_STATISTICS ? getMockSleepSummaries() : []),
    []
  );
  const sleepSummaries = USE_MOCK_STATISTICS
    ? mockSleepSummaries
    : fetchedSleepSummaries || [];

  const isLoading =
    dailyStatsLoading || (shouldFetchRealSummaries && sleepSummariesLoading);

  const stats = useMemo(() => {
    if (!dailyStats || dailyStats.length === 0) {
      return {
        totalReadings: 0,
        sleepReadings: 0,
        fallReadings: 0,
        totalHours: 0,
        latestSleep: null,
        latestFall: null,
        dailySummaries: [],
      };
    }

    const sortedByDate = [...dailyStats].sort(
      (a, b) => new Date(b.stat_date).getTime() - new Date(a.stat_date).getTime()
    );

    let totalReadings = 0;
    let sleepReadings = 0;
    let fallReadings = 0;
    let earliestTimestamp: number | null = null;
    let latestTimestamp: number | null = null;
    let latestSleepTimestamp: string | null = null;
    let latestFallTimestamp: string | null = null;

    const dailySummaries = sortedByDate.map((entry) => {
      totalReadings += entry.total_readings ?? 0;
      sleepReadings += entry.sleep_readings ?? 0;
      fallReadings += entry.fall_readings ?? 0;

      if (entry.first_reading_at) {
        const value = new Date(entry.first_reading_at).getTime();
        if (!Number.isNaN(value) && (earliestTimestamp === null || value < earliestTimestamp)) {
          earliestTimestamp = value;
        }
      }

      if (entry.last_reading_at) {
        const value = new Date(entry.last_reading_at).getTime();
        if (!Number.isNaN(value) && (latestTimestamp === null || value > latestTimestamp)) {
          latestTimestamp = value;
        }
      }

      if (entry.last_sleep_reading_at) {
        if (
          !latestSleepTimestamp ||
          new Date(entry.last_sleep_reading_at).getTime() > new Date(latestSleepTimestamp).getTime()
        ) {
          latestSleepTimestamp = entry.last_sleep_reading_at;
        }
      }

      if (entry.last_fall_reading_at) {
        if (
          !latestFallTimestamp ||
          new Date(entry.last_fall_reading_at).getTime() > new Date(latestFallTimestamp).getTime()
        ) {
          latestFallTimestamp = entry.last_fall_reading_at;
        }
      }

      const statDate = new Date(`${entry.stat_date}T00:00:00Z`);
      const avgBreath =
        entry.respiration_count > 0
          ? Math.round(((Number(entry.respiration_sum ?? 0) / entry.respiration_count) || 0) * 10) / 10
          : null;
      const avgHRV =
        entry.hrv_count > 0
          ? Math.round(((Number(entry.hrv_sum ?? 0) / entry.hrv_count) || 0) * 10) / 10
          : null;

      return {
        key: entry.stat_date,
        date: statDate,
        count: entry.total_readings ?? 0,
        weekday: statDate.toLocaleDateString('en-US', { weekday: 'short' }),
        day: statDate.toLocaleDateString('en-US', { day: '2-digit' }),
        breathRate: avgBreath,
        hrv: avgHRV,
      };
    });

    const totalHours =
      earliestTimestamp !== null && latestTimestamp !== null && latestTimestamp > earliestTimestamp
        ? Math.round(((latestTimestamp - earliestTimestamp) / (1000 * 60 * 60)) * 10) / 10
        : 0;

    return {
      totalReadings,
      sleepReadings,
      fallReadings,
      totalHours,
      latestSleep: latestSleepTimestamp ? { timestamp: latestSleepTimestamp } : null,
      latestFall: latestFallTimestamp ? { timestamp: latestFallTimestamp } : null,
      dailySummaries,
    };
  }, [dailyStats]);

  const [activeSection, setActiveSection] = useState<'overview' | 'mode' | 'activity'>('activity');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [activityMode, setActivityMode] = useState<'trends' | 'today'>('trends');

  const sectionTabs = [
    { id: 'activity', label: 'Activity' },
    { id: 'mode', label: 'Modes' },
    { id: 'overview', label: 'Overview' },
  ] as const;

  const timeRangeOptions = [
    { id: '7d', label: '7-day' },
    { id: '30d', label: '30-day' },
    { id: '90d', label: '90-day' },
  ] as const;

  const timeRangeToDays: Record<typeof timeRangeOptions[number]['id'], number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };

  const selectedDailySummaries = useMemo(() => {
    const limit = Math.min(timeRangeToDays[timeRange], 14);
    return stats.dailySummaries.slice(0, limit);
  }, [stats.dailySummaries, timeRange]);

  const chartData = useMemo(() => [...selectedDailySummaries].reverse(), [selectedDailySummaries]);

  const breathingValues = chartData.map((entry) =>
    typeof entry.breathRate === 'number' ? entry.breathRate : 0
  );
  const hrvValues = chartData.map((entry) =>
    typeof entry.hrv === 'number' ? entry.hrv : 0
  );

  const latestBreathing = selectedDailySummaries[0]?.breathRate ?? null;
  const latestHRV = selectedDailySummaries[0]?.hrv ?? null;

  const chartLabels = chartData.map((entry) => ({
    key: entry.key,
    weekday: entry.weekday,
    day: entry.day,
  }));

  // Calculate average sleep score from summaries
  const sleepScoreStats = useMemo(() => {
    if (!sleepSummaries || sleepSummaries.length === 0) {
      return {
        averageScore: null,
        averageGrade: null,
        latestScore: null,
        latestGrade: null,
        latestDate: null,
      };
    }

    const validSummaries = sleepSummaries.filter((s) => s.summary !== null);
    if (validSummaries.length === 0) {
      return {
        averageScore: null,
        averageGrade: null,
        latestScore: null,
        latestGrade: null,
        latestDate: null,
      };
    }

    const scores = validSummaries.map((s) => s.summary!.overall_quality);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Get grade from average score
    const getGrade = (score: number): string => {
      if (score >= 85) return 'A';
      if (score >= 75) return 'B';
      if (score >= 65) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    };

    const latest = validSummaries[0]; // First one is the most recent date

    return {
      averageScore: Math.round(averageScore * 10) / 10,
      averageGrade: getGrade(averageScore),
      latestScore: latest.summary!.overall_quality,
      latestGrade: latest.summary!.sleep_score_grade,
      latestDate: latest.date,
    };
  }, [sleepSummaries]);

  const renderOverview = () => (
    <View className="mb-6">
      <Text className="text-xl font-hell-round-bold text-gray-900 mb-4 ">Overview</Text>
      <View className="flex-row gap-3 flex-wrap">
        <Card variant="outlined" className="flex-1 min-w-[140px]">
          <View className="p-4">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 bg-primary-accent rounded-lg items-center justify-center mr-2">
                <Activity size={20} color="white" />
              </View>
              <Text className="text-2xl font-hell-round-bold text-gray-900 ">
                {stats.totalReadings}
              </Text>
            </View>
            <Text className="text-xs font-hell font-medium text-gray-600">
              Total Readings
            </Text>
          </View>
        </Card>

        <Card variant="outlined" className="flex-1 min-w-[140px]">
          <View className="p-4">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 bg-primary-button rounded-lg items-center justify-center mr-2">
                <Calendar size={20} color="white" />
              </View>
              <Text className="text-2xl font-hell-round-bold text-gray-900 ">
                {stats.totalHours}
              </Text>
            </View>
            <Text className="text-xs font-hell font-medium text-gray-600">
              Hours Monitored
            </Text>
          </View>
        </Card>
      </View>

      {/* Sleep Score Section */}
      {sleepScoreStats.latestScore !== null && (
        <View className="mt-4">
          <Card variant="outlined" className="overflow-hidden">
            <View className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-3">
                    <Star size={24} color="white" fill="white" />
                  </View>
                  <View>
                    <Text className="text-lg font-hell-round-bold text-gray-900">
                      Sleep Score
                    </Text>
                    <Text className="text-xs text-gray-600 font-hell">
                      {sleepScoreStats.latestDate
                        ? new Date(sleepScoreStats.latestDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Latest'}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <View className="flex-row items-baseline">
                    <Text className="text-3xl font-hell-round-bold text-gray-900 mr-2">
                      {Math.round(sleepScoreStats.latestScore)}
                    </Text>
                    <View
                      className={`px-3 py-1 rounded-lg ${
                        sleepScoreStats.latestGrade === 'A'
                          ? 'bg-green-100'
                          : sleepScoreStats.latestGrade === 'B'
                          ? 'bg-blue-100'
                          : sleepScoreStats.latestGrade === 'C'
                          ? 'bg-yellow-100'
                          : sleepScoreStats.latestGrade === 'D'
                          ? 'bg-orange-100'
                          : 'bg-red-100'
                      }`}
                    >
                      <Text
                        className={`text-sm font-hell-round-bold ${
                          sleepScoreStats.latestGrade === 'A'
                            ? 'text-green-700'
                            : sleepScoreStats.latestGrade === 'B'
                            ? 'text-blue-700'
                            : sleepScoreStats.latestGrade === 'C'
                            ? 'text-yellow-700'
                            : sleepScoreStats.latestGrade === 'D'
                            ? 'text-orange-700'
                            : 'text-red-700'
                        }`}
                      >
                        {sleepScoreStats.latestGrade}
                      </Text>
                    </View>
                  </View>
                  {sleepScoreStats.averageScore !== null && (
                    <Text className="text-xs text-gray-500 font-hell mt-1">
                      7-day avg: {Math.round(sleepScoreStats.averageScore)} ({sleepScoreStats.averageGrade})
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Daily Sleep Scores List */}
      {sleepSummaries && sleepSummaries.length > 0 && (
        <View className="mt-4">
          <Text className="text-base font-hell-round-bold text-gray-900 mb-3">
            Daily Sleep Scores
          </Text>
          <Card variant="outlined">
            <View className="p-4">
              {sleepSummaries
                .filter((s) => s.summary !== null)
                .slice(0, 7)
                .map((entry, index) => {
                  const summary = entry.summary!;
                  const date = new Date(entry.date);
                  const gradeColor =
                    summary.sleep_score_grade === 'A'
                      ? 'text-green-700 bg-green-100'
                      : summary.sleep_score_grade === 'B'
                      ? 'text-blue-700 bg-blue-100'
                      : summary.sleep_score_grade === 'C'
                      ? 'text-yellow-700 bg-yellow-100'
                      : summary.sleep_score_grade === 'D'
                      ? 'text-orange-700 bg-orange-100'
                      : 'text-red-700 bg-red-100';

                  return (
                    <View
                      key={entry.date}
                      className={`flex-row items-center justify-between py-3 ${
                        index < sleepSummaries.filter((s) => s.summary !== null).length - 1
                          ? 'border-b border-gray-100'
                          : ''
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="text-sm font-hell-round-bold text-gray-900">
                          {date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                        <Text className="text-xs text-gray-500 font-hell mt-1">
                          {Math.round(summary.total_sleep_time_minutes / 60)}h{' '}
                          {summary.total_sleep_time_minutes % 60}m sleep
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-xl font-hell-round-bold text-gray-900 mr-3">
                          {Math.round(summary.overall_quality)}
                        </Text>
                        <View className={`px-2 py-1 rounded ${gradeColor}`}>
                          <Text className={`text-xs font-hell-round-bold`}>
                            {summary.sleep_score_grade}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              {sleepSummaries.filter((s) => s.summary !== null).length === 0 && (
                <Text className="text-sm text-gray-500 font-hell text-center py-4">
                  No sleep data available
                </Text>
              )}
            </View>
          </Card>
        </View>
      )}
    </View>
  );

  const renderModeBreakdown = () => (
    <View className="mb-6">
      <Text className="text-xl font-hell-round-bold text-gray-900 mb-4 ">Mode Breakdown</Text>
      <View className="flex-row gap-3">
        <Card variant="outlined" className="flex-1">
          <View className="p-4">
            <View className="flex-row items-center mb-3">
              <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-3">
                <Moon size={24} color="white" fill="white" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-hell-round-bold text-gray-900 ">
                  {stats.sleepReadings}
                </Text>
                <Text className="text-xs text-gray-600 font-hell">
                  Sleep Sessions
                </Text>
              </View>
            </View>
            {stats.latestSleep && (
              <Text className="text-xs text-gray-500 font-hell">
                Last: {new Date(stats.latestSleep.timestamp).toLocaleString()}
              </Text>
            )}
          </View>
        </Card>

        <Card variant="outlined" className="flex-1">
          <View className="p-4">
            <View className="flex-row items-center mb-3">
              <View className="w-12 h-12 bg-warning rounded-xl items-center justify-center mr-3">
                <Shield size={24} color="white" fill="white" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-hell-round-bold text-gray-900 ">
                  {stats.fallReadings}
                </Text>
                <Text className="text-xs text-gray-600 font-hell">
                  Fall Sessions
                </Text>
              </View>
            </View>
            {stats.latestFall && (
              <Text className="text-xs text-gray-500 font-hell">
                Last: {new Date(stats.latestFall.timestamp).toLocaleString()}
              </Text>
            )}
          </View>
        </Card>
      </View>
    </View>
  );

  const renderDailySummaryList = () => {
    const items = selectedDailySummaries.slice(0, 7);
    if (!items.length) return null;

    return (
      <Card variant="outlined" className="mt-6">
        <View className="p-4">
          {items.map((entry, index) => (
            <View
              key={entry.key}
              className={`flex-row items-center justify-between py-3 ${
                index < items.length - 1 ? 'border-b border-gray-200' : ''
              }`}
            >
              <View className="flex-row items-center">
                <Calendar size={16} color="#6B7280" />
                <Text className="text-sm font-hell font-medium text-gray-900 ml-2">
                  {entry.weekday} {entry.day}
                </Text>
              </View>
              <Text className="text-xs font-hell text-gray-500">
                {entry.count} readings
              </Text>
            </View>
          ))}
        </View>
      </Card>
    );
  };

  const renderActivity = () => {
    if (stats.dailySummaries.length === 0) {
      return (
        <Card variant="outlined" className="mb-6">
          <View className="p-8 items-center">
            <Activity size={48} color="#9CA3AF" />
            <Text className="text-lg font-hell-round-bold text-gray-900 mt-4 ">
              No Activity Yet
            </Text>
            <Text className="text-gray-600 text-center mt-2 font-hell">
              Start using the sensor to see your activity trends.
            </Text>
          </View>
        </Card>
      );
    }

    const renderMetricCard = (
      title: string,
      subtitle: string,
      chartNode: React.ReactNode,
      rationale: string
    ) => (
      <Card variant="outlined" className="overflow-hidden">
        <View className="pt-4 pb-4">
          <Text className="text-lg font-hell-round-bold text-gray-900">{title}</Text>
          <Text className="text-sm text-gray-600 font-hell mt-2">{subtitle}</Text>
        </View>
        <View className="pb-6">
          <Text className="text-sm font-hell-round-bold text-gray-900 mb-3">
            {title === 'Breathing rate (BR)' ? 'Breaths Per Minute' : 'Milliseconds (ms)'}
          </Text>
          {chartNode}
          {chartLabels.length > 0 && (
            <View className="flex-row justify-between mt-4">
              {chartLabels.map((label) => (
                <View key={label.key} className="items-center flex-1">
                  <Text className="text-xs font-hell text-gray-500">
                    {label.weekday.charAt(0)}
                  </Text>
                  <Text className="text-xs font-hell text-gray-400">{label.day}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-xl">
          <Text className="text-xs text-gray-500 font-hell">{rationale}</Text>
        </View>
      </Card>
    );

    return (
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
                    className={`text-xs font-hell-round-bold ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {mode === 'trends' ? 'Trends' : 'Today'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row bg-gray-100 rounded-full p-1">
            {timeRangeOptions.map((option) => {
              const isActive = timeRange === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setTimeRange(option.id)}
                  className={`px-4 py-2 rounded-full ${
                    isActive ? 'bg-white' : ''
                  }`}
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
        </View>

        {activityMode === 'trends' ? (
          <>
            {renderMetricCard(
              'Breathing rate (BR)',
              latestBreathing != null
                ? `Recent sleep: ${latestBreathing} breaths per minute`
                : 'No recent breathing data',
              <LineChart values={breathingValues} color="#2563eb" labels={chartLabels} />,
              'This graph shows your nightly average BR in breaths per minute.'
            )}

            {renderMetricCard(
              'Heart rate variability (HRV)',
              latestHRV != null
                ? `Recent sleep: ${latestHRV} milliseconds`
                : 'No recent HRV data',
              <LineChart values={hrvValues} color="#0ea5e9" labels={chartLabels} />,
              'This graph shows your nightly heart rate variability in milliseconds.'
            )}

            {renderDailySummaryList()}
          </>
        ) : (
          <Card variant="outlined">
            <View className="p-6 items-center">
              <TrendingUp size={32} color="#6366f1" />
              <Text className="text-lg font-hell-round-bold text-gray-900 mt-4">
                Today overview coming soon
              </Text>
              <Text className="text-sm text-gray-600 font-hell text-center mt-2">
                Daily insights will appear here once today's sensor data is available.
              </Text>
            </View>
          </Card>
        )}
      </View>
    );
  };

  const renderActiveSection = () => {
    if (stats.totalReadings === 0) {
      return (
        <Card variant="outlined" className="mb-6">
          <View className="p-8 items-center">
            <Activity size={48} color="#9CA3AF" />
            <Text className="text-lg font-hell-round-bold text-gray-900 mt-4 ">
              No Statistics Yet
            </Text>
            <Text className="text-gray-600 text-center mt-2 font-hell">
              Start using the sensor to see your usage statistics here.
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
    <View className="flex-1 bg-white"
      style={{
        paddingTop: insets.top
      }}
    >
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <Header
          title="Statistics"
          subtitle="Your sensor usage history"
          showBackButton
        />

        {isLoading ? (
          <Card variant="outlined" className="mb-6">
            <View className="p-6 items-center">
              <ActivityIndicator size="large" color="#FF7300" />
              <Text className="text-gray-600 mt-4 font-hell">
                Loading statistics...
              </Text>
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
                    className={`flex-1 py-2 px-4 rounded-full items-center ${
                      isActive ? 'bg-white' : ''
                    }`}
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

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
};

export default StatisticsScreen;

