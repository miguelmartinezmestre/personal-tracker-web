import { z } from 'zod';
import { STRONG_PASSWORD_REGEX } from '@shared/password-policy';

interface RegisterValidationMessages {
    weakPassword: string;
    passwordsDontMatch: string;
}

export function createRegisterSchema(messages: RegisterValidationMessages) {
    return z
        .object({
            email: z.string().email(),
            password: z.string().min(8),
            confirmPassword: z.string().min(8),
            username: z.string().min(3),
        })
        .superRefine((values, ctx) => {
            if (values.password.length >= 8 && !STRONG_PASSWORD_REGEX.test(values.password)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['password'],
                    message: messages.weakPassword,
                });
            }

            if (values.password !== values.confirmPassword) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['confirmPassword'],
                    message: messages.passwordsDontMatch,
                });
            }
        });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
