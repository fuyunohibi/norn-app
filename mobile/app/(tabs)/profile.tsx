import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, ChevronRight, Info } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentUser } from '../../actions/user.actions';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../contexts/auth-context';
import { formatMemberSince } from '../../utils/date.utils';

/** Tall enough for art; avatar straddles bottom of hero + top of sheet. */
const HERO_MIN_HEIGHT = 350;
/** Diameter; half overlaps hero, half sits on the white sheet. */
const AVATAR_SIZE = 128;
const AVATAR_RADIUS = AVATAR_SIZE / 2;

const menuStyles = StyleSheet.create({
  groupCard: {
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  iconTile: {
    borderCurve: 'continuous',
  },
});

const ProfileScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const {
    data: profile,
    isPending,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: getCurrentUser,
    enabled: !authLoading && !!user?.id,
    staleTime: 60 * 1000,
  });

  if (error) {
    console.error('Profile query error:', error);
  }

  const showInitialLoading = authLoading || (!!user?.id && isPending);

  const heroBlock = (
    <ImageBackground
      source={require('../../assets/images/backgrounds/daytime-bg.png')}
      resizeMode="cover"
      className="w-full overflow-hidden rounded-b-[2.5rem]"
      style={{ minHeight: HERO_MIN_HEIGHT + insets.top }}
    />
  );

  const renderAvatar = () => (
    <View
      className="items-center justify-center bg-[#FF7300]"
      style={{
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_RADIUS,
        borderWidth: 4,
        borderColor: '#ffffff',
      }}
    >
      {profile?.full_name ? (
        <Text className="text-4xl font-hell-round-bold text-white">
          {profile.full_name.charAt(0).toUpperCase()}
        </Text>
      ) : (
        <Text className="text-4xl font-hell-round-bold text-white">U</Text>
      )}
    </View>
  );

  if (showInitialLoading) {
    return (
      <View className="flex-1 bg-gray-900">
        {heroBlock}
        <View className="flex-1">
          <ScrollView
            className="mt-6 flex-1 rounded-t-[2.5rem] bg-white px-6 pt-6"
            contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
            showsVerticalScrollIndicator={false}
          >
            <Card variant="outlined" className="border-gray-100 bg-gray-50/80">
              <View className="items-center py-10">
                <ActivityIndicator size="large" color="#FF7300" />
                <Text className="mt-4 font-hell text-sm text-gray-600">
                  Loading profile…
                </Text>
              </View>
            </Card>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      {heroBlock}

      {/* Avatar centered on hero/sheet seam: half on image, half on white; sheet pulled up with negative margin. */}
      <View
        className="flex-1 -mt-[10rem]"
      >
        <View
          className="items-center"
          style={{
            marginBottom: -AVATAR_RADIUS,
            zIndex: 20,
            elevation: 14,
          }}
        >
          {renderAvatar()}
        </View>

        <ScrollView
          className="flex-1 rounded-t-[3rem] bg-white px-6"
          style={{ zIndex: 0 }}
          contentContainerStyle={{
            /* ScrollView top sits at avatar midline; reserve bottom half of circle + gap so name is never under the avatar. */
            paddingTop: AVATAR_RADIUS + 10,
            paddingBottom: insets.bottom + 28,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor="#FF7300"
              colors={['#FF7300']}
            />
          }
        >
          <View className="items-center px-1">
            <Text className="mb-2 text-center text-2xl font-hell-round-bold text-gray-900">
              {profile?.full_name || 'User'}
            </Text>
            <Text className="text-center font-hell text-gray-600">
              {profile?.username ? `@${profile.username}` : 'No username'}
            </Text>
            {profile?.created_at ? (
              <Text className="mt-3 text-center text-xs font-hell text-gray-500">
                {formatMemberSince(profile.created_at)}
              </Text>
            ) : null}
          </View>

          <Text className="mb-2 mt-10 text-xs font-hell-round-bold uppercase tracking-[0.08em] text-gray-400">
            More
          </Text>

          <View
            className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
            style={menuStyles.groupCard}
          >
            <TouchableOpacity
              className="flex-row items-center px-4 py-4 active:bg-gray-50"
              onPress={() => router.push('/notifications')}
              activeOpacity={0.92}
            >
              <View
                className="mr-3.5 h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/90"
                style={menuStyles.iconTile}
              >
                <Bell size={22} color="#FF7300" strokeWidth={2.2} />
              </View>
              <View className="min-w-0 flex-1 pr-2">
                <Text className="text-base font-hell-round-bold text-gray-900">
                  Notifications
                </Text>
                <Text className="mt-0.5 font-hell text-sm leading-5 text-gray-500">
                  Manage alert preferences
                </Text>
              </View>
              <View className="h-9 w-9 items-center justify-center">
                <ChevronRight size={24} color="#9CA3AF" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <View className="mx-4 h-px bg-gray-100" />

            <TouchableOpacity
              className="flex-row items-center px-4 py-4 active:bg-gray-50"
              onPress={() => router.push('/about')}
              activeOpacity={0.92}
            >
              <View
                className="mr-3.5 h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl border border-gray-200/80 bg-gray-50"
                style={menuStyles.iconTile}
              >
                <Info size={22} color="#52525B" strokeWidth={2.2} />
              </View>
              <View className="min-w-0 flex-1 pr-2">
                <Text className="text-base font-hell-round-bold text-gray-900">
                  About NORN
                </Text>
                <Text className="mt-0.5 font-hell text-sm leading-5 text-gray-500">
                  App version and information
                </Text>
              </View>
              <View className="h-9 w-9 items-center justify-center rounded-full">
                <ChevronRight size={24} color="#9CA3AF" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>

          <View className="mt-8">
            <Button
              title="Settings"
              onPress={() => router.push('/settings')}
              variant="secondary"
              size="lg"
              className="w-full"
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default ProfileScreen;
