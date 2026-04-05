import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AlertCircle, Bell, ChevronLeft, Shield } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../contexts/auth-context';
import type { UserPreferencesUpdate } from '../../database/types';
import { getAlerts, markAlertAsRead, markAllAlertsAsRead } from '../../services/monitoring.service';
import { getPreferences, updatePreferences } from '../../services/user.service';

const HERO_MIN_HEIGHT = 200;

const heroTextShadow = {
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;

const sheetStyles = StyleSheet.create({
  groupCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
});

const NotificationsScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getAlerts(userId, 50);
    },
    enabled: !!userId,
  });

  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ['preferences', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await getPreferences(userId);
    },
    enabled: !!userId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markAlertAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAlertsAsRead(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] });
      Alert.alert('Success', 'All alerts marked as read');
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: (updates: UserPreferencesUpdate) => updatePreferences(userId!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', userId] });
    },
  });

  const unreadCount = alerts.filter((alert) => !alert.is_read).length;

  const getSeverityColor = (severity: string) => {
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
        return 'bg-gray-500';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'fall':
      case 'fall_risk':
        return <Shield size={20} color="white" fill="white" />;
      default:
        return <AlertCircle size={20} color="white" />;
    }
  };

  const handleTogglePreference = (key: string, value: boolean) => {
    if (!userId) return;
    updatePrefsMutation.mutate({ [key]: value });
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
        <View
          className="flex-1 justify-end px-6 pb-6"
          style={{ paddingTop: insets.top + 8 }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            activeOpacity={0.88}
            className="h-12 w-12 items-center justify-center rounded-xl bg-white"
          >
            <ChevronLeft size={24} color="#666" strokeWidth={2.5} />
          </TouchableOpacity>

          <Text
            className="mt-5 text-3xl font-hell-round-bold text-white"
            style={heroTextShadow}
          >
            Notifications
          </Text>
          <Text
            className="mt-2 max-w-[92%] text-base font-hell leading-6 text-white/95"
            style={heroTextShadow}
          >
            Fall alerts, preferences, and recent activity from NORN.
          </Text>
        </View>
      </ImageBackground>

      <View className="flex-1 bg-gray-900">
        <ScrollView
          className="mt-6 flex-1 rounded-t-[2.5rem] bg-white px-6 pt-6"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 28,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!userId ? (
            <Card variant="outlined" className="border-gray-100 bg-gray-50/80">
              <Text className="text-center font-hell text-base leading-6 text-gray-600">
                Sign in to manage notification preferences and view alerts.
              </Text>
            </Card>
          ) : (
            <>
              <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-gray-400">
                Preferences
              </Text>
              <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">
                Alert types
              </Text>
              <Text className="mt-1 text-sm font-hell leading-5 text-gray-500">
                Choose what we can notify you about.
              </Text>

              <View
                className="mt-4 overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
                style={sheetStyles.groupCard}
              >
                <View className="flex-row items-center justify-between px-4 py-4">
                  <View className="min-w-0 flex-1 pr-3">
                    <Text className="text-base font-hell-round-bold text-gray-900">
                      Fall detection
                    </Text>
                    <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">
                      Notifications when a fall or high-risk event is reported.
                    </Text>
                  </View>
                  {prefsLoading ? (
                    <ActivityIndicator size="small" color="#FF7300" />
                  ) : (
                    <Switch
                      value={preferences?.fall_alerts_enabled ?? true}
                      onValueChange={(value) =>
                        handleTogglePreference('fall_alerts_enabled', value)
                      }
                      trackColor={{ false: '#E5E7EB', true: '#FF7300' }}
                      thumbColor="#FFFFFF"
                    />
                  )}
                </View>
              </View>

              <View className="mb-2 mt-10 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-gray-400">
                    Inbox
                  </Text>
                  <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">
                    Recent alerts
                  </Text>
                </View>
                {unreadCount > 0 ? (
                  <TouchableOpacity
                    onPress={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    activeOpacity={0.88}
                    className="rounded-full bg-gray-900 px-3 py-2"
                  >
                    <Text className="text-xs font-hell-round-bold text-white">
                      Mark all read ({unreadCount})
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {alertsLoading ? (
                <Card variant="outlined" className="border-gray-100 bg-gray-50/80">
                  <View className="items-center py-10">
                    <ActivityIndicator size="large" color="#FF7300" />
                    <Text className="mt-4 font-hell text-sm text-gray-600">
                      Loading alerts…
                    </Text>
                  </View>
                </Card>
              ) : alerts.length === 0 ? (
                <Card variant="outlined" className="border-gray-100 bg-gray-50/80">
                  <View className="items-center px-2 py-10">
                    <View className="h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                      <Bell size={28} color="#9CA3AF" strokeWidth={2} />
                    </View>
                    <Text className="mt-4 text-center text-lg font-hell-round-bold text-gray-900">
                      No alerts
                    </Text>
                    <Text className="mt-2 text-center font-hell text-sm leading-5 text-gray-600">
                      You are all caught up. We will show fall and safety alerts here.
                    </Text>
                  </View>
                </Card>
              ) : (
                <View className="gap-3">
                  {alerts.map((alert) => (
                    <Card
                      key={alert.id}
                      variant="outlined"
                      className={`border-gray-100 bg-white ${alert.is_read ? 'opacity-80' : ''}`}
                    >
                      <View className="flex-row items-start">
                        <View
                          className={`mr-3 h-11 w-11 items-center justify-center rounded-2xl ${getSeverityColor(alert.severity)}`}
                        >
                          {getAlertTypeIcon(alert.alert_type)}
                        </View>
                        <View className="min-w-0 flex-1">
                          <View className="flex-row items-start justify-between gap-2">
                            <Text className="flex-1 text-base font-hell-round-bold text-gray-900">
                              {alert.title}
                            </Text>
                            {!alert.is_read ? (
                              <View className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF7300]" />
                            ) : null}
                          </View>
                          <Text className="mt-1 font-hell text-sm leading-5 text-gray-600">
                            {alert.message}
                          </Text>
                          <View className="mt-3 flex-row flex-wrap items-center justify-between gap-2">
                            <Text className="font-hell text-xs text-gray-500">
                              {alert.created_at
                                ? new Date(alert.created_at).toLocaleString()
                                : ''}
                            </Text>
                            {!alert.is_read ? (
                              <TouchableOpacity
                                onPress={() => markAsReadMutation.mutate(alert.id)}
                                disabled={markAsReadMutation.isPending}
                                activeOpacity={0.88}
                                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5"
                              >
                                <Text className="text-xs font-hell-round-bold text-gray-800">
                                  Mark read
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default NotificationsScreen;
