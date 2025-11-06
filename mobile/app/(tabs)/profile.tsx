import { router } from 'expo-router';
import { Activity, Bell, ChevronRight, Info, Moon, Shield } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { useAuth } from '../../contexts/auth-context';
import { useUserStatistics } from '../../hooks/useUserStatistics';

const ProfileScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { data, isLoading, error } = useUserStatistics(userId);

  const profile = data?.profile;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <Header
          title="Profile"
          subtitle="Manage your account and preferences"
        />

        {/* User Info Card */}
        <Card variant="outlined" className="mb-6">
          <View className="items-center">
            <View className="w-20 h-20 bg-primary-accent rounded-full items-center justify-center mb-4">
              {profile?.full_name ? (
                <Text className="text-2xl font-bold text-white">
                  {profile.full_name.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Text className="text-2xl font-bold text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-1">
              {profile?.full_name || user?.user_metadata?.full_name || 'User'}
            </Text>
            <Text className="text-gray-600">
              {profile?.username ? `@${profile.username}` : user?.email || 'No email'}
            </Text>
            {profile?.created_at && (
              <Text className="text-gray-500 text-xs mt-2">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </Card>

        {/* Profile Options */}
        <View className="gap-y-3 mb-8">
          <Card variant="outlined">
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => router.push('/statistics')}
            >
              <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                <Activity size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  View Statistics
                </Text>
                <Text className="text-gray-600 text-sm">
                  See your sensor usage history
                </Text>
              </View>
              <ChevronRight size={24} color="#9E9E9E" />
            </TouchableOpacity>
          </Card>

          <Card variant="outlined">
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => router.push('/notifications')}
            >
              <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-4">
                <Bell size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  Notifications
                </Text>
                <Text className="text-gray-600 text-sm">
                  Manage alert preferences
                </Text>
              </View>
              <ChevronRight size={24} color="#9E9E9E" />
            </TouchableOpacity>
          </Card>

          <Card variant="outlined">
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => router.push('/about')}
            >
              <View className="w-12 h-12 bg-success rounded-xl items-center justify-center mr-4">
                <Info size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  About NORN
                </Text>
                <Text className="text-gray-600 text-sm">
                  App version and information
                </Text>
              </View>
              <ChevronRight size={24} color="#9E9E9E" />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Action Buttons */}
        <View className="gap-y-3 mb-8">
          <Button
            title="Settings"
            onPress={() => router.push("/settings")}
            variant="outline"
            size="lg"
            className="w-h-full"
          />
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
