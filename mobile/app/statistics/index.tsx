import { useQuery } from '@tanstack/react-query';
import { Activity, Calendar, Moon, Shield, TrendingUp } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { useAuth } from '../../contexts/auth-context';
import { backendAPIService } from '../../services/backend-api.service';

const StatisticsScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // Fetch both sleep and fall readings with higher limit for accurate statistics
  const { data: sleepData, isLoading: sleepLoading } = useQuery({
    queryKey: ['sensor-readings', 'sleep_detection', userId, 'statistics'],
    queryFn: async () => {
      if (!userId) return { readings: [] };
      // Fetch more readings for accurate statistics (1000 should cover most use cases)
      return await backendAPIService.getLatestReadings('sleep_detection', userId, 1000);
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const { data: fallData, isLoading: fallLoading } = useQuery({
    queryKey: ['sensor-readings', 'fall_detection', userId, 'statistics'],
    queryFn: async () => {
      if (!userId) return { readings: [] };
      // Fetch more readings for accurate statistics
      return await backendAPIService.getLatestReadings('fall_detection', userId, 1000);
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const isLoading = sleepLoading || fallLoading;

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const sleepReadings = sleepData?.readings || [];
    const fallReadings = fallData?.readings || [];
    const allReadings = [...sleepReadings, ...fallReadings];

    // Group by date
    const readingsByDate: { [key: string]: number } = {};
    allReadings.forEach((reading) => {
      const date = new Date(reading.timestamp).toLocaleDateString();
      readingsByDate[date] = (readingsByDate[date] || 0) + 1;
    });

    // Get latest readings for each type
    const latestSleep = sleepReadings[0];
    const latestFall = fallReadings[0];

    // Calculate total hours based on actual time span
    let totalHours = 0;
    if (allReadings.length > 0) {
      // Sort by timestamp to get oldest and newest
      const sortedReadings = [...allReadings].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const oldestReading = sortedReadings[0];
      const newestReading = sortedReadings[sortedReadings.length - 1];
      
      const oldestTime = new Date(oldestReading.timestamp).getTime();
      const newestTime = new Date(newestReading.timestamp).getTime();
      const timeDiffMs = newestTime - oldestTime;
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60); // Convert ms to hours
      
      // Round to 1 decimal place
      totalHours = Math.round(timeDiffHours * 10) / 10;
    }

    return {
      totalReadings: allReadings.length,
      sleepReadings: sleepReadings.length,
      fallReadings: fallReadings.length,
      readingsByDate,
      totalHours,
      latestSleep,
      latestFall,
      dates: Object.keys(readingsByDate).sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      ),
    };
  }, [sleepData, fallData]);

  return (
    <SafeAreaView className="flex-1 bg-white">
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
              <ActivityIndicator size="large" color="#6366f1" />
              <Text className="text-gray-600 mt-4">Loading statistics...</Text>
            </View>
          </Card>
        ) : (
          <>
            {/* Overview Cards */}
            <View className="mb-6">
              <Text className="text-xl font-bold text-gray-900 mb-4">Overview</Text>
              <View className="flex-row gap-3 flex-wrap">
                {/* Total Readings */}
                <Card variant="outlined" className="flex-1 min-w-[140px]">
                  <View className="p-4">
                    <View className="flex-row items-center mb-2">
                      <View className="w-10 h-10 bg-primary-accent rounded-lg items-center justify-center mr-2">
                        <Activity size={20} color="white" />
                      </View>
                      <Text className="text-2xl font-bold text-gray-900">
                        {stats.totalReadings}
                      </Text>
                    </View>
                    <Text className="text-xs font-medium text-gray-600">
                      Total Readings
                    </Text>
                  </View>
                </Card>

                {/* Total Hours */}
                <Card variant="outlined" className="flex-1 min-w-[140px]">
                  <View className="p-4">
                    <View className="flex-row items-center mb-2">
                      <View className="w-10 h-10 bg-primary-button rounded-lg items-center justify-center mr-2">
                        <Calendar size={20} color="white" />
                      </View>
                      <Text className="text-2xl font-bold text-gray-900">
                        {stats.totalHours}
                      </Text>
                    </View>
                    <Text className="text-xs font-medium text-gray-600">
                      Hours Monitored
                    </Text>
                  </View>
                </Card>
              </View>
            </View>

            {/* Mode Breakdown */}
            <View className="mb-6">
              <Text className="text-xl font-bold text-gray-900 mb-4">Mode Breakdown</Text>
              <View className="flex-row gap-3">
                {/* Sleep Mode */}
                <Card variant="outlined" className="flex-1">
                  <View className="p-4">
                    <View className="flex-row items-center mb-3">
                      <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-3">
                        <Moon size={24} color="white" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900">
                          {stats.sleepReadings}
                        </Text>
                        <Text className="text-xs text-gray-600">Sleep Sessions</Text>
                      </View>
                    </View>
                    {stats.latestSleep && (
                      <Text className="text-xs text-gray-500">
                        Last: {new Date(stats.latestSleep.timestamp).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </Card>

                {/* Fall Mode */}
                <Card variant="outlined" className="flex-1">
                  <View className="p-4">
                    <View className="flex-row items-center mb-3">
                      <View className="w-12 h-12 bg-warning rounded-xl items-center justify-center mr-3">
                        <Shield size={24} color="white" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900">
                          {stats.fallReadings}
                        </Text>
                        <Text className="text-xs text-gray-600">Fall Sessions</Text>
                      </View>
                    </View>
                    {stats.latestFall && (
                      <Text className="text-xs text-gray-500">
                        Last: {new Date(stats.latestFall.timestamp).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </Card>
              </View>
            </View>

            {/* Daily Activity */}
            {stats.dates.length > 0 && (
              <View className="mb-6">
                <Text className="text-xl font-bold text-gray-900 mb-4">Daily Activity</Text>
                <Card variant="outlined">
                  <View className="p-4">
                    {stats.dates.slice(0, 7).map((date, index) => (
                      <View
                        key={date}
                        className={`flex-row items-center justify-between py-3 ${
                          index < stats.dates.length - 1 ? 'border-b border-gray-200' : ''
                        }`}
                      >
                        <View className="flex-row items-center">
                          <Calendar size={16} color="#6B7280" />
                          <Text className="text-sm font-medium text-gray-900 ml-2">
                            {date}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <TrendingUp size={16} color="#6366f1" />
                          <Text className="text-sm font-bold text-gray-900 ml-2">
                            {stats.readingsByDate[date]} readings
                          </Text>
                        </View>
                      </View>
                    ))}
                    {stats.dates.length === 0 && (
                      <Text className="text-gray-500 text-center py-4">
                        No activity data available
                      </Text>
                    )}
                  </View>
                </Card>
              </View>
            )}

            {/* Empty State */}
            {stats.totalReadings === 0 && (
              <Card variant="outlined" className="mb-6">
                <View className="p-8 items-center">
                  <Activity size={48} color="#9CA3AF" />
                  <Text className="text-lg font-semibold text-gray-900 mt-4">
                    No Statistics Yet
                  </Text>
                  <Text className="text-gray-600 text-center mt-2">
                    Start using the sensor to see your usage statistics here.
                  </Text>
                </View>
              </Card>
            )}
          </>
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default StatisticsScreen;

