import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { LoginForm } from '../../modules/auth/components/login-form';
import { SignupForm } from '../../modules/auth/components/signup-form';


const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        <View className="flex-1 justify-center py-12">
          {isLogin ? (
            <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
          ) : (
            <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AuthScreen;