import { z } from 'zod';

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    newPassword: z.string().min(8),
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
