import { NornIcon } from '@/components/norn-icon';
import Constants from 'expo-constants';
import { Heart, Shield, Zap } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';

const AboutScreen = () => {
  const insets = useSafeAreaInsets();
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

  return (
    <View className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
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
            <View className="w-24 h-24 bg-primary-accent rounded-3xl items-center justify-center mb-4">
              <NornIcon size={52} />
            </View>
            <Text className="text-2xl font-hell-round-bold text-gray-900 mb-2 ">
              NORN
            </Text>
            <Text className="text-gray-600 text-center mb-4 font-hell">
              Home Fall & Sleep Monitoring System{'\n'}with Life Sign Detection
            </Text>
            <View className="bg-gray-100 rounded-lg px-4 py-2">
              <Text className="text-sm font-hell-round-bold text-gray-700 ">
                Version {appVersion} (Build {buildNumber})
              </Text>
            </View>
          </View>
        </Card>

        {/* Features */}
        <View className="mb-6">
          <Text className="text-xl font-hell-round-bold text-gray-900 mb-4 ">
            Features
          </Text>
          <View className="gap-3">
            <Card variant="outlined">
              <View className="p-4 flex-row items-center">
                <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-4">
                  <Heart size={24} color="white" fill="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-hell-round-bold text-gray-900 ">
                    Sleep Monitoring
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1 font-hell">
                    Track heart rate, respiration, and sleep quality
                  </Text>
                </View>
              </View>
            </Card>

            <Card variant="outlined">
              <View className="p-4 flex-row items-center">
                <View className="w-12 h-12 bg-warning rounded-xl items-center justify-center mr-4">
                    <Shield size={24} color="white" fill="white"  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-hell-round-bold text-gray-900 ">
                    Fall Detection
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1 font-hell">
                    Real-time fall detection with instant alerts
                  </Text>
                </View>
              </View>
            </Card>

            <Card variant="outlined">
              <View className="p-4 flex-row items-center">
                <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                  <Zap size={24} color="white" fill="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-hell-round-bold text-gray-900 ">
                    Real-time Monitoring
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1 font-hell">
                    Live sensor data and health metrics
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </View>

        {/* Footer */}
        <Card variant="outlined" className="mb-6">
          <View className="p-4 items-center">
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-600 text-center font-hell">
                Made with
              </Text>
              <Heart
                size={12}
                color="#EF4444"
                fill="#EF4444"
                style={{ marginHorizontal: 4 }}
              />
              <Text className="text-sm text-gray-600 text-center font-hell">
                for health monitoring
              </Text>
            </View>
            <Text className="text-xs text-gray-500 mt-2 font-hell">
              © 2025 NORN. All rights reserved.
            </Text>
          </View>
        </Card>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
};

export default AboutScreen;

