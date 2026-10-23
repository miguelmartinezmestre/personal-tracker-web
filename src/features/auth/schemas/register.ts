import { z } from 'zod';
import { STRONG_PASSWORD_REGEX } from '@/convex/features/auth/passwordPolicy';

interface RegisterValidationMessages {
    weakPassword: string;
    passwordsDontMatch: string;
    invalidEmail?: string;
    nameRequired?: string;
    shortPassword?: string;
}

export function createRegisterSchema(messages: RegisterValidationMessages) {
    return z
        .object({
            email: z.email({ error: messages.invalidEmail }),
            password: z.string().min(8, { error: messages.shortPassword }),
            confirmPassword: z.string().min(8, { error: messages.shortPassword }),
            // Free and possibly repeated, only not blank (decision 8).
            username: z.string().trim().min(1, { error: messages.nameRequired }),
        })
        .superRefine((values, ctx) => {
            if (values.password.length >= 8 && !STRONG_PASSWORD_REGEX.test(values.password)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['password'],
                    message: messages.weakPassword,
                });
            }

            if (values.password !== values.confirmPassword) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['confirmPassword'],
                    message: messages.passwordsDontMatch,
                });
            }
        });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
