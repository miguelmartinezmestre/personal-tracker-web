import { z } from 'zod';
import {
    STRONG_PASSWORD_MESSAGE_ES,
    STRONG_PASSWORD_REGEX,
} from '@/convex/platform/auth/passwordPolicy';

export const resetPasswordSchema = z
    .object({
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
        resetPasswordKey: z.string().min(1),
    })
    .superRefine((values, ctx) => {
        if (values.password.length >= 8 && !STRONG_PASSWORD_REGEX.test(values.password)) {
            ctx.addIssue({
                code: 'custom',
                path: ['password'],
                message: STRONG_PASSWORD_MESSAGE_ES,
            });
        }

        if (values.password !== values.confirmPassword) {
            ctx.addIssue({
                code: 'custom',
                path: ['confirmPassword'],
                message: 'Las contraseñas no coinciden',
            });
        }
    });
