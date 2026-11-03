import { z } from 'zod';

interface LoginValidationMessages {
    invalidEmail: string;
    shortPassword: string;
}

export function createLoginSchema(messages: LoginValidationMessages) {
    return z.object({
        email: z.email({ error: messages.invalidEmail }),
        password: z.string().min(8, { error: messages.shortPassword }),
    });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
