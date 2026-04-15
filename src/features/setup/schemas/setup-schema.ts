import { z } from 'zod';
import { categoryColorSchema, categoryIconSchema } from '@/features/categories/schemas/category';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const platformConfigSchema = z.object({
    platformName: z.string().min(1).max(100),
    defaultLanguage: z.enum(['en', 'es']),
});

export const adminAccountSchema = z
    .object({
        username: z.string().min(3),
        email: z.string().email(),
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
    })
    .superRefine((values, ctx) => {
        if (values.password.length >= 8 && !STRONG_PASSWORD_REGEX.test(values.password)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['password'],
                message:
                    'Password must include at least one uppercase letter, one lowercase letter, and one number',
            });
        }

        if (values.password !== values.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['confirmPassword'],
                message: 'Passwords do not match',
            });
        }
    });

export const organizationSchema = z.object({
    name: z.string().min(1).max(100),
    logo: z.string().url().optional().or(z.literal('')),
});

export const setupCategorySchema = z.object({
    name: z.string().min(1).max(50),
    color: categoryColorSchema,
    icon: categoryIconSchema.optional(),
});

export const registrationPolicySchema = z.object({
    policy: z.enum(['open', 'invitation-only']),
});

export type PlatformConfig = z.infer<typeof platformConfigSchema>;
export type AdminAccount = z.infer<typeof adminAccountSchema>;
export type OrganizationConfig = z.infer<typeof organizationSchema>;
export type SetupCategory = z.infer<typeof setupCategorySchema>;
export type RegistrationPolicy = z.infer<typeof registrationPolicySchema>;
