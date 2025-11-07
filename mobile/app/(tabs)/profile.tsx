import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, Bell, ChevronRight, Info } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { getCurrentUser } from '../../actions/user.actions';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { formatMemberSince } from '../../utils/date.utils';

const ProfileScreen = () => {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  if (error) {
    console.error('Profile query error:', error);
  }

  console.log("profile", profile);
  console.log("isLoading", isLoading);
  console.log("error", error);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView className="flex-1 px-6">
          <Header
            title="Profile"
            subtitle="Manage your account and preferences"
          />
          <Card variant="outlined" className="mb-6">
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#FF7300" />
              <Text className="text-gray-600 font-hell mt-4">Loading profile...</Text>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
                <Text className="text-2xl font-hell-round-bold text-white ">
                  {profile.full_name.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Text className="text-2xl font-hell-round-bold text-white">
                  U
                </Text>
              )}
            </View>
            <Text className="text-xl font-hell-round-bold text-gray-900 mb-1">
              {profile?.full_name || 'User'}
            </Text>
            <Text className="text-gray-600 font-hell">
              {profile?.username ? `@${profile.username}` : 'No username'}
            </Text>
            {profile?.created_at && (
              <Text className="text-gray-500 text-xs font-hell mt-2">
                {formatMemberSince(profile.created_at)}
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
                <Text className="text-lg font-hell-round-bold text-gray-900 ">
                  View Statistics
                </Text>
                <Text className="text-gray-600 text-sm font-hell">
                  See your sensor usage history
                </Text>
              </View>
              <ChevronRight size={24} color="#9E9E9E" strokeWidth={2.5} />
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
                <Text className="text-lg font-hell-round-bold text-gray-900 ">
                  Notifications
                </Text>
                <Text className="text-gray-600 text-sm font-hell">
                  Manage alert preferences
                </Text>
              </View>
              <ChevronRight size={24} color="#9E9E9E" strokeWidth={2.5} />
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
                <Text className="text-lg font-hell-round-bold text-gray-900 ">
                  About NORN
                </Text>
                <Text className="text-gray-600 text-sm font-hell">
                  App version and information
                </Text>
              </View>
              <ChevronRight size={24} color="#9E9E9E" strokeWidth={2.5} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Action Buttons */}
        <View className="gap-y-3 mb-8">
          <Button
            title="Settings"
            onPress={() => router.push("/settings")}
            variant="secondary"
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
