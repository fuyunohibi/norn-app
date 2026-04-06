import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Bell, Shield } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StackScreenScaffold } from '../../components/layout';
import { InboxHeader } from '../../components/notifications/inbox-header';
import { Card } from '../../components/ui/card';
import { SectionHeading } from '../../components/ui/section-heading';
import { useAuth } from '../../contexts/auth-context';
import type { UserPreferencesUpdate } from '../../database/types';
import { getAlerts, markAlertAsRead, markAllAlertsAsRead } from '../../services/monitoring.service';
import { getPreferences, updatePreferences } from '../../services/user.service';
import { NornColors, shadowStyles, switchTrackColors } from '@/theme';

const NotificationsScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
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

  const unreadCount = alerts.filter((a) => !a.is_read).length;

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
    <StackScreenScaffold
      hero={{
        title: 'Notifications',
        subtitle: 'Fall alerts, preferences, and recent activity from NORN.',
      }}
    >
          {!userId ? (
            <Card variant="outlined" className="border-gray-100 bg-gray-50/80">
              <Text className="text-center font-hell text-base leading-6 text-gray-600">
                Sign in to manage notification preferences and view alerts.
              </Text>
            </Card>
          ) : (
            <>
              <SectionHeading
                eyebrow="Preferences"
                title="Alert types"
                description="Choose what we can notify you about."
              />

              <View
                className="mt-4 overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
                style={shadowStyles.card}
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
                    <ActivityIndicator size="small" color={NornColors.brandOrange} />
                  ) : (
                    <Switch
                      value={preferences?.fall_alerts_enabled ?? true}
                      onValueChange={(value) =>
                        handleTogglePreference('fall_alerts_enabled', value)
                      }
                      trackColor={switchTrackColors}
                      thumbColor="#FFFFFF"
                    />
                  )}
                </View>
              </View>

              <InboxHeader
                unreadCount={unreadCount}
                markAllPending={markAllAsReadMutation.isPending}
                onMarkAllRead={() => markAllAsReadMutation.mutate()}
              />

              {alertsLoading ? (
                <Card variant="outlined" className="border-gray-100 bg-gray-50/80">
                  <View className="items-center py-10">
                    <ActivityIndicator size="large" color={NornColors.brandOrange} />
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
                      You are up to date.
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
                              <View
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: NornColors.brandOrange }}
                            />
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
    </StackScreenScaffold>
  );
};

export default NotificationsScreen;
