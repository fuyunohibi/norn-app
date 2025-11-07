import React from 'react';
import { Text, TextInput, TextInputProps, TextStyle, View } from 'react-native';
import { cn } from '../../utils/cn';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
  style?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  containerClassName,
  style,
  ...props
}) => {
  return (
    <View className={cn('mb-4', containerClassName)}>
      {label && (
        <Text className="text-gray-700 text-sm font-hell font-medium mb-2 font-hell">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          'border border-gray-300 rounded-2xl px-4 py-4 text-base bg-white',
          error && 'border-primary-accent',
          className
        )}
        style={[
          {
            minHeight: 60,
            fontSize: 16,
          },
          style
        ]}
        placeholderTextColor="#9E9E9E"
        {...props}
      />
      {error && (
        <Text className="text-primary-accent text-sm font-hell mt-1">
          {error}
        </Text>
      )}
    </View>
  );
};
