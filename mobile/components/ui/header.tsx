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
          <Text className="text-2xl font-hell-round-bold text-gray-900 ">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-sm font-hell text-gray-600 font-hell">
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default Header;
