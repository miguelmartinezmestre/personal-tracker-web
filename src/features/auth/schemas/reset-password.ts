import { z } from 'zod';
import { STRONG_PASSWORD_REGEX } from '@/convex/utils';

interface ResetPasswordValidationMessages {
    weakPassword: string;
    passwordsDontMatch: string;
    shortPassword: string;
}

export function createResetPasswordSchema(messages: ResetPasswordValidationMessages) {
    return z
        .object({
            password: z.string().min(8, { error: messages.shortPassword }),
            confirmPassword: z.string().min(8, { error: messages.shortPassword }),
            resetPasswordKey: z.string().min(1),
        })
        .superRefine((values, ctx) => {
            if (values.password.length >= 8 && !STRONG_PASSWORD_REGEX.test(values.password)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['password'],
                    message: messages.weakPassword,
                });
            }

            if (values.password !== values.confirmPassword) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['confirmPassword'],
                    message: messages.passwordsDontMatch,
                });
            }
        });
}

export type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordSchema>>;
