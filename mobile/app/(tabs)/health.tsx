import { Activity, Heart, Moon, Shield, Star, User, Zap } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { useLatestSensorReading } from '../../hooks/useSensorReadings';
import { useLatestSleepSummary } from '../../hooks/useSleepSummaries';
import { useModeStore } from '../../stores/mode.store';

const HealthScreen = () => {
  const { activeMode } = useModeStore();
  // Use the default user_id that matches the backend
  const userId = '0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61';
  const { reading, rawData, isLoading: readingsLoading, error, timestamp } = useLatestSensorReading(userId);
  
  // Fetch latest sleep summary
  const { data: latestSleepSummary, isLoading: sleepSummaryLoading } = useLatestSleepSummary(userId);

  // Extract health metrics from real data
  const healthMetrics = useMemo(() => {
    if (!rawData) {
      if (__DEV__) console.log('⚠️ No rawData available');
      return {
        heartRate: null,
        respiration: null,
        movement: null,
        presence: null,
      };
    }

    if (__DEV__) {
      console.log('📊 Raw data structure:', {
        mode: rawData.mode,
        hasComprehensive: !!rawData.comprehensive,
        hasStatistics: !!rawData.statistics,
        comprehensiveKeys: rawData.comprehensive ? Object.keys(rawData.comprehensive) : [],
        statisticsKeys: rawData.statistics ? Object.keys(rawData.statistics) : [],
      });
    }

    // Extract based on mode
    if (rawData.mode === 'sleep_detection') {
      // Use direct sensor readings first (real-time), then fall back to averaged values
      // Use nullish coalescing (??) instead of || to handle 0 values correctly
      const heartRate = rawData.heart_rate ?? rawData.comprehensive?.avg_heartbeat ?? rawData.statistics?.avg_heartbeat ?? null;
      const respiration = rawData.respiration_rate ?? rawData.comprehensive?.avg_respiration ?? rawData.statistics?.avg_respiration ?? null;
      const movement = rawData.body_movement_range ?? rawData.comprehensive?.large_body_move ?? rawData.comprehensive?.minor_body_move ?? null;
      const presence = rawData.comprehensive?.presence ?? rawData.in_bed ?? null;

      if (__DEV__) {
        console.log('💓 Extracted health metrics (sleep):', {
          heartRate,
          respiration,
          movement,
          presence,
          comprehensive: rawData.comprehensive,
          statistics: rawData.statistics,
        });
      }

      return {
        heartRate,
        respiration,
        movement,
        presence,
      };
    } else if (rawData.mode === 'fall_detection') {
      // Use direct sensor readings first (real-time), then fall back to other values
      const heartRate = rawData.heart_rate ?? null;
      const respiration = rawData.respiration_rate ?? null;
      const movement = rawData.body_movement ?? rawData.motion ?? null;
      const presence = rawData.presence ?? null;

      if (__DEV__) {
        console.log('💓 Extracted health metrics (fall):', {
          movement,
          presence,
          body_movement: rawData.body_movement,
          motion: rawData.motion,
        });
      }

      return {
        heartRate, // Now available in fall mode too
        respiration, // Now available in fall mode too
        movement,
        presence,
      };
    }

    return {
      heartRate: null,
      respiration: null,
      movement: null,
      presence: null,
    };
  }, [rawData]);

  // Format timestamp for display
  const lastUpdated = useMemo(() => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp);
    } catch {
      return null;
    }
  }, [timestamp]);

  const getReadingColor = (type: string, value: number | null) => {
    if (value === null) return 'text-gray-400';
    
    switch (type) {
      case 'respiration':
        return value >= 12 && value <= 20 ? 'text-success' : 'text-warning';
      case 'heart_rate':
        return value >= 60 && value <= 100 ? 'text-success' : 'text-warning';
      case 'movement':
        return value < 30 ? 'text-success' : value < 70 ? 'text-warning' : 'text-error';
      case 'presence':
        return value === 1 ? 'text-success' : 'text-gray-400';
      default:
        return 'text-gray-600';
    }
  };

  const formatReadingValue = (reading: any) => {
    if (reading.value === null) return '--';
    if (reading.type === 'presence') return reading.value === 1 ? 'Detected' : 'Not detected';
    return `${reading.value}${reading.unit}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <Header title="Health" subtitle="Real-time monitoring" />

        {/* Live Heart Rate - First Row */}
        <View className="mb-6">
          <Card variant="outlined" className="bg-red-50 border-red-100">
            <View className="flex-row items-center justify-between px-1 py-5">
              <View className="flex-row items-center">
                <View className="w-14 h-14 bg-red-500 rounded-xl items-center justify-center mr-3">
                  <Heart size={24} color="white" fill="white" />
                </View>
                <View className="gap-y-1">
                  <Text className="text-base font-hell-round-bold text-gray-900 ">
                    Live Heart Rate
                  </Text>
                  <Text className="text-gray-500 text-xs font-hell">
                    {lastUpdated
                      ? `Updated ${lastUpdated.toLocaleTimeString()}`
                      : "No data available"}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text
                  className={`text-2xl font-hell-round-bold ${getReadingColor(
                    "heart_rate",
                    healthMetrics.heartRate
                  )}`}
                >
                  {healthMetrics.heartRate !== null
                    ? `${healthMetrics.heartRate} BPM`
                    : "--"}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Sleep Score Summary */}
        {sleepSummaryLoading ? (
          <View className="mb-6">
            <Card variant="outlined">
              <View className="p-4 items-center">
                <ActivityIndicator size="small" color="#9E9E9E" />
                <Text className="text-sm text-gray-500 font-hell mt-2">
                  Loading sleep score...
                </Text>
              </View>
            </Card>
          </View>
        ) : latestSleepSummary ? (
          <View className="mb-6">
            <Card variant="outlined" className="bg-primary-accent/5 border-primary-accent/20">
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
                        {latestSleepSummary.date
                          ? new Date(latestSleepSummary.date).toLocaleDateString('en-US', {
                              weekday: 'short',
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
                        {Math.round(latestSleepSummary.overall_quality)}
                      </Text>
                      <View
                        className={`px-3 py-1 rounded-lg ${
                          latestSleepSummary.sleep_score_grade === 'A'
                            ? 'bg-green-100'
                            : latestSleepSummary.sleep_score_grade === 'B'
                            ? 'bg-blue-100'
                            : latestSleepSummary.sleep_score_grade === 'C'
                            ? 'bg-yellow-100'
                            : latestSleepSummary.sleep_score_grade === 'D'
                            ? 'bg-orange-100'
                            : 'bg-red-100'
                        }`}
                      >
                        <Text
                          className={`text-sm font-hell-round-bold ${
                            latestSleepSummary.sleep_score_grade === 'A'
                              ? 'text-green-700'
                              : latestSleepSummary.sleep_score_grade === 'B'
                              ? 'text-blue-700'
                              : latestSleepSummary.sleep_score_grade === 'C'
                              ? 'text-yellow-700'
                              : latestSleepSummary.sleep_score_grade === 'D'
                              ? 'text-orange-700'
                              : 'text-red-700'
                          }`}
                        >
                          {latestSleepSummary.sleep_score_grade}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View className="flex-row gap-4 pt-3 border-t border-gray-100">
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 font-hell mb-1">Sleep Time</Text>
                    <Text className="text-sm font-hell-round-bold text-gray-900">
                      {Math.round(latestSleepSummary.total_sleep_time_minutes / 60)}h{' '}
                      {latestSleepSummary.total_sleep_time_minutes % 60}m
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 font-hell mb-1">Efficiency</Text>
                    <Text className="text-sm font-hell-round-bold text-gray-900">
                      {Math.round(latestSleepSummary.sleep_efficiency_percent)}%
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 font-hell mb-1">Deep Sleep</Text>
                    <Text className="text-sm font-hell-round-bold text-gray-900">
                      {Math.round(latestSleepSummary.sleep_stages.deep_sleep_minutes)}m
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        {/* Health Monitor - Three Columns */}
        <View className="mb-8">
          <Text className="text-xl font-hell-round-bold text-gray-900 mb-4 ">
            Health Monitor
          </Text>

          {readingsLoading ? (
            <View className="flex-row gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} variant="outlined" className="flex-1">
                  <View className="p-4 items-center">
                    <ActivityIndicator
                      size="small"
                      color="#9E9E9E"
                      className="mb-3"
                    />
                    <View className="h-3 bg-gray-200 rounded mb-2 w-16" />
                    <View className="h-5 bg-gray-200 rounded w-12" />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <View className="flex-row gap-3 flex-wrap">
              {/* Presence Column */}
              <Card variant="outlined" className="flex-1 min-w-[100px]">
                <View className="items-center py-2">
                  <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mb-3">
                    <User size={24} color="white" />
                  </View>
                  <Text className="text-xs font-hell font-medium text-gray-600 mb-2">
                    Presence
                  </Text>
                  <Text
                    className={`text-base font-hell-round-bold ${getReadingColor(
                      "presence",
                      healthMetrics.presence
                    )}`}
                  >
                    {healthMetrics.presence === 1
                      ? "Yes"
                      : healthMetrics.presence === 0
                      ? "No"
                      : "--"}
                  </Text>
                </View>
              </Card>

              {/* Respiration Column */}
              <Card variant="outlined" className="flex-1 min-w-[100px]">
                <View className="items-center py-2">
                  <View className="w-12 h-12 bg-success rounded-xl items-center justify-center mb-3">
                    <Activity size={24} color="white" />
                  </View>
                  <Text className="text-xs font-hell font-medium text-gray-600 mb-2">
                    Respiration
                  </Text>
                  <Text
                    className={`text-lg font-hell-round-bold ${getReadingColor(
                      "respiration",
                      healthMetrics.respiration
                    )}`}
                  >
                    {healthMetrics.respiration !== null
                      ? `${healthMetrics.respiration}/min`
                      : "--"}
                  </Text>
                </View>
              </Card>

              {/* Movement Column */}
              <Card variant="outlined" className="flex-1 min-w-[100px]">
                <View className="items-center py-2">
                  <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mb-3">
                    <Zap size={24} color="white" />
                  </View>
                  <Text className="text-xs font-hell font-medium text-gray-600 mb-2">
                    Movement
                  </Text>
                  <Text
                    className={`text-lg font-hell-round-bold ${getReadingColor(
                      "movement",
                      healthMetrics.movement
                    )}`}
                  >
                    {healthMetrics.movement !== null
                      ? `${healthMetrics.movement}%`
                      : "--"}
                  </Text>
                </View>
              </Card>

              {/* Movement Status Column */}
              <Card variant="outlined" className="flex-1 min-w-[100px]">
                <View className="items-center py-2">
                  <View className="w-12 h-12 bg-warning rounded-xl items-center justify-center mb-3">
                    <Activity size={24} color="white" />
                  </View>
                  <Text className="text-xs font-hell font-medium text-gray-600 mb-2">
                    Status
                  </Text>
                  <Text
                    className={`text-sm font-hell-round-bold ${
                      rawData?.movement_status === "Active"
                        ? "text-primary-accent"
                        : rawData?.movement_status === "Still"
                        ? "text-success"
                        : rawData?.movement_status === "None"
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}
                  >
                    {rawData?.movement_status || "--"}
                  </Text>
                </View>
              </Card>
            </View>
          )}
        </View>

        {/* Comprehensive Sensor Data */}
        {rawData && (
          <View className="mb-8">
            <Text className="text-xl font-hell-round-bold text-gray-900 mb-4 ">
              Sensor Data
            </Text>

            {/* Sleep Mode Comprehensive Data */}
            {activeMode?.id === "sleep" &&
              rawData.mode === "sleep_detection" &&
              rawData.comprehensive && (
                <View className="gap-y-4">
                  {/* Sleep Composite Status */}
                  <Card variant="outlined">
                    <View className="p-4">
                      <Text className="text-lg font-hell-round-bold text-gray-900 mb-3 ">
                        Comprehensive Sleep Status
                      </Text>
                      <View className="gap-3">
                        <View className="flex-row items-center">
                          <Moon
                            size={20}
                            color="#666"
                            fill="#666"
                            className="mr-2"
                          />
                          <Text className="text-sm text-gray-600 font-hell">
                            Sleep State:
                          </Text>
                          <Text className="text-sm font-hell-round-bold text-gray-900 ml-2 ">
                            {rawData.comprehensive.sleep_state === 0
                              ? "Deep"
                              : rawData.comprehensive.sleep_state === 1
                              ? "Light"
                              : rawData.comprehensive.sleep_state === 2
                              ? "Awake"
                              : "None"}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Activity size={20} color="#666" className="mr-2" />
                          <Text className="text-sm text-gray-600 font-hell">
                            Turns:
                          </Text>
                          <Text className="text-sm font-hell-round-bold text-gray-900 ml-2 ">
                            {rawData.comprehensive?.turns ||
                              rawData.statistics?.turn_over_count ||
                              0}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Heart size={20} color="#666" className="mr-2" />
                          <Text className="text-sm text-gray-600 font-hell">
                            Avg HR:
                          </Text>
                          <Text className="text-sm font-hell-round-bold text-gray-900 ml-2 ">
                            {rawData.comprehensive.avg_heartbeat || 0} bpm
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Activity size={20} color="#666" className="mr-2" />
                          <Text className="text-sm text-gray-600 font-hell">
                            Avg Resp:
                          </Text>
                          <Text className="text-sm font-hell-round-bold text-gray-900 ml-2 ">
                            {rawData.comprehensive.avg_respiration || 0}/min
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>

                  {/* Sleep Statistics */}
                  {rawData.statistics && (
                    <Card variant="outlined">
                      <View className="p-4">
                        <Text className="text-lg font-hell-round-bold text-gray-900 mb-3 ">
                          Sleep Statistics
                        </Text>
                        <View className="gap-3">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Quality Score:
                            </Text>
                            <Text className="text-sm font-hell-round-bold text-primary-accent ">
                              {rawData.statistics.sleep_quality_score ||
                                rawData.sleep_quality_score ||
                                0}
                              %
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Deep Sleep:
                            </Text>
                            <Text className="text-sm font-hell-round-bold text-gray-900 ">
                              {rawData.statistics.deep_sleep_pct || 0}%
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Light Sleep:
                            </Text>
                            <Text className="text-sm font-hell-round-bold text-gray-900 ">
                              {rawData.statistics.light_sleep_pct || 0}%
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Awake:
                            </Text>
                            <Text className="text-sm font-hell-round-bold text-gray-900 ">
                              {rawData.statistics.awake_time_pct || 0}%
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Out of Bed:
                            </Text>
                            <Text className="text-sm font-hell-round-bold text-gray-900 ">
                              {rawData.statistics.out_of_bed_duration || 0}min
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Exit Count:
                            </Text>
                            <Text className="text-sm font-hell-round-bold text-gray-900 ">
                              {rawData.statistics.exit_count || 0}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Card>
                  )}

                  {/* Sleep Disturbances */}
                  {rawData.comprehensive && (
                    <Card variant="outlined">
                      <View className="p-4">
                        <Text className="text-lg font-hell-round-bold text-gray-900 mb-3 ">
                          Sleep Analysis
                        </Text>
                        <View className="gap-y-2">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Apnea Events:
                            </Text>
                            <Text className="text-sm font-hell-round-bold text-gray-900 ">
                              {rawData.comprehensive.apnea_events || 0}
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Large Movements:
                            </Text>
                            <Text className="text-sm font-hell-round-bold text-gray-900 ">
                              {rawData.comprehensive.large_body_move || 0}%
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Minor Movements:
                            </Text>
                            <Text className="text-sm font-hell-round-bold text-gray-900 ">
                              {rawData.comprehensive.minor_body_move || 0}%
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 font-hell">
                              Abnormal Struggle:
                            </Text>
                            <Text
                              className={`text-sm font-hell-round-bold ${
                                rawData.abnormal_struggle === 2
                                  ? "text-red-500"
                                  : "text-green-500"
                              }`}
                            >
                              {rawData.abnormal_struggle === 0
                                ? "None"
                                : rawData.abnormal_struggle === 1
                                ? "Normal"
                                : "Abnormal"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Card>
                  )}
                </View>
              )}

            {/* Fall Mode Comprehensive Data */}
            {activeMode?.id === "fall" && rawData.mode === "fall_detection" && (
              <View className="gap-y-4">
                {/* Fall Detection Status */}
                <Card variant="outlined">
                  <View className="p-4">
                    <Text className="text-lg font-hell-round-bold text-gray-900 mb-3 ">
                      Fall Detection Status
                    </Text>
                    <View className="gap-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Shield size={20} color="#666" className="mr-2" />
                          <Text className="text-sm text-gray-600 font-hell">
                            Fall Status:
                          </Text>
                        </View>
                        <Text
                          className={`text-sm font-hell-round-bold ${
                            rawData.fall_status === 1
                              ? "text-red-500"
                              : "text-green-500"
                          }`}
                        >
                          {rawData.fall_status === 1 ? "FALLEN" : "Safe"}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <User size={20} color="#666" className="mr-2" />
                          <Text className="text-sm text-gray-600 font-hell">
                            Presence:
                          </Text>
                        </View>
                        <Text className="text-sm font-hell-round-bold text-gray-900 ">
                          {rawData.presence === 1 ? "Present" : "Absent"}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Zap size={20} color="#666" className="mr-2" />
                          <Text className="text-sm text-gray-600 font-hell">
                            Movement:
                          </Text>
                        </View>
                        <Text className="text-sm font-hell-round-bold text-gray-900 ">
                          {rawData.motion === 0
                            ? "None"
                            : rawData.motion === 1
                            ? "Still"
                            : "Active"}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Activity size={20} color="#666" className="mr-2" />
                          <Text className="text-sm text-gray-600 font-hell">
                            Body Movement:
                          </Text>
                        </View>
                        <Text className="text-sm font-hell-round-bold text-gray-900 ">
                          {rawData.body_movement || 0}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </View>
            )}
          </View>
        )}

        {/* Debug Info (Development Only) */}
        {__DEV__ && rawData && (
          <Card variant="outlined" className="mb-6 bg-gray-50">
            <View className="p-4">
              <Text className="text-xs font-hell-round-bold text-gray-700 mb-2 ">
                Debug Info:
              </Text>
              <Text className="text-xs text-gray-600 font-hell">
                Mode: {rawData.mode || "N/A"}
              </Text>
              <Text className="text-xs text-gray-600 font-hell">
                Has comprehensive: {rawData.comprehensive ? "Yes" : "No"}
              </Text>
              <Text className="text-xs text-gray-600 font-hell">
                Has statistics: {rawData.statistics ? "Yes" : "No"}
              </Text>
              <Text className="text-xs text-gray-600 font-hell">
                HR: {healthMetrics.heartRate ?? "null"} | Resp:{" "}
                {healthMetrics.respiration ?? "null"}
              </Text>
              <Text className="text-xs text-gray-600 font-hell">
                Movement: {healthMetrics.movement ?? "null"} | Presence:{" "}
                {healthMetrics.presence ?? "null"}
              </Text>
              <Text className="text-xs text-gray-600 font-hell">
                Movement Status: {rawData?.movement_status || "N/A"}
              </Text>
            </View>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card variant="outlined" className="mb-6">
            <View className="p-4">
              <Text className="text-red-500 font-hell-round-bold">
                Error loading data
              </Text>
              <Text className="text-gray-600 text-sm mt-2 font-hell">
                {error.message || String(error)}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HealthScreen;
