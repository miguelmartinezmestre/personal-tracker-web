import { z } from 'zod';
import { STRONG_PASSWORD_REGEX } from '@/convex/features/auth/passwordPolicy';

type SettingsValidationKey =
    | 'nameRequired'
    | 'passwordRequired'
    | 'shortPassword'
    | 'weakPassword'
    | 'passwordsDontMatch'
    | 'passwordUnchanged';

export function profileSchema(message: (key: SettingsValidationKey) => string) {
    return z.object({
        name: z
            .string()
            .trim()
            .min(1, { error: message('nameRequired') }),
    });
}

export type ProfileFormValues = z.infer<ReturnType<typeof profileSchema>>;

export function passwordSchema(message: (key: SettingsValidationKey) => string) {
    return z
        .object({
            currentPassword: z.string().min(1, { error: message('passwordRequired') }),
            newPassword: z
                .string()
                .min(8, { error: message('shortPassword') })
                .regex(STRONG_PASSWORD_REGEX, { error: message('weakPassword') }),
            confirmPassword: z.string(),
        })
        .superRefine((values, ctx) => {
            if (values.newPassword !== values.confirmPassword) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['confirmPassword'],
                    message: message('passwordsDontMatch'),
                });
            }

            if (values.newPassword && values.newPassword === values.currentPassword) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['newPassword'],
                    message: message('passwordUnchanged'),
                });
            }
        });
}

export type PasswordFormValues = z.infer<ReturnType<typeof passwordSchema>>;
