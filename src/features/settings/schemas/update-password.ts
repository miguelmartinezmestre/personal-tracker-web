import { z } from 'zod';
import { STRONG_PASSWORD_REGEX } from '@shared/password-policy';

interface UpdatePasswordValidationMessages {
    weakPassword: string;
    passwordsDontMatch: string;
}

export function createUpdatePasswordSchema(messages: UpdatePasswordValidationMessages) {
    return z
        .object({
            currentPassword: z.string().min(8),
            confirmPassword: z.string().min(8),
            newPassword: z.string().min(8),
        })
        .superRefine((values, ctx) => {
            if (values.newPassword.length >= 8 && !STRONG_PASSWORD_REGEX.test(values.newPassword)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['newPassword'],
                    message: messages.weakPassword,
                });
            }

            if (values.newPassword !== values.confirmPassword) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['confirmPassword'],
                    message: messages.passwordsDontMatch,
                });
            }
        });
}

export type UpdatePasswordFormValues = z.infer<ReturnType<typeof createUpdatePasswordSchema>>;
