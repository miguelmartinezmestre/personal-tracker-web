import { describe, expect, it } from 'vitest';
import { forgetPasswordSchema } from './forget-password';

describe('forgetPasswordSchema', () => {
    it('accepts valid email', () => {
        const result = forgetPasswordSchema.safeParse({
            email: 'user@example.com',
        });

        expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
        const result = forgetPasswordSchema.safeParse({
            email: 'invalid-email',
        });

        expect(result.success).toBe(false);
    });
});
