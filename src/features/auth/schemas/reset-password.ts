import { z } from 'zod';

export const resetPasswordSchema = z
    .object({
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
        resetPasswordKey: z.string().min(1),
    })
    .superRefine((values, ctx) => {
        if (values.password !== values.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['confirmPassword'],
                message: 'Las contraseñas no coinciden',
            });
        }
    });
