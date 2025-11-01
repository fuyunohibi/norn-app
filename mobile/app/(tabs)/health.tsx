import { Activity, Heart, Moon, Shield, User, Zap } from 'lucide-react-native';
import React from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/ui/card';
import Header from '../../components/ui/header';
import { useC1001Sensor } from '../../hooks/useC1001Sensor';
import { useSensorReadings } from '../../hooks/useSensorMock';
import { useModeStore } from '../../stores/mode.store';

const HealthScreen = () => {
  const { data: readings, isLoading: readingsLoading } = useSensorReadings();
  const { data: sensorData, isLoading: sensorLoading } = useC1001Sensor();
  const { activeMode } = useModeStore();

  // Get specific readings
  const heartRateReading = readings?.find(r => r.type === 'heart_rate');
  const movementReading = readings?.find(r => r.type === 'movement');
  const presenceReading = readings?.find(r => r.type === 'presence');
  const respirationReading = readings?.find(r => r.type === 'respiration');

  const getReadingColor = (type: string, value: number | null) => {
    if (value === null) return 'text-gray-400';
    
    switch (type) {
      case 'respiration':
        return value >= 12 && value <= 20 ? 'text-success' : 'text-warning';
      case 'heart_rate':
        return value >= 60 && value <= 100 ? 'text-success' : 'text-warning';
      case 'movement':
        return value < 30 ? 'text-success' : value < 70 ? 'text-warning' : 'text-error';
      case 'presence':
        return value === 1 ? 'text-success' : 'text-gray-400';
      default:
        return 'text-gray-600';
    }
  };

  const formatReadingValue = (reading: any) => {
    if (reading.value === null) return '--';
    if (reading.type === 'presence') return reading.value === 1 ? 'Detected' : 'Not detected';
    return `${reading.value}${reading.unit}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <Header 
          title="Health" 
          subtitle="Real-time monitoring"
        />

        {/* Live Heart Rate - First Row */}
        <View className="mb-6">
          <Card variant="outlined" className="bg-red-50 border-red-100">
            <View className="flex-row items-center justify-between px-1 py-5">
              <View className="flex-row items-center">
                <View className="w-14 h-14 bg-red-500 rounded-xl items-center justify-center mr-3">
                  <Heart size={24} color="white" fill="white" />
                </View>
                <View className='gap-y-1'>
                  <Text className="text-base font-semibold text-gray-900">
                    Live Heart Rate
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {heartRateReading?.lastUpdated ? 
                      `Updated ${heartRateReading.lastUpdated.toLocaleTimeString()}` : 
                      'No data available'
                    }
              </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className={`text-2xl font-bold ${getReadingColor('heart_rate', heartRateReading?.value || null)}`}>
                  {heartRateReading?.value ? `${heartRateReading.value} BPM` : '--'}
              </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Health Monitor - Three Columns */}
        <View className="mb-8">
          <Text className="text-xl font-bold text-gray-900 mb-4">
            Health Monitor
          </Text>
          
          {readingsLoading ? (
            <View className="flex-row gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} variant="outlined" className="flex-1">
                  <View className="p-4 items-center">
                    <View className="w-10 h-10 bg-gray-200 rounded-xl mb-3 animate-pulse" />
                    <View className="h-3 bg-gray-200 rounded mb-2 w-16 animate-pulse" />
                    <View className="h-5 bg-gray-200 rounded w-12 animate-pulse" />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <View className="flex-row gap-3">
              {/* Movement Column */}
              <Card variant="outlined" className="flex-1">
                 <View className="items-center py-2">
                  <View className="w-12 h-12 bg-primary-accent rounded-xl items-center justify-center mb-3">
                    <Zap size={24} color="white" />
                  </View>
                  <Text className="text-xs font-medium text-gray-600 mb-2">
                    Movement
                  </Text>
                  <Text className={`text-lg font-bold ${getReadingColor('movement', movementReading?.value || null)}`}>
                    {movementReading?.value ? `${movementReading.value}%` : '--'}
                  </Text>
                </View>
              </Card>

              {/* Presence Column */}
              <Card variant="outlined" className="flex-1">
                <View className="items-center py-2">
                  <View className="w-12 h-12 bg-primary-button rounded-xl items-center justify-center mb-3">
                    <User size={24} color="white" />
                  </View>
                  <Text className="text-xs font-medium text-gray-600 mb-2">
                    Presence
                  </Text>
                  <Text className={`text-base font-bold ${getReadingColor('presence', presenceReading?.value || null)}`}>
                    {presenceReading?.value === 1 ? 'Yes' : presenceReading?.value === 0 ? 'No' : '--'}
                  </Text>
                </View>
              </Card>

              {/* Respiration Column */}
              <Card variant="outlined" className="flex-1">
                <View className="items-center py-2">
                  <View className="w-12 h-12 bg-success rounded-xl items-center justify-center mb-3">
                    <Activity size={24} color="white" />
                  </View>
                  <Text className="text-xs font-medium text-gray-600 mb-2">
                    Respiration
                  </Text>
                  <Text className={`text-lg font-bold ${getReadingColor('respiration', respirationReading?.value || null)}`}>
                    {respirationReading?.value ? `${respirationReading.value}/min` : '--'}
                  </Text>
                </View>
              </Card>
            </View>
          )}
        </View>

        {/* C1001 Comprehensive Data */}
        {sensorData && (
          <View className="mb-8">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              C1001 Sensor Data
            </Text>
            
            {/* Sleep Mode Comprehensive Data */}
            {activeMode?.id === 'sleep' && sensorData.sleepComposite && (
              <View className="gap-y-4">
                {/* Sleep Composite Status */}
                <Card variant="outlined">
                  <View className="p-4">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">
                      Comprehensive Sleep Status
                    </Text>
                    <View className="grid grid-cols-2 gap-3">
                      <View className="flex-row items-center">
                        <Moon size={20} color="#666" className="mr-2" />
                        <Text className="text-sm text-gray-600">Sleep State:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.sleepComposite.sleepState === 0 ? 'Deep' :
                           sensorData.sleepComposite.sleepState === 1 ? 'Light' :
                           sensorData.sleepComposite.sleepState === 2 ? 'Awake' : 'None'}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Activity size={20} color="#666" className="mr-2" />
                        <Text className="text-sm text-gray-600">Turns:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.sleepComposite.turnoverNumber}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Heart size={20} color="#666" className="mr-2" />
                        <Text className="text-sm text-gray-600">Avg HR:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.sleepComposite.averageHeartbeat} bpm
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Activity size={20} color="#666" className="mr-2" />
                        <Text className="text-sm text-gray-600">Avg Resp:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.sleepComposite.averageRespiration}/min
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>

                {/* Sleep Statistics */}
                {sensorData.sleepStatistics && (
                  <Card variant="outlined">
                    <View className="p-4">
                      <Text className="text-lg font-semibold text-gray-900 mb-3">
                        Sleep Statistics
                      </Text>
                      <View className="grid grid-cols-2 gap-3">
                        <View className="flex-row items-center">
                          <Text className="text-sm text-gray-600">Quality Score:</Text>
                          <Text className="text-sm font-semibold text-primary-accent ml-2">
                            {sensorData.sleepStatistics.sleepQualityScore}%
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Text className="text-sm text-gray-600">Deep Sleep:</Text>
                          <Text className="text-sm font-semibold text-gray-900 ml-2">
                            {sensorData.sleepStatistics.deepSleepPercentage}%
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Text className="text-sm text-gray-600">Light Sleep:</Text>
                          <Text className="text-sm font-semibold text-gray-900 ml-2">
                            {sensorData.sleepStatistics.shallowSleepPercentage}%
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Text className="text-sm text-gray-600">Awake:</Text>
                          <Text className="text-sm font-semibold text-gray-900 ml-2">
                            {sensorData.sleepStatistics.sleepTime}%
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Text className="text-sm text-gray-600">Out of Bed:</Text>
                          <Text className="text-sm font-semibold text-gray-900 ml-2">
                            {sensorData.sleepStatistics.timeOutOfBed}min
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Text className="text-sm text-gray-600">Exit Count:</Text>
                          <Text className="text-sm font-semibold text-gray-900 ml-2">
                            {sensorData.sleepStatistics.exitCount}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                )}

                {/* Sleep Disturbances */}
                {sensorData.sleepData && (
                  <Card variant="outlined">
                    <View className="p-4">
                      <Text className="text-lg font-semibold text-gray-900 mb-3">
                        Sleep Analysis
                      </Text>
                      <View className="gap-y-2">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-600">Apnea Events:</Text>
                          <Text className="text-sm font-semibold text-gray-900">
                            {sensorData.sleepComposite.apneaEvents}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-600">Large Movements:</Text>
                          <Text className="text-sm font-semibold text-gray-900">
                            {sensorData.sleepComposite.largeBodyMove}%
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-600">Minor Movements:</Text>
                          <Text className="text-sm font-semibold text-gray-900">
                            {sensorData.sleepComposite.minorBodyMove}%
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-600">Abnormal Struggle:</Text>
                          <Text className={`text-sm font-semibold ${
                            sensorData.sleepData.abnormalStruggle === 2 ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {sensorData.sleepData.abnormalStruggle === 0 ? 'None' :
                             sensorData.sleepData.abnormalStruggle === 1 ? 'Normal' : 'Abnormal'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                )}
              </View>
            )}

            {/* Fall Mode Comprehensive Data */}
            {activeMode?.id === 'fall' && sensorData.fallData && (
              <View className="gap-y-4">
                {/* Fall Detection Status */}
                <Card variant="outlined">
                  <View className="p-4">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">
                      Fall Detection Status
                    </Text>
                    <View className="grid grid-cols-2 gap-3">
                      <View className="flex-row items-center">
                        <Shield size={20} color="#666" className="mr-2" />
                        <Text className="text-sm text-gray-600">Fall Status:</Text>
                        <Text className={`text-sm font-semibold ml-2 ${
                          sensorData.fallData.fallState === 1 ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {sensorData.fallData.fallState === 1 ? 'FALLEN' : 'Safe'}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <User size={20} color="#666" className="mr-2" />
                        <Text className="text-sm text-gray-600">Presence:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.humanData.presence === 1 ? 'Present' : 'Absent'}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Zap size={20} color="#666" className="mr-2" />
                        <Text className="text-sm text-gray-600">Movement:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.humanData.movement === 0 ? 'None' :
                           sensorData.humanData.movement === 1 ? 'Still' : 'Active'}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Activity size={20} color="#666" className="mr-2" />
                        <Text className="text-sm text-gray-600">Stationary:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.fallData.staticResidencyState === 1 ? 'Yes' : 'No'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>

                {/* Fall Detection Configuration */}
                <Card variant="outlined">
                  <View className="p-4">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">
                      Detection Configuration
                    </Text>
                    <View className="grid grid-cols-2 gap-3">
                      <View className="flex-row items-center">
                        <Text className="text-sm text-gray-600">Install Height:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.fallData.installHeight}cm
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-sm text-gray-600">Fall Time:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.fallData.fallTime}s
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-sm text-gray-600">Unmanned Time:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.fallData.unmannedTime}s
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-sm text-gray-600">Sensitivity:</Text>
                        <Text className="text-sm font-semibold text-gray-900 ml-2">
                          {sensorData.fallData.fallSensitivity}/3
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>

                {/* Movement Analysis */}
                <Card variant="outlined">
                  <View className="p-4">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">
                      Movement Analysis
                    </Text>
                    <View className="gap-y-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-gray-600">Movement Range:</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {sensorData.humanData.movingRange}%
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-gray-600">Heart Rate:</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {sensorData.heartRate} bpm
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-gray-600">Respiration Rate:</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {sensorData.respirationRate}/min
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
            </View>
          )}
        </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HealthScreen;
