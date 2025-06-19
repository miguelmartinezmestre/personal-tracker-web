import { z } from 'zod';

export const updatePasswordSchema = z.object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    newPassword: z.string().min(8),
});
