import { z } from "zod";


export const resetPasswordSchema = z.object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    resetPasswordKey: z.string().min(1),
});

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
