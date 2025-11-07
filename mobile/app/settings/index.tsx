import { AlertTriangle, LogOut, Moon } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, SafeAreaView, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../contexts/auth-context';

interface SettingsFormData {
  deviceName: string;
  refreshInterval: string;
  alertThreshold: string;
  sleepModeEnabled: boolean;
  fallDetectionEnabled: boolean;
  emergencyContact: string;
}

const SettingsScreen = () => {
  const { user, signOut } = useAuth();
  
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SettingsFormData>({
    defaultValues: {
      deviceName: 'C1001 SEN0623',
      refreshInterval: '5',
      alertThreshold: '80',
      sleepModeEnabled: true,
      fallDetectionEnabled: true,
      emergencyContact: '',
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Settings Saved',
        'Your sensor configuration has been updated successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save settings. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => reset(),
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <Header
          title="Settings"
          subtitle="Configure your sensor preferences"
          showBackButton={true}
        />

        {/* User Info */}
        <Card variant="outlined" className="mb-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-hell-round-bold text-gray-900 ">
                {user?.email || "Guest User"}
              </Text>
              <Text className="text-gray-600 text-sm font-hell">
                {user ? "Authenticated" : "Not signed in"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center bg-red-50 px-6 py-4 rounded-xl"
            >
              <LogOut size={16} color="#dc2626" />
              <Text className="text-red-600 font-hell font-medium ml-2 font-hell">
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Monitoring Modes */}
        <Card variant="outlined" className="mb-6">
          <Text className="text-lg font-hell-round-bold text-gray-900 mb-4 ">
            Monitoring Modes
          </Text>

          <View className="gap-y-4">
            <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary-accent rounded-lg items-center justify-center mr-3">
                  <Moon size={20} color="white" fill="white" />
                </View>
                <View>
                  <Text className="text-base font-hell-round-bold text-gray-900 ">
                    Sleep Mode
                  </Text>
                  <Text className="text-gray-600 text-sm font-hell">
                    Optimized for sleep monitoring
                  </Text>
                </View>
              </View>
              <Controller
                control={control}
                name="sleepModeEnabled"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: "#E5E7EB", true: "#FF7300" }}
                    thumbColor={value ? "#FFFFFF" : "#F3F4F6"}
                    ios_backgroundColor="#E5E7EB"
                  />
                )}
              />
            </View>

            <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary-button rounded-lg items-center justify-center mr-3">
                  <AlertTriangle size={20} color="white" />
                </View>
                <View>
                  <Text className="text-base font-hell-round-bold text-gray-900 ">
                    Fall Detection
                  </Text>
                  <Text className="text-gray-600 text-sm font-hell">
                    Emergency fall detection
                  </Text>
                </View>
              </View>
              <Controller
                control={control}
                name="fallDetectionEnabled"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: "#E5E7EB", true: "#FF7300" }}
                    thumbColor={value ? "#FFFFFF" : "#F3F4F6"}
                    ios_backgroundColor="#E5E7EB"
                  />
                )}
              />
            </View>
          </View>
        </Card>

        {/* Emergency Settings */}
        {/* <Card variant="outlined" className="mb-6">
          <Text className="text-lg font-hell-round-bold text-gray-900 mb-4 ">
            Emergency Settings
          </Text>

          <Controller
            control={control}
            name="emergencyContact"
            rules={{
              pattern: {
                value: /^[\+]?[1-9][\d]{0,15}$/,
                message: "Please enter a valid phone number",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Emergency Contact"
                placeholder="Enter phone number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                error={errors.emergencyContact?.message}
              />
            )}
          />
        </Card> */}

        {/* Action Buttons */}
        <View className="gap-y-3 mb-8">
          <Button
            title="Save Settings"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          />

          <Button
            title="Reset to Defaults"
            onPress={handleReset}
            variant="outline"
            size="lg"
            className="w-full"
          />
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;