import { z } from 'zod';
import { STRONG_PASSWORD_MESSAGE_ES, STRONG_PASSWORD_REGEX } from '@shared/password-policy';

export const updatePasswordSchema = z
    .object({
        currentPassword: z.string().min(8),
        confirmPassword: z.string().min(8),
        newPassword: z.string().min(8),
    })
    .superRefine((values, ctx) => {
        if (values.newPassword.length >= 8 && !STRONG_PASSWORD_REGEX.test(values.newPassword)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['newPassword'],
                message: STRONG_PASSWORD_MESSAGE_ES,
            });
        }

        if (values.newPassword !== values.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['confirmPassword'],
                message: 'Las contraseñas no coinciden',
            });
        }
    });
