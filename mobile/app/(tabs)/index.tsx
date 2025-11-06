import { router } from 'expo-router';
import { Activity, AlertTriangle, ChevronRight, Heart, Moon, Shield, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/card';
import { useC1001Sensor } from '../../hooks/useC1001Sensor';
import { useSensorConnection } from '../../hooks/useSensorMock';
import { useModeStore } from '../../stores/mode.store';

const HomeScreen = () => {
  const { data: connection } = useSensorConnection();
  const { modes, activeMode, setActiveMode } = useModeStore();
  const { data: sensorData, isLoading: sensorLoading } = useC1001Sensor();
  const [showModeSelector, setShowModeSelector] = useState(false);

  const getModeIcon = (modeId: string) => {
    switch (modeId) {
      case 'sleep':
        return <Moon size={24} color="white" />;
      case 'fall':
        return <AlertTriangle size={24} color="white" />;
      default:
        return <Moon size={24} color="white" />;
    }
  };


  const handleViewSettings = () => {
    router.push('/settings');
  };

  const handleModeSelect = (mode: any) => {
    setActiveMode(mode.id);
    console.log('Selected mode:', mode);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        <View className='w-full justify-center items-center h-20'>
          <Text className="text-lg font-bold text-gray-900">
            NORN
          </Text>
        </View>

  {/* Connection Status */}
          <Card variant="outlined" className="mb-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-semibold text-gray-900">
                  {connection?.connected ? 'Connected' : 'Disconnected'}
                </Text>
                <Text className="text-gray-600 text-sm">
                  {connection?.deviceName || 'No device'}
                </Text>
              </View>
              <View className={`w-3 h-3 rounded-full ${connection?.connected ? 'bg-success' : 'bg-error'}`} />
            </View>
          </Card>

                  {/* Mode Selector */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">
            Current Mode
          </Text>
          
          <TouchableOpacity
            onPress={() => setShowModeSelector(true)}
            className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                {activeMode ? getModeIcon(activeMode.id) : <Moon size={24} color="white" />}
              </View>
              <View>
                <Text className="text-lg font-semibold text-gray-900">
                  {activeMode?.name || 'No Mode Selected'}
                </Text>
              </View>
            </View>
           <ChevronRight size={24} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {/* Mode-Specific Data Display */}
        {sensorData && (
          <View className="mb-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              {activeMode?.name} Status
            </Text>
            
            {activeMode?.id === 'sleep' && sensorData.sleepData && (
              <View className="gap-y-3">
                {/* Sleep Quality */}
                <Card variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                        <Moon size={24} color="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-semibold text-gray-900">
                          Sleep Quality
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          {sensorData.sleepData.sleepQualityRating === 1 ? 'Good' : 
                           sensorData.sleepData.sleepQualityRating === 2 ? 'Average' : 
                           sensorData.sleepData.sleepQualityRating === 3 ? 'Poor' : 'None'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-2xl font-bold text-primary-accent">
                      {sensorData.sleepData.sleepQuality}%
                    </Text>
                  </View>
                </Card>

                {/* Sleep State */}
                <Card variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-4">
                        <Activity size={24} color="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-semibold text-gray-900">
                          Sleep State
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          {sensorData.sleepData.inOrNotInBed === 1 ? 'In Bed' : 'Out of Bed'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                      {sensorData.sleepData.sleepState === 0 ? 'Deep Sleep' :
                       sensorData.sleepData.sleepState === 1 ? 'Light Sleep' :
                       sensorData.sleepData.sleepState === 2 ? 'Awake' : 'None'}
                    </Text>
                  </View>
                </Card>

                {/* Sleep Duration */}
                <Card variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-success rounded-xl items-center justify-center mr-4">
                        <Heart size={24} color="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-semibold text-gray-900">
                          Sleep Duration
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          Deep: {sensorData.sleepData.deepSleepDuration}min
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                      {sensorData.sleepData.wakeDuration}min awake
                    </Text>
                  </View>
                </Card>
              </View>
            )}

            {activeMode?.id === 'fall' && sensorData.fallData && (
              <View className="gap-y-3">
                {/* Fall Status */}
                <Card variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                        sensorData.fallData.fallState === 1 ? 'bg-red-500' : 'bg-green-500'
                      }`}>
                        <Shield size={24} color="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-semibold text-gray-900">
                          Fall Status
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          {sensorData.humanData.presence === 1 ? 'Person Present' : 'No Person'}
                        </Text>
                      </View>
                    </View>
                    <Text className={`text-lg font-bold ${
                      sensorData.fallData.fallState === 1 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {sensorData.fallData.fallState === 1 ? 'FALL DETECTED' : 'Safe'}
                    </Text>
                  </View>
                </Card>

                {/* Movement Status */}
                <Card variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mr-4">
                        <Zap size={24} color="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-semibold text-gray-900">
                          Movement Status
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          Range: {sensorData.humanData.movingRange}%
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                      {sensorData.humanData.movement === 0 ? 'None' :
                       sensorData.humanData.movement === 1 ? 'Still' : 'Active'}
                    </Text>
                  </View>
                </Card>

                {/* Stationary Status */}
                <Card variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                        <AlertTriangle size={24} color="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-semibold text-gray-900">
                          Stationary Status
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          Sensitivity: {sensorData.fallData.fallSensitivity}/3
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                      {sensorData.fallData.staticResidencyState === 1 ? 'Stationary' : 'Moving'}
                    </Text>
                  </View>
                </Card>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Mode Selector Bottom Sheet */}
      {/* <ModeSelector
        isVisible={showModeSelector}
        onClose={() => setShowModeSelector(false)}
      /> */}
    </SafeAreaView>
  );
};

export default HomeScreen;
