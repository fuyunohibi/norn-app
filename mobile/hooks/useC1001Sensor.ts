import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { c1001SensorService } from '../services/c1001-sensor.service';
import { useModeStore } from '../stores/mode.store';

export const useC1001Sensor = () => {
  const { activeMode } = useModeStore();

  // Update sensor mode when active mode changes
  useEffect(() => {
    if (activeMode) {
      const sensorMode = activeMode.id === 'sleep' ? 'sleep' : 'fall';
      c1001SensorService.setMode(sensorMode);
    }
  }, [activeMode]);

  const sensorDataQuery = useQuery({
    queryKey: ['c1001-sensor-data', activeMode?.id],
    queryFn: () => c1001SensorService.getSensorData(),
    refetchInterval: 2000, // Update every 2 seconds
    enabled: !!activeMode,
  });

  const sensorConfigQuery = useQuery({
    queryKey: ['c1001-sensor-config'],
    queryFn: () => c1001SensorService.getSensorConfig(),
    enabled: !!activeMode,
  });

  return {
    data: sensorDataQuery.data,
    config: sensorConfigQuery.data,
    isLoading: sensorDataQuery.isLoading,
    error: sensorDataQuery.error,
    refetch: sensorDataQuery.refetch,
  };
};
