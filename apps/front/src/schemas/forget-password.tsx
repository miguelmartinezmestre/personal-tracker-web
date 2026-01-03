import { z } from 'zod';

export const forgetPasswordSchema = z.object({
    email: z.string().email(),
});

export type ForgetPasswordSchema = z.infer<typeof forgetPasswordSchema>;
