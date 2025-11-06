import { AlertCircle, Bell, CheckCircle, Shield, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { useAuth } from '../../contexts/auth-context';
import { getAlerts, markAlertAsRead, markAllAlertsAsRead } from '../../services/monitoring.service';
import { getPreferences, updatePreferences } from '../../services/user.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const NotificationsScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getAlerts(userId, 50);
    },
    enabled: !!userId,
  });

  // Fetch preferences
  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ['preferences', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await getPreferences(userId);
    },
    enabled: !!userId,
  });

  // Mark alert as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAlertAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAlertsAsRead(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] });
      Alert.alert('Success', 'All alerts marked as read');
    },
  });

  // Update preferences mutation
  const updatePrefsMutation = useMutation({
    mutationFn: (updates: any) => updatePreferences(userId!, updates),
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
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'fall':
        return <Shield size={20} color="white" />;
      default:
        return <AlertCircle size={20} color="white" />;
    }
  };

  const handleTogglePreference = (key: string, value: boolean) => {
    if (!userId) return;
    updatePrefsMutation.mutate({ [key]: value });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <Header
          title="Notifications"
          subtitle="Manage alerts and preferences"
          showBackButton
        />

        {/* Preferences Section */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">Alert Preferences</Text>
          <Card variant="outlined">
            <View className="p-4">
              {prefsLoading ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <>
                  <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">
                        Fall Detection Alerts
                      </Text>
                      <Text className="text-sm text-gray-600 mt-1">
                        Receive notifications for fall events
                      </Text>
                    </View>
                    <Switch
                      value={preferences?.fall_alerts_enabled ?? true}
                      onValueChange={(value) => handleTogglePreference('fall_alerts_enabled', value)}
                      trackColor={{ false: '#E5E7EB', true: '#6366f1' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View className="flex-row items-center justify-between py-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">
                        Sleep Quality Alerts
                      </Text>
                      <Text className="text-sm text-gray-600 mt-1">
                        Get notified about sleep quality issues
                      </Text>
                    </View>
                    <Switch
                      value={preferences?.sleep_alerts_enabled ?? true}
                      onValueChange={(value) => handleTogglePreference('sleep_alerts_enabled', value)}
                      trackColor={{ false: '#E5E7EB', true: '#6366f1' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </>
              )}
            </View>
          </Card>
        </View>

        {/* Alerts Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">Recent Alerts</Text>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="px-3 py-1 bg-primary-accent rounded-lg"
              >
                <Text className="text-xs font-semibold text-white">
                  Mark all read ({unreadCount})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {alertsLoading ? (
            <Card variant="outlined">
              <View className="p-6 items-center">
                <ActivityIndicator size="large" color="#6366f1" />
                <Text className="text-gray-600 mt-4">Loading alerts...</Text>
              </View>
            </Card>
          ) : alerts.length === 0 ? (
            <Card variant="outlined">
              <View className="p-8 items-center">
                <Bell size={48} color="#9CA3AF" />
                <Text className="text-lg font-semibold text-gray-900 mt-4">
                  No Alerts
                </Text>
                <Text className="text-gray-600 text-center mt-2">
                  You're all caught up! No alerts to display.
                </Text>
              </View>
            </Card>
          ) : (
            <View className="gap-3">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  variant="outlined"
                  className={alert.is_read ? 'opacity-75' : ''}
                >
                  <View className="p-4">
                    <View className="flex-row items-start">
                      <View
                        className={`w-10 h-10 ${getSeverityColor(alert.severity)} rounded-lg items-center justify-center mr-3`}
                      >
                        {getAlertTypeIcon(alert.alert_type)}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-base font-semibold text-gray-900">
                            {alert.title}
                          </Text>
                          {!alert.is_read && (
                            <View className="w-2 h-2 bg-primary-accent rounded-full" />
                          )}
                        </View>
                        <Text className="text-sm text-gray-600 mb-2">
                          {alert.message}
                        </Text>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs text-gray-500">
                            {new Date(alert.created_at).toLocaleString()}
                          </Text>
                          {!alert.is_read && (
                            <TouchableOpacity
                              onPress={() => markAsReadMutation.mutate(alert.id)}
                              disabled={markAsReadMutation.isPending}
                              className="px-2 py-1 bg-gray-100 rounded"
                            >
                              <Text className="text-xs font-medium text-gray-700">
                                Mark read
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen;

