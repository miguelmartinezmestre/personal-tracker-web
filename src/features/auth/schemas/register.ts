import { z } from 'zod';

export const registerSchema = z
    .object({
        email: z.string().email(),
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
        username: z.string().min(3),
        organizationSlug: z
            .string()
            .min(3, 'Organization slug must be at least 3 characters')
            .max(30, 'Organization slug must be at most 30 characters')
            .regex(
                /^[a-z0-9-]+$/,
                'Organization slug can only contain lowercase letters, numbers, and hyphens'
            )
            .optional(),
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
