import Constants from 'expo-constants';
import { Heart, Shield, Zap } from 'lucide-react-native';
import React from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';

const AboutScreen = () => {
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <Header
          title="About NORN"
          subtitle="App information and version"
          showBackButton
        />

        {/* App Info Card */}
        <Card variant="outlined" className="mb-6">
          <View className="items-center p-6">
            <View className="w-20 h-20 bg-primary-accent rounded-2xl items-center justify-center mb-4">
              <Shield size={40} color="white" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">NORN</Text>
            <Text className="text-gray-600 text-center mb-4">
              Advanced mmWave sensor monitoring for sleep and fall detection
            </Text>
            <View className="bg-gray-100 rounded-lg px-4 py-2">
              <Text className="text-sm font-semibold text-gray-700">
                Version {appVersion} (Build {buildNumber})
              </Text>
            </View>
          </View>
        </Card>

        {/* Features */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">Features</Text>
          <View className="gap-3">
            <Card variant="outlined">
              <View className="p-4 flex-row items-center">
                <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-4">
                  <Heart size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    Sleep Monitoring
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Track heart rate, respiration, and sleep quality
                  </Text>
                </View>
              </View>
            </Card>

            <Card variant="outlined">
              <View className="p-4 flex-row items-center">
                <View className="w-12 h-12 bg-warning rounded-xl items-center justify-center mr-4">
                  <Shield size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    Fall Detection
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Real-time fall detection with instant alerts
                  </Text>
                </View>
              </View>
            </Card>

            <Card variant="outlined">
              <View className="p-4 flex-row items-center">
                <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                  <Zap size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    Real-time Monitoring
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Live sensor data and health metrics
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </View>

        {/* Technology */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">Technology</Text>
          <Card variant="outlined">
            <View className="p-4">
              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Frontend</Text>
                <Text className="text-sm text-gray-600">
                  React Native • Expo • TypeScript • TailwindCSS
                </Text>
              </View>
              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Backend</Text>
                <Text className="text-sm text-gray-600">
                  Python • FastAPI • Supabase
                </Text>
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">Hardware</Text>
                <Text className="text-sm text-gray-600">
                  ESP32 • DFRobot mmWave Sensor
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Footer */}
        <Card variant="outlined" className="mb-6">
          <View className="p-4 items-center">
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-600 text-center">
                Made with
              </Text>
              <Heart size={12} color="#EF4444" fill="#EF4444" style={{ marginHorizontal: 4 }} />
              <Text className="text-sm text-gray-600 text-center">
                for health monitoring
              </Text>
            </View>
            <Text className="text-xs text-gray-500 mt-2">
              © 2025 NORN. All rights reserved.
            </Text>
          </View>
        </Card>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutScreen;

