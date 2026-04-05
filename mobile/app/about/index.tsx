import { NornIcon } from '../../components/norn-icon';
import { Card } from '../../components/ui/card';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BellRing, ChevronLeft, Cpu, Heart, Shield, Sparkles } from 'lucide-react-native';
import React from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  versionPill: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});

const AboutScreen = () => {
  const insets = useSafeAreaInsets();

  const displayVersion = Constants.expoConfig?.version ?? '2.0.0';

  const features = [
    {
      key: 'live',
      icon: Sparkles,
      iconBg: 'bg-violet-50',
      iconBorder: 'border-violet-200/80',
      iconColor: '#7C3AED',
      title: 'Live activity',
      body:
        'The clip tracks motion. Your timeline and mascot match what the sensor sees.',
    },
    {
      key: 'fall',
      icon: Shield,
      iconBg: 'bg-orange-50',
      iconBorder: 'border-orange-100',
      iconColor: '#FF7300',
      title: 'Fall safety',
      body:
        'Alerts for falls, near-falls, and shaky balance, with clear severity so you know what to do next.',
    },
    {
      key: 'link',
      icon: Cpu,
      iconBg: 'bg-sky-50',
      iconBorder: 'border-sky-200/70',
      iconColor: '#0284C7',
      title: 'Clip and phone',
      body:
        'Live or offline status, last signal, and sensor details in one place. Works with your home Wi-Fi setup.',
    },
    {
      key: 'alerts',
      icon: BellRing,
      iconBg: 'bg-amber-50',
      iconBorder: 'border-amber-200/80',
      iconColor: '#D97706',
      title: 'Smart alerts',
      body:
        'Fall notifications, a simple inbox, and quick ways to get help when it counts.',
    },
  ] as const;

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
            About NORN
          </Text>
          <Text
            className="mt-2 max-w-[92%] text-base font-hell leading-6 text-white/95"
            style={heroTextShadow}
          >
            Version, features, and the ideas behind the app.
          </Text>
        </View>
      </ImageBackground>

      <View className="flex-1 bg-gray-900">
        <ScrollView
          className="mt-6 flex-1 rounded-t-[2.5rem] bg-white px-6 pt-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card
            variant="outlined"
            className="border-gray-100 bg-gray-50/90"
            style={sheetStyles.groupCard}
          >
            <View className="items-center px-2 py-6">
              <View className="mb-4 h-[5.5rem] w-[5.5rem] items-center justify-center rounded-3xl bg-[#FF7300] shadow-sm">
                <NornIcon size={56} />
              </View>
              <Text className="text-center text-2xl font-hell-round-bold text-gray-900">
                NORN
              </Text>
              <Text className="mt-2 text-center font-hell text-sm leading-5 text-gray-600">
                Home activity and fall safety with your wearable clip. Calm UI when you need
                it most.
              </Text>
              <View
                className="mt-5 rounded-full border border-gray-200/90 bg-white px-5 py-2.5"
                style={sheetStyles.versionPill}
              >
                <Text className="text-center text-sm font-hell-round-bold text-gray-800">
                  Version {displayVersion}
                </Text>
              </View>
            </View>
          </Card>

          <Text className="mb-2 mt-10 text-xs font-hell-round-bold uppercase tracking-[0.08em] text-gray-400">
            Product
          </Text>
          <Text className="text-lg font-hell-round-bold text-gray-900">
            What makes it tick
          </Text>
          <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">
            Four things we focus on.
          </Text>

          <View
            className="mt-4 overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
            style={sheetStyles.groupCard}
          >
            {features.map((item, index) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={item.key}>
                  {index > 0 ? <View className="mx-4 h-px bg-gray-100" /> : null}
                  <View className="flex-row gap-3 px-4 py-4">
                    <View
                      className={`h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${item.iconBg} ${item.iconBorder}`}
                    >
                      <Icon size={22} color={item.iconColor} strokeWidth={2.2} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-hell-round-bold text-gray-900">
                        {item.title}
                      </Text>
                      <Text className="mt-1.5 font-hell text-sm leading-5 text-gray-600">
                        {item.body}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </View>

          <Card variant="outlined" className="mt-8 border-gray-100 bg-white">
            <View className="items-center px-2 py-4">
              <View className="flex-row flex-wrap items-center justify-center">
                <Text className="text-center font-hell text-sm text-gray-600">
                  Made with
                </Text>
                <Heart
                  size={14}
                  color="#EF4444"
                  fill="#EF4444"
                  style={{ marginHorizontal: 6 }}
                />
                <Text className="text-center font-hell text-sm text-gray-600">
                  for safer, clearer days at home.
                </Text>
              </View>
              <Text className="mt-3 text-center text-xs font-hell text-gray-500">
                © 2026 NORN. All rights reserved.
              </Text>
            </View>
          </Card>
        </ScrollView>
      </View>
    </View>
  );
};

export default AboutScreen;
