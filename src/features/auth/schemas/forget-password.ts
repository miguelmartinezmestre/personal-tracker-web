import { z } from 'zod';

interface ForgetPasswordValidationMessages {
    invalidEmail: string;
}

export function createForgetPasswordSchema(messages: ForgetPasswordValidationMessages) {
    return z.object({
        email: z.email({ error: messages.invalidEmail }),
    });
}

export type ForgetPasswordFormValues = z.infer<ReturnType<typeof createForgetPasswordSchema>>;
