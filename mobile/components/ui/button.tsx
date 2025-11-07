import React from 'react';
import { Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { cn } from '../../utils/cn';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
  style,
  textStyle,
}) => {
  const baseClasses = 'rounded-full items-center justify-center';
  
  const variantClasses = {
    primary: 'bg-primary-button',
    secondary: 'bg-secondary-button',
    outline: 'border-2 border-primary-button bg-transparent',
  };
  
  const sizeClasses = {
    sm: 'px-4 py-4',
    md: 'px-6 py-5',
    lg: 'px-8 py-6',
  };
  
  const textVariantClasses = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-primary-button',
  };
  
  const textSizeClasses = {
    sm: 'text-sm font-hell font-medium',
    md: 'text-base font-hell-round-bold',
    lg: 'text-lg font-hell-round-bold',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50',
        className
      )}
      style={style}
    >
      <Text
        className={cn(
          textVariantClasses[variant],
          textSizeClasses[size],
          disabled && 'opacity-70'
        )}
        style={textStyle}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};
