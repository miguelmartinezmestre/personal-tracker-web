import { z } from 'zod';
import {
    isSetupSecretLengthValid,
    MAX_SETUP_SECRET_LENGTH,
    MIN_SETUP_SECRET_LENGTH,
} from '@/convex/shared/env';
import { STRONG_PASSWORD_REGEX } from '@/convex/features/auth/passwordPolicy';

export const platformConfigSchema = z.object({
    platformName: z.string().min(1),
    defaultLanguage: z.enum(['en', 'es']),
});

type AdminAccountSchemaMessages = {
    setupSecretInvalidLength: string;
    weakPassword: string;
    passwordsDontMatch: string;
    invalidEmail: string;
    nameRequired: string;
    shortPassword: string;
};

export function createAdminAccountSchema(messages?: Partial<AdminAccountSchemaMessages>) {
    return z
        .object({
            username: z.string().trim().min(1, { error: messages?.nameRequired }),
            email: z.email({ error: messages?.invalidEmail }),
            password: z.string().min(8, { error: messages?.shortPassword }),
            confirmPassword: z.string().min(8, { error: messages?.shortPassword }),
            setupSecret: z
                .string()
                .max(MAX_SETUP_SECRET_LENGTH)
                .refine(isSetupSecretLengthValid, {
                    message:
                        messages?.setupSecretInvalidLength ??
                        `SETUP_SECRET must contain between ${MIN_SETUP_SECRET_LENGTH} and ${MAX_SETUP_SECRET_LENGTH} characters when provided`,
                }),
        })
        .superRefine((values, ctx) => {
            if (values.password.length >= 8 && !STRONG_PASSWORD_REGEX.test(values.password)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['password'],
                    message:
                        messages?.weakPassword ??
                        'Password must include at least one uppercase letter, one lowercase letter, and one number',
                });
            }

            if (values.password !== values.confirmPassword) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['confirmPassword'],
                    message: messages?.passwordsDontMatch ?? 'Passwords do not match',
                });
            }
        });
}

export const adminAccountSchema = createAdminAccountSchema();

export const organizationSchema = z.object({
    name: z.string().min(1),
    logo: z.url().optional().or(z.literal('')),
});

export const registrationPolicySchema = z.object({
    policy: z.enum(['open', 'invitation-only']),
});

export type PlatformConfig = z.infer<typeof platformConfigSchema>;

export type AdminAccount = z.infer<typeof adminAccountSchema>;

export type OrganizationConfig = z.infer<typeof organizationSchema>;

export type RegistrationPolicy = z.infer<typeof registrationPolicySchema>;
