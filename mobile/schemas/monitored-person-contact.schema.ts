import { z } from 'zod';

export const monitoredPersonContactFormSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z
    .string()
    .min(2, 'Please enter at least 2 characters')
    .max(120, 'Name is too long'),
  relationship: z
    .string()
    .trim()
    .max(60, 'Relationship is too long')
    .optional(),
  phone_number: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(/^[+]?[\d\s().-]{7,20}$/, 'Please enter a valid phone number'),
  priority: z
    .string()
    .trim()
    .min(1, 'Priority is required')
    .regex(/^\d+$/, 'Priority must be a number')
    .refine((value) => {
      const numeric = Number(value);
      return numeric >= 1 && numeric <= 5;
    }, 'Priority must be between 1 and 5'),
  is_primary: z.boolean(),
  notes: z
    .string()
    .trim()
    .max(280, 'Notes cannot exceed 280 characters')
    .optional(),
});

export type MonitoredPersonContactFormValues = z.infer<typeof monitoredPersonContactFormSchema>;
