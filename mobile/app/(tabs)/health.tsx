import { Activity, Heart, Moon, Shield, Star, User, Zap } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { useAuth } from '../../contexts/auth-context';
import { useActivityStatistics } from '../../hooks/useActivityStatistics';
import { useImuWearableStatus } from '../../hooks/useImuWearableStatus';
import { useModeStore } from '../../stores/mode.store';

function formatMinutes(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

const HealthScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { activeMode } = useModeStore();

  const {
    data: imuRes,
    isLoading: imuLoading,
    error: imuError,
  } = useImuWearableStatus(userId);
  const imu = imuRes;

  const {
    data: statsRes,
    isLoading: statsLoading,
    error: statsError,
  } = useActivityStatistics(userId, 'today');
  const stats = statsRes?.statistics;

  const lastUpdated = useMemo(() => {
    if (!imu?.last_seen_at) return null;
    try {
      return new Date(imu.last_seen_at);
    } catch {
      return null;
    }
  }, [imu?.last_seen_at]);

  const loading = imuLoading || statsLoading;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        <Header title="Health" subtitle="MPU6050 wearable & activity" />

        {!userId && (
          <Card variant="outlined" className="mb-6">
            <View className="p-4">
              <Text className="text-gray-700 font-hell">Sign in to see your wearable and activity data.</Text>
            </View>
          </Card>
        )}

        {userId && imuError && (
          <Card variant="outlined" className="mb-6">
            <View className="p-4">
              <Text className="text-red-500 font-hell-round-bold">Wearable status unavailable</Text>
              <Text className="text-gray-600 text-sm font-hell mt-2">
                {imuError.message || String(imuError)}
              </Text>
            </View>
          </Card>
        )}

        {userId && loading && (
          <Card variant="outlined" className="mb-6">
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#FF7300" />
              <Text className="text-gray-600 font-hell mt-4">Loading…</Text>
            </View>
          </Card>
        )}

        {userId && !loading && !imuError && (
          <>
            <View className="mb-6">
              <Card variant="outlined" className="bg-red-50 border-red-100">
                <View className="flex-row items-center justify-between px-1 py-5">
                  <View className="flex-row items-center">
                    <View className="w-14 h-14 bg-red-500 rounded-xl items-center justify-center mr-3">
                      <Heart size={24} color="white" fill="white" />
                    </View>
                    <View className="gap-y-1">
                      <Text className="text-base font-hell-round-bold text-gray-900">Wearable</Text>
                      <Text className="text-gray-500 text-xs font-hell">
                        {lastUpdated ? `Last signal ${lastUpdated.toLocaleTimeString()}` : 'No timestamp'}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text
                      className={`text-lg font-hell-round-bold ${imu?.online ? 'text-success' : 'text-gray-400'}`}
                    >
                      {imu?.online ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            <View className="mb-6">
              <Card variant="outlined" className="bg-primary-accent/5 border-primary-accent/20">
                <View className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-3">
                        <Star size={24} color="white" fill="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-hell-round-bold text-gray-900">Current activity</Text>
                        <Text className="text-xs text-gray-600 font-hell">
                          {activeMode?.id === 'fall' ? 'Fall-detection view' : 'Activity & rest view'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text className="text-3xl font-hell-round-bold text-gray-900">
                    {imu?.activity_label ?? '—'}
                  </Text>
                  <Text className="text-gray-500 text-xs font-hell mt-2">
                    mmWave vitals (heart rate, respiration) are not provided by the IMU build. Use this screen for
                    posture and connectivity.
                  </Text>
                </View>
              </Card>
            </View>

            {statsError && (
              <Card variant="outlined" className="mb-6">
                <Text className="text-orange-600 text-sm font-hell p-4">
                  Today&apos;s activity summary failed to load: {statsError.message || String(statsError)}
                </Text>
              </Card>
            )}

            <View className="mb-8">
              <Text className="text-xl font-hell-round-bold text-gray-900 mb-4">Today (movement)</Text>
              <View className="flex-row gap-3 flex-wrap">
                <Card variant="outlined" className="flex-1 min-w-[100px]">
                  <View className="items-center py-2">
                    <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mb-3">
                      <User size={24} color="white" />
                    </View>
                    <Text className="text-xs font-hell font-medium text-gray-600 mb-2">Events</Text>
                    <Text className="text-base font-hell-round-bold text-gray-900">{stats?.total_events ?? 0}</Text>
                  </View>
                </Card>
                <Card variant="outlined" className="flex-1 min-w-[100px]">
                  <View className="items-center py-2">
                    <View className="w-12 h-12 bg-success rounded-xl items-center justify-center mb-3">
                      <Activity size={24} color="white" />
                    </View>
                    <Text className="text-xs font-hell font-medium text-gray-600 mb-2">Top posture</Text>
                    <Text className="text-sm font-hell-round-bold text-gray-900 text-center">
                      {stats?.by_activity && Object.keys(stats.by_activity).length
                        ? Object.entries(stats.by_activity).sort(
                            (a, b) => (b[1].total_seconds ?? 0) - (a[1].total_seconds ?? 0),
                          )[0][0]
                        : '—'}
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
                      {stats?.by_activity
                        ? formatMinutes(
                            Object.values(stats.by_activity).reduce((s, b) => s + (b.total_seconds ?? 0), 0),
                          )
                        : '—'}
                    </Text>
                  </View>
                </Card>
                <Card variant="outlined" className="flex-1 min-w-[100px]">
                  <View className="items-center py-2">
                    <View className="w-12 h-12 bg-warning rounded-xl items-center justify-center mb-3">
                      <Shield size={24} color="white" />
                    </View>
                    <Text className="text-xs font-hell font-medium text-gray-600 mb-2">Mode</Text>
                    <Text className="text-sm font-hell-round-bold text-gray-900">
                      {activeMode?.name ?? '—'}
                    </Text>
                  </View>
                </Card>
              </View>
            </View>

            {stats?.by_activity && Object.keys(stats.by_activity).length > 0 && (
              <View className="mb-8">
                <Text className="text-xl font-hell-round-bold text-gray-900 mb-4">Time by posture</Text>
                <Card variant="outlined">
                  <View className="p-4 gap-y-2">
                    {Object.entries(stats.by_activity).map(([name, bucket]) => (
                      <View key={name} className="flex-row justify-between py-2 border-b border-gray-100">
                        <Text className="text-gray-700 font-hell capitalize">{name.replace(/_/g, ' ')}</Text>
                        <Text className="font-hell-round-bold text-gray-900">
                          {formatMinutes(bucket.total_seconds ?? 0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </View>
            )}

            <View className="mb-8">
              <Text className="text-xl font-hell-round-bold text-gray-900 mb-2">About IMU data</Text>
              <Card variant="outlined">
                <View className="p-4 gap-y-2">
                  <View className="flex-row items-center">
                    <View className="mr-2">
                      <Moon size={20} color="#666" />
                    </View>
                    <Text className="text-sm text-gray-600 font-hell flex-1">
                      Sleep mode here summarizes labeled activity periods from the wearable, not radar sleep staging.
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HealthScreen;
