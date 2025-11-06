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
  // Store step 1 values to ensure they persist
  const [step1Values, setStep1Values] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const {
    control,
    handleSubmit,
    watch,
    getValues,
    formState: { errors },
    trigger,
    setValue,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
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
      // Get and verify values are stored before moving to step 2
      const step1Values = getValues();
      console.log('✅ Step 1 validated. Stored values:', {
        email: step1Values.email,
        password: step1Values.password ? '***' : undefined,
        confirmPassword: step1Values.confirmPassword ? '***' : undefined,
      });
      
      // Explicitly ensure values are stored by setting them again
      // This ensures they persist even when Controllers unmount
      if (step1Values.email) {
        setValue('email', step1Values.email, { shouldValidate: false });
      }
      if (step1Values.password) {
        setValue('password', step1Values.password, { shouldValidate: false });
      }
      if (step1Values.confirmPassword) {
        setValue('confirmPassword', step1Values.confirmPassword, { shouldValidate: false });
      }
      
      // Verify again after setting
      const verifiedValues = getValues();
      console.log('✅ Values after explicit set:', {
        email: verifiedValues.email,
        hasPassword: !!verifiedValues.password,
        hasConfirmPassword: !!verifiedValues.confirmPassword,
      });
      
      // Store step 1 values in component state as backup
      setStep1Values({
        email: verifiedValues.email,
        password: verifiedValues.password,
        confirmPassword: verifiedValues.confirmPassword,
      });
      
      setCurrentStep(2);
    } else {
      console.log('❌ Step 1 validation failed');
      console.log('📋 Step 1 errors:', {
        email: errors.email?.message,
        password: errors.password?.message,
        confirmPassword: errors.confirmPassword?.message,
      });
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    console.log('🚀 onSubmit called with data:', { 
      email: data.email, 
      username: data.username, 
      fullName: data.fullName,
      hasPassword: !!data.password 
    });
    
    setIsLoading(true);
    console.log('⏳ Loading state set to true');
    
    try {
      console.log('📞 Calling signUp service...');
      const result = await signUp({
        email: data.email,
        password: data.password,
        username: data.username,
        full_name: data.fullName,
      });
      
      console.log('✅ signUp result:', result);
      
      if (!result) {
        console.error('❌ No result returned from signUp');
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        return;
      }
      
      if (result.error) {
        console.error('❌ Signup error:', result.error);
        Alert.alert('Signup Failed', result.error);
      } else if (result.success) {
        console.log('✅ Signup successful');
        Alert.alert(
          'Success',
          'Please check your email for a confirmation link to complete your registration.',
          [{ text: 'OK', onPress: onSwitchToLogin }]
        );
      }
    } catch (error) {
      console.error('❌ Signup error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      console.log('🏁 Setting loading to false');
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View className="w-full px-2">
      <View className="items-center mb-8">
        <Text className="text-4xl font-bold text-gray-900 mb-2">
          Create Account
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
                <View className="absolute left-4 top-6 z-10">
                  <Mail size={20} color="#9CA3AF" />
                </View>
                <Input
                  placeholder="Enter your email address"
                  value={value || ''}
                  onChangeText={(text) => {
                    console.log('📧 Email onChange:', text);
                    onChange(text);
                  }}
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
                <View className="absolute left-4 top-6 z-10">
                  <Lock size={20} color="#9CA3AF" />
                </View>
                <Input
                  placeholder="Create a strong password"
                  value={value || ''}
                  onChangeText={(text) => {
                    console.log('🔒 Password onChange:', text ? '***' : '');
                    onChange(text);
                  }}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  error={errors.password?.message}
                  className="pl-12 pr-12 h-16 text-lg"
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

        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Confirm Password
          </Text>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="relative">
                <View className="absolute left-4 top-6 z-10">
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
                  className="absolute right-4 top-6 z-10"
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
                <View className="absolute left-4 top-6 z-10">
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
                <View className="absolute left-4 top-6 z-10">
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

        <View className="flex-row">
          <Button
            title="Back"
            onPress={() => setCurrentStep(1)}
            variant="outline"
            size="lg"
          />
          <Button
            title={isLoading ? "Creating Account..." : "Create Account"}
            onPress={async () => {
              console.log('🔘 Create Account button pressed');
              
              // Validate step 2 fields first
              const step2Valid = await trigger(['username', 'fullName']);
              if (!step2Valid) {
                console.log('❌ Step 2 validation failed');
                return;
              }
              
              // Get all form values
              let allValues = getValues();
              
              // If step 1 values are missing, use stored values
              if (!allValues.email || !allValues.password) {
                console.log('⚠️ Step 1 values missing, using stored values');
                allValues = {
                  ...allValues,
                  email: allValues.email || step1Values.email || '',
                  password: allValues.password || step1Values.password || '',
                  confirmPassword: allValues.confirmPassword || step1Values.confirmPassword || '',
                };
                
                // Set the values back into the form
                if (step1Values.email) setValue('email', step1Values.email, { shouldValidate: false });
                if (step1Values.password) setValue('password', step1Values.password, { shouldValidate: false });
                if (step1Values.confirmPassword) setValue('confirmPassword', step1Values.confirmPassword, { shouldValidate: false });
                
                // Get values again after setting
                allValues = getValues();
              }
              
              console.log('📋 All form values:', {
                email: allValues.email,
                username: allValues.username,
                fullName: allValues.fullName,
                hasPassword: !!allValues.password,
                hasConfirmPassword: !!allValues.confirmPassword,
              });
              
              // Validate all fields before submitting
              const allValid = await trigger();
              if (!allValid) {
                console.log('❌ Full form validation failed');
                console.log('📋 Form errors:', errors);
                return;
              }
              
              // Submit the form
              await onSubmit(allValues);
            }}
            variant="primary"
            size="lg"
            className="flex-1 ml-4"
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
