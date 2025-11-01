import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { AlertTriangle, Moon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useModeStore } from '../../stores/mode.store';

interface Mode {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface ModeSelectorProps {
  isVisible: boolean;
  onClose: () => void;
}

const ModeSelector = ({ isVisible, onClose }: ModeSelectorProps) => {
  const { modes, setActiveMode } = useModeStore();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '75%'], []);

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

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleModeSelect = (mode: Mode) => {
    setActiveMode(mode.id);
    onClose();
  };

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={{ 
        backgroundColor: 'white',
        borderTopLeftRadius: 38,
        borderTopRightRadius: 38,
      }}
      handleIndicatorStyle={{ 
        backgroundColor: '#D1D5DB',
        width: 40,
        height: 4,
      }}
    >
      <BottomSheetView className="flex-1 px-6">
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900">
            Select Mode
          </Text>
        </View>
        
        <View className="gap-y-3">
          {modes?.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              onPress={() => handleModeSelect(mode)}
              className={`p-4 rounded-2xl border-2 ${
                mode.isActive 
                  ? 'border-primary-accent bg-primary-accent/10' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <View className="flex-row items-center">
                <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                  mode.isActive ? 'bg-primary-accent' : 'bg-gray-100'
                }`}>
                  {getModeIcon(mode.id)}
                </View>
                <View className="flex-1">
                  <Text className={`text-lg font-semibold ${
                    mode.isActive ? 'text-primary-accent' : 'text-gray-900'
                  }`}>
                    {mode.name}
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    {mode.description}
                  </Text>
                </View>
                {mode.isActive && (
                  <Text className="text-primary-accent text-lg">✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default ModeSelector;
