import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail, User, UserCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useAuth } from '../../../contexts/auth-context';
import { SignupFormData, signupSchema } from '../validations/auth.schema';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
    setValue,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      fullName: '',
    },
  });

  const password = watch('password');

  const validateStep1 = async () => {
    const isValid = await trigger(['email', 'password', 'confirmPassword']);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const result = await signUp({
        email: data.email,
        password: data.password,
        username: data.username,
        full_name: data.fullName,
      });
      
      if (result.error) {
        Alert.alert('Signup Failed', result.error);
      } else if (result.success) {
        Alert.alert(
          'Success',
          'Please check your email for a confirmation link to complete your registration.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View className="w-full px-2">
      <View className="items-center mb-8">
        <Text className="text-4xl font-bold text-gray-900 mb-2">
          Create Account
        </Text>
        <Text className="text-lg text-gray-600 text-center">
          Step 1 of 2: Basic Information
        </Text>
      </View>
      
      <View className="gap-y-6">
        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Email Address
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="relative">
                <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Mail size={20} color="#9CA3AF" />
                </View>
                <Input
                  placeholder="Enter your email address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  className="pl-12 h-16 text-lg"
                />
              </View>
            )}
          />
        </View>

        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Password
          </Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="relative">
                <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Lock size={20} color="#9CA3AF" />
                </View>
                <Input
                  placeholder="Create a strong password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  error={errors.password?.message}
                  className="pl-12 pr-12 h-16 text-lg"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10"
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

        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Confirm Password
          </Text>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="relative">
                <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Lock size={20} color="#9CA3AF" />
                </View>
                <Input
                  placeholder="Confirm your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showConfirmPassword}
                  error={errors.confirmPassword?.message}
                  className="pl-12 pr-12 h-16 text-lg"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10"
                >
                  {showConfirmPassword ? (
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
          title="Continue"
          onPress={validateStep1}
          variant="primary"
          size="lg"
          className="w-full mt-8"
          disabled={isLoading}
        />

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600 text-lg">Already have an account? </Text>
          <Text
            className="text-primary-accent font-semibold text-lg"
            onPress={onSwitchToLogin}
          >
            Sign In
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View className="w-full px-2">
      <View className="items-center mb-8">
        <Text className="text-4xl font-bold text-gray-900 mb-2">
          Personal Details
        </Text>
        <Text className="text-lg text-gray-600 text-center">
          Step 2 of 2: Complete your profile
        </Text>
      </View>
      
      <View className="gap-y-6">
        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Full Name
          </Text>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="relative">
                <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <UserCheck size={20} color="#9CA3AF" />
                </View>
                <Input
                  placeholder="Enter your full name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  error={errors.fullName?.message}
                  className="pl-12 h-16 text-lg"
                />
              </View>
            )}
          />
        </View>

        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Username
          </Text>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="relative">
                <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <User size={20} color="#9CA3AF" />
                </View>
                <Input
                  placeholder="Choose a unique username"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  error={errors.username?.message}
                  className="pl-12 h-16 text-lg"
                />
              </View>
            )}
          />
        </View>

        <View className="flex-row space-x-4">
          <Button
            title="Back"
            onPress={() => setCurrentStep(1)}
            variant="outline"
            size="lg"
            className="flex-1 h-16"
          />
          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            size="lg"
            className="flex-1 h-16"
            disabled={isLoading}
          />
        </View>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600 text-lg">Already have an account? </Text>
          <Text
            className="text-primary-accent font-semibold text-lg"
            onPress={onSwitchToLogin}
          >
            Sign In
          </Text>
        </View>
      </View>
    </View>
  );

  return currentStep === 1 ? renderStep1() : renderStep2();
};
