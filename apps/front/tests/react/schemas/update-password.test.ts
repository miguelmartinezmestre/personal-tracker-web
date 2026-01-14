import { describe, it, expect } from 'vitest';
import { updatePasswordSchema } from '@/schemas/update-password';

describe('updatePasswordSchema', () => {
    it('validates correct password data', () => {
        const validData = {
            password: 'currentpass123',
            confirmPassword: 'currentpass123',
            newPassword: 'newpassword123',
        };

        const result = updatePasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects password shorter than 8 characters', () => {
        const invalidData = {
            password: 'short',
            confirmPassword: 'short',
            newPassword: 'newpassword123',
        };

        const result = updatePasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects confirmPassword shorter than 8 characters', () => {
        const invalidData = {
            password: 'currentpass123',
            confirmPassword: 'short',
            newPassword: 'newpassword123',
        };

        const result = updatePasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects newPassword shorter than 8 characters', () => {
        const invalidData = {
            password: 'currentpass123',
            confirmPassword: 'currentpass123',
            newPassword: 'short',
        };

        const result = updatePasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects when password and confirmPassword do not match', () => {
        const invalidData = {
            password: 'currentpass123',
            confirmPassword: 'differentpass123',
            newPassword: 'newpassword123',
        };

        const result = updatePasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);

        if (!result.success) {
            const confirmPasswordError = result.error.issues.find((issue: { path: (string | number | symbol)[] }) =>
                issue.path.includes('confirmPassword')
            );
            expect(confirmPasswordError).toBeDefined();
        }
    });

    it('rejects missing password field', () => {
        const invalidData = {
            confirmPassword: 'currentpass123',
            newPassword: 'newpassword123',
        };

        const result = updatePasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects missing confirmPassword field', () => {
        const invalidData = {
            password: 'currentpass123',
            newPassword: 'newpassword123',
        };

        const result = updatePasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects missing newPassword field', () => {
        const invalidData = {
            password: 'currentpass123',
            confirmPassword: 'currentpass123',
        };

        const result = updatePasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('accepts password exactly 8 characters', () => {
        const validData = {
            password: '12345678',
            confirmPassword: '12345678',
            newPassword: 'newpass8',
        };

        const result = updatePasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('accepts very long passwords', () => {
        const longPassword = 'a'.repeat(100);
        const validData = {
            password: longPassword,
            confirmPassword: longPassword,
            newPassword: 'newpassword123',
        };

        const result = updatePasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects empty strings', () => {
        const invalidData = {
            password: '',
            confirmPassword: '',
            newPassword: '',
        };

        const result = updatePasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('accepts passwords with special characters', () => {
        const validData = {
            password: 'P@ssw0rd!#$%',
            confirmPassword: 'P@ssw0rd!#$%',
            newPassword: 'N3wP@ss!2024',
        };

        const result = updatePasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('accepts passwords with unicode characters', () => {
        const validData = {
            password: 'пароль123456',
            confirmPassword: 'пароль123456',
            newPassword: 'новыйпароль',
        };

        const result = updatePasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });
});
