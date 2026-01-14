import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/schemas/login';

describe('loginSchema', () => {
    it('should validate a valid login', () => {
        const validLogin = {
            email: 'test@example.com',
            password: 'password123',
        };

        const result = loginSchema.safeParse(validLogin);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe('test@example.com');
            expect(result.data.password).toBe('password123');
        }
    });

    it('should require email', () => {
        const invalidLogin = {
            password: 'password123',
        };

        const result = loginSchema.safeParse(invalidLogin);
        expect(result.success).toBe(false);
        if (!result.success) {
            const emailError = result.error.issues.find((issue: { path: (string | number | symbol)[] }) => issue.path.includes('email'));
            expect(emailError).toBeDefined();
        }
    });

    it('should require password', () => {
        const invalidLogin = {
            email: 'test@example.com',
        };

        const result = loginSchema.safeParse(invalidLogin);
        expect(result.success).toBe(false);
        if (!result.success) {
            const passwordError = result.error.issues.find(issue =>
                issue.path.includes('password')
            );
            expect(passwordError).toBeDefined();
        }
    });

    it('should validate email format', () => {
        const invalidLogin = {
            email: 'not-an-email',
            password: 'password123',
        };

        const result = loginSchema.safeParse(invalidLogin);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.message).toMatch(/email/i);
        }
    });

    it('should accept valid email formats', () => {
        const validEmails = ['test@example.com', 'user.name@example.co.uk', 'user+tag@example.com'];

        validEmails.forEach(email => {
            const result = loginSchema.safeParse({
                email,
                password: 'password123',
            });
            expect(result.success).toBe(true);
        });
    });
});
