import { z } from 'zod';
import { PASSWORD_REGEX, USERNAME_REGEX } from '../../../constants/regex.constant';

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

// Signup step 1 validation schema (basic info)
export const signupStep1Schema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(PASSWORD_REGEX, 'Password must contain at least one letter and one number or symbol'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Signup step 2 validation schema (personal details)
export const signupStep2Schema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(USERNAME_REGEX, 'Username can only contain lowercase letters, numbers, underscores, and dots. Must contain at least one letter'),
});

// Complete signup validation schema
export const signupSchema = signupStep1Schema.merge(signupStep2Schema);

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupStep1FormData = z.infer<typeof signupStep1Schema>;
export type SignupStep2FormData = z.infer<typeof signupStep2Schema>;
export type SignupFormData = z.infer<typeof signupSchema>;
