import React, { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { LoginForm } from '../../modules/auth/components/login-form';
import { SignupForm } from '../../modules/auth/components/signup-form';


const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);


  return (
    <View className="relative flex-1 bg-white">
      <Image
        source={require("../../assets/images/backgrounds/daytime-bg.png")}
        style={{
          width: "100%",
          height: "30%",
        }}
      />
      <View className="flex-1 w-full absolute bg-white top-64 rounded-t-[3rem]">
        <ScrollView className="flex-1 px-6">
          <View className="flex-1 justify-center py-12">
            {isLogin ? (
              <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
            ) : (
              <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default AuthScreen;