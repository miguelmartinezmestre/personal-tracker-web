import { z } from 'zod';
import { STRONG_PASSWORD_MESSAGE_ES, STRONG_PASSWORD_REGEX } from '@shared/password-policy';
export const registerSchema = z
    .object({
        email: z.string().email(),
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
        username: z.string().min(3),
    })
    .superRefine((values, ctx) => {
        if (values.password.length >= 8 && !STRONG_PASSWORD_REGEX.test(values.password)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['password'],
                message: STRONG_PASSWORD_MESSAGE_ES,
            });
        }

        if (values.password !== values.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['confirmPassword'],
                message: 'Las contraseñas no coinciden',
            });
        }
    });
