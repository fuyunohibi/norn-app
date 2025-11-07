import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useAuth } from '../../../contexts/auth-context';
import { LoginFormData, loginSchema } from '../validations/auth.schema';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup }) => {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await signIn({ email: data.email, password: data.password });
      
      if (result?.error) {
        Alert.alert('Login Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="w-full px-2">
      <View className="items-center mb-8">
        <Text className="text-4xl font-hell-round-bold text-gray-900 mb-2 ">
          Welcome Back
        </Text>
        <Text className="text-lg text-gray-600 text-center font-hell">
          Sign in to your NORN account
        </Text>
      </View>

      <View className="gap-y-6">
        <View>
          <Text className="text-lg font-hell-round-bold text-gray-900 mb-3 ">
            Email Address
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="relative">
                <View className="absolute left-4 top-6 z-10">
                  <Mail size={20} color="#9CA3AF" strokeWidth={2.5} />
                </View>
                <Input
                  placeholder="Enter your email address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  className="pl-12 h-16 text-lg font-hell"
                />
              </View>
            )}
          />
        </View>

        <View>
          <Text className="text-lg font-hell-round-bold text-gray-900 mb-3 ">
            Password
          </Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="relative">
                <View className="absolute left-4 top-6 z-10">
                  <Lock size={20} color="#9CA3AF" strokeWidth={2.5} />
                </View>
                <Input
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  error={errors.password?.message}
                  className="pl-12 pr-12 h-16 text-lg font-hell rounded-[18px]"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-6 z-10"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        </View>

        <Button
          title="Sign In"
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          size="lg"
          className="w-full mt-8"
          disabled={isLoading}
        />

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600 text-lg font-hell">
            Don't have an account?{" "}
          </Text>
          <Text
            className="text-primary-accent font-hell-round-bold text-lg "
            onPress={onSwitchToSignup}
          >
            Create Account
          </Text>
        </View>
      </View>
    </View>
  );
};
