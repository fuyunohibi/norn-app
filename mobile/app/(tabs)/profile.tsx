import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentUser } from '../../actions/user.actions';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ProfileAvatar } from '../../components/profile/profile-avatar';
import { ProfileShortcutsCard } from '../../components/profile/profile-shortcuts-card';
import { useAuth } from '../../contexts/auth-context';
import { formatMemberSince } from '../../utils/date.utils';
import { HERO_MIN_HEIGHT_PROFILE, NornColors } from '@/theme';

/** Diameter; half overlaps hero, half sits on the white sheet. */
const AVATAR_SIZE = 128;
const AVATAR_RADIUS = AVATAR_SIZE / 2;

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
      style={{ minHeight: HERO_MIN_HEIGHT_PROFILE + insets.top }}
    />
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
                <ActivityIndicator size="large" color={NornColors.brandOrange} />
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
          <ProfileAvatar fullName={profile?.full_name} size={AVATAR_SIZE} />
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
              tintColor={NornColors.brandOrange}
              colors={[NornColors.brandOrange]}
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

          <ProfileShortcutsCard
            onNotifications={() => router.push('/notifications')}
            onAbout={() => router.push('/about')}
          />

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
