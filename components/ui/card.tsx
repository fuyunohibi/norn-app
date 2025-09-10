import React from 'react';
import { View, ViewStyle } from 'react-native';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  style,
  variant = 'default',
}) => {
  const baseClasses = 'bg-white rounded-3xl';
  
  const variantClasses = {
    default: 'p-4',
    elevated: 'p-4 shadow-soft',
    outlined: 'p-4 border border-gray-200',
  };

  return (
    <View
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
    >
      {children}
    </View>
  );
};
