import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../contexts/auth-context';
import { AppQueryProvider } from './query-provider';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppQueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </AppQueryProvider>
    </GestureHandlerRootView>
  );
};
