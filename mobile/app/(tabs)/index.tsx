import { router } from 'expo-router';
import { Activity, AlertTriangle, ChevronRight, Heart, Moon, Shield, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/card';
import { useLatestSensorReading } from '../../hooks/useSensorReadings';
import { backendAPIService } from '../../services/backend-api.service';
import { useModeStore } from '../../stores/mode.store';

// Memoize the mode icon component to prevent re-renders
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

const HomeScreen = () => {
  const { modes, activeMode, setActiveMode, isLoading: modeLoading, error: modeError } = useModeStore();
  // Use the default user_id that matches the backend (memoized)
  const userId = React.useMemo(() => '0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61', []);
  const { reading, rawData, isLoading: readingLoading, error: readingError, timestamp, readingType } = useLatestSensorReading(userId);
  const [showModeSelector, setShowModeSelector] = useState(false);


  const handleViewSettings = () => {
    router.push('/settings');
  };

  const handleModeSelect = async (mode: any) => {
    try {
      await setActiveMode(mode.id);
      setShowModeSelector(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to change mode. Please try again.');
    }
  };

  // Check backend health
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        await backendAPIService.getHealthStatus();
        setBackendConnected(true);
        setBackendError(null);
      } catch (error: any) {
        setBackendConnected(false);
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('Network request failed') || errorMsg.includes('Failed to fetch')) {
          setBackendError('Cannot connect to backend. Check network settings.');
        } else {
          setBackendError(errorMsg);
        }
      }
    };
    
    checkHealth();
    // Recheck every 60 seconds (reduced frequency)
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

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
                  {backendConnected ? 'Connected' : backendConnected === false ? 'Disconnected' : 'Checking...'}
                </Text>
                <Text className="text-gray-600 text-sm">
                  {readingLoading ? 'Loading sensor data...' : reading ? 'Receiving data' : 'No data yet'}
                </Text>
                {modeError && (
                  <Text className="text-red-500 text-xs mt-1">{modeError}</Text>
                )}
                {backendError && (
                  <Text className="text-orange-500 text-xs mt-1">{backendError}</Text>
                )}
              </View>
              <View className={`w-3 h-3 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </View>
          </Card>

                  {/* Mode Selector */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">
            Current Mode
          </Text>
          
          <TouchableOpacity
            onPress={() => setShowModeSelector(true)}
            disabled={modeLoading}
            className="bg-white border border-gray-200 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                {modeLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  activeMode ? getModeIcon(activeMode.id) : <Moon size={24} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {activeMode?.name || 'No Mode Selected'}
                </Text>
                {modeLoading && (
                  <Text className="text-gray-500 text-xs mt-1">Changing mode...</Text>
                )}
              </View>
            </View>
            <ChevronRight size={24} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {/* Mode-Specific Data Display */}
        {readingLoading && (
          <View className="mb-6 items-center py-8">
            <ActivityIndicator size="large" color="#6366f1" />
            <Text className="text-gray-600 mt-4">Loading sensor data...</Text>
          </View>
        )}

        {readingError && (
          <Card variant="outlined" className="mb-6">
            <View className="p-4">
              <Text className="text-red-500 font-semibold">Error loading data</Text>
              <Text className="text-gray-600 text-sm mt-2">{readingError.message || String(readingError)}</Text>
              <Text className="text-gray-500 text-xs mt-2">
                Make sure EXPO_PUBLIC_API_URL is set to your computer's IP (e.g., http://192.168.1.100:8000)
              </Text>
            </View>
          </Card>
        )}

        {reading && rawData && (
          <View className="mb-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              {activeMode?.name} Status
            </Text>
            {timestamp && (
              <Text className="text-gray-500 text-sm mb-4">
                Last update: {new Date(timestamp).toLocaleTimeString()}
              </Text>
            )}
            
            {activeMode?.id === 'sleep' && rawData && (rawData.mode === 'sleep_detection' || readingType === 'sleep') && (
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
                          {rawData.quality_rating === 1 ? 'Good' : 
                           rawData.quality_rating === 2 ? 'Average' : 
                           rawData.quality_rating === 3 ? 'Poor' : 'None'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-2xl font-bold text-primary-accent">
                      {rawData.sleep_quality_score || reading.sleep_quality_score || 0}
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
                          {rawData.in_bed === 1 ? 'In Bed' : 'Out of Bed'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                      {rawData.comprehensive?.sleep_state === 0 ? 'Deep Sleep' :
                       rawData.comprehensive?.sleep_state === 1 ? 'Light Sleep' :
                       rawData.comprehensive?.sleep_state === 2 ? 'Awake' : 
                       rawData.sleep_status === 0 ? 'Deep Sleep' :
                       rawData.sleep_status === 1 ? 'Light Sleep' :
                       rawData.sleep_status === 2 ? 'Awake' : 'None'}
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
                          Deep: {rawData.deep_sleep_duration || 0}min
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                      {rawData.awake_duration || 0}min awake
                    </Text>
                  </View>
                </Card>
              </View>
            )}

            {activeMode?.id === 'fall' && rawData && (rawData.mode === 'fall_detection' || readingType === 'fall') && (
              <View className="gap-y-3">
                {/* Fall Status */}
                <Card variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                        rawData.fall_status === 1 || reading.is_fall_detected ? 'bg-red-500' : 'bg-green-500'
                      }`}>
                        <Shield size={24} color="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-semibold text-gray-900">
                          Fall Status
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          {rawData.presence === 1 || (reading && reading.is_person_detected) ? 'Person Present' : 'No Person'}
                        </Text>
                      </View>
                    </View>
                    <Text className={`text-lg font-bold ${
                      rawData.fall_status === 1 || (reading && reading.is_fall_detected) ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {rawData.fall_status === 1 || (reading && reading.is_fall_detected) ? 'FALL DETECTED' : 'Safe'}
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
                          Motion Level: {rawData.motion || 0}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                      {rawData.motion === 0 ? 'None' :
                       rawData.motion === 1 ? 'Still' : 'Active'}
                    </Text>
                  </View>
                </Card>

                {/* Body Movement */}
                <Card variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mr-4">
                        <Activity size={24} color="white" />
                      </View>
                      <View>
                        <Text className="text-lg font-semibold text-gray-900">
                          Body Movement
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          Range: {rawData.body_movement || 0}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                      {reading && reading.is_movement_detected ? 'Detected' : 'None'}
                    </Text>
                  </View>
                </Card>
              </View>
            )}

            {reading && !rawData && (
              <Card variant="outlined" className="mb-6">
                <View className="p-4">
                  <Text className="text-gray-600">No sensor data available yet</Text>
                  <Text className="text-gray-500 text-sm mt-2">Waiting for sensor readings...</Text>
                  <Text className="text-gray-400 text-xs mt-2">
                    Reading ID: {reading.id} | Type: {reading.reading_type}
                  </Text>
                </View>
              </Card>
            )}

            {!reading && !readingLoading && !readingError && (
              <Card variant="outlined" className="mb-6">
                <View className="p-4">
                  <Text className="text-gray-600">No readings found</Text>
                  <Text className="text-gray-500 text-sm mt-2">
                    Make sure the backend is running and receiving data from ESP32
                  </Text>
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* Mode Selector Modal */}
      <Modal
        visible={showModeSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModeSelector(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-8 max-h-[70%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Select Mode</Text>
              <TouchableOpacity
                onPress={() => setShowModeSelector(false)}
                className="w-8 h-8 items-center justify-center"
              >
                <Text className="text-2xl text-gray-400">×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {modes.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  onPress={() => handleModeSelect(mode)}
                  disabled={modeLoading}
                  className={`mb-4 p-4 rounded-2xl border-2 ${
                    activeMode?.id === mode.id 
                      ? 'border-primary-accent bg-primary-accent/10' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                      activeMode?.id === mode.id ? 'bg-primary-accent' : 'bg-gray-200'
                    }`}>
                      {getModeIcon(mode.id)}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-lg font-semibold ${
                        activeMode?.id === mode.id ? 'text-primary-accent' : 'text-gray-900'
                      }`}>
                        {mode.name}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        {mode.description}
                      </Text>
                    </View>
                    {activeMode?.id === mode.id && (
                      <View className="w-6 h-6 rounded-full bg-primary-accent items-center justify-center">
                        <Text className="text-white text-xs">✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;
