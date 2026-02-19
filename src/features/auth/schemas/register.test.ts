import { describe, expect, it } from 'vitest';
import { registerSchema } from './register';

describe('registerSchema', () => {
    it('accepts a valid payload with organization slug', () => {
        const result = registerSchema.safeParse({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
            organizationSlug: 'my-org',
        });

        expect(result.success).toBe(true);
    });

    it('accepts a valid payload without organization slug', () => {
        const result = registerSchema.safeParse({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
        });

        expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
        const result = registerSchema.safeParse({
            username: 'testuser',
            email: 'bad-email',
            password: 'password123',
            confirmPassword: 'password123',
            organizationSlug: 'my-org',
        });

        expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
        const result = registerSchema.safeParse({
            username: 'testuser',
            email: 'test@example.com',
            password: 'short',
            confirmPassword: 'short',
            organizationSlug: 'my-org',
        });

        expect(result.success).toBe(false);
    });

    it('rejects password mismatch', () => {
        const result = registerSchema.safeParse({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password456',
            organizationSlug: 'my-org',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some(issue => issue.path[0] === 'confirmPassword')).toBe(
                true
            );
        }
    });

    it('rejects invalid organization slug format', () => {
        const result = registerSchema.safeParse({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
            organizationSlug: 'Invalid Slug',
        });

        expect(result.success).toBe(false);
    });
});
