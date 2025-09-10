import { cn } from '@/utils/cn';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  className?: string;
}

const Header = ({ 
  title, 
  subtitle, 
  showBackButton = false, 
  onBackPress,
  className = ""
}: HeaderProps) => {
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View className={cn("pt-8 pb-6", className)}>
      <View className="flex-row items-center">
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBackPress}
            className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center mr-4"
          >
            <ChevronLeft size={24} color="#666" />
          </TouchableOpacity>
        )}
        
        <View className="flex-1">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-lg text-gray-600">
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default Header;
