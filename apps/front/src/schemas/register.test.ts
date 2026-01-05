import { describe, it, expect } from 'vitest';
import { registerSchema } from './register';

describe('registerSchema', () => {
    it('should validate a valid registration', () => {
        const validRegister = {
            username: 'johndoe',
            email: 'john@example.com',
            password: 'password123',
            confirmPassword: 'password123',
        };

        const result = registerSchema.safeParse(validRegister);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.username).toBe('johndoe');
            expect(result.data.email).toBe('john@example.com');
        }
    });

    it('should require username', () => {
        const invalidRegister = {
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
        };

        const result = registerSchema.safeParse(invalidRegister);
        expect(result.success).toBe(false);
    });

    it('should require username minimum length', () => {
        const invalidRegister = {
            username: 'ab',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
        };

        const result = registerSchema.safeParse(invalidRegister);
        expect(result.success).toBe(false);
    });

    it('should require email', () => {
        const invalidRegister = {
            username: 'johndoe',
            password: 'password123',
            confirmPassword: 'password123',
        };

        const result = registerSchema.safeParse(invalidRegister);
        expect(result.success).toBe(false);
    });

    it('should require password', () => {
        const invalidRegister = {
            username: 'johndoe',
            email: 'test@example.com',
            confirmPassword: 'password123',
        };

        const result = registerSchema.safeParse(invalidRegister);
        expect(result.success).toBe(false);
    });

    it('should require confirmPassword', () => {
        const invalidRegister = {
            username: 'johndoe',
            email: 'test@example.com',
            password: 'password123',
        };

        const result = registerSchema.safeParse(invalidRegister);
        expect(result.success).toBe(false);
    });

    it('should validate password minimum length', () => {
        const invalidRegister = {
            username: 'johndoe',
            email: 'test@example.com',
            password: 'short',
            confirmPassword: 'short',
        };

        const result = registerSchema.safeParse(invalidRegister);
        expect(result.success).toBe(false);
    });

    it('should require passwords to match', () => {
        const invalidRegister = {
            username: 'johndoe',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'different123',
        };

        const result = registerSchema.safeParse(invalidRegister);
        expect(result.success).toBe(false);
        if (!result.success) {
            const confirmPasswordError = result.error.issues.find(issue =>
                issue.path.includes('confirmPassword')
            );
            expect(confirmPasswordError?.message).toMatch(/coinciden/i);
        }
    });

    it('should validate email format', () => {
        const invalidRegister = {
            username: 'johndoe',
            email: 'not-an-email',
            password: 'password123',
            confirmPassword: 'password123',
        };

        const result = registerSchema.safeParse(invalidRegister);
        expect(result.success).toBe(false);
    });
});
