import { describe, it, expect } from 'vitest';
import { formSchema } from '@/schemas/recover-password';

describe('recoverPasswordSchema (formSchema)', () => {
    it('should validate a valid email', () => {
        const validForm = {
            email: 'test@example.com',
        };

        const result = formSchema.safeParse(validForm);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe('test@example.com');
        }
    });

    it('should require email', () => {
        const invalidForm = {};

        const result = formSchema.safeParse(invalidForm);
        expect(result.success).toBe(false);
        if (!result.success) {
            const emailError = result.error.issues.find((issue: { path: (string | number | symbol)[] }) => issue.path.includes('email'));
            expect(emailError).toBeDefined();
        }
    });

    it('should validate email format', () => {
        const invalidForm = {
            email: 'not-an-email',
        };

        const result = formSchema.safeParse(invalidForm);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.message).toBe('email is required');
        }
    });

    it('should reject empty email', () => {
        const invalidForm = {
            email: '',
        };

        const result = formSchema.safeParse(invalidForm);
        expect(result.success).toBe(false);
    });

    it('should accept various valid email formats', () => {
        const validEmails = [
            'test@example.com',
            'user.name@example.co.uk',
            'user+tag@example.com',
            'user123@test.org',
        ];

        validEmails.forEach(email => {
            const result = formSchema.safeParse({ email });
            expect(result.success).toBe(true);
        });
    });
});
