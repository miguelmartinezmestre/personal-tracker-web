import { describe, expect, it } from 'vitest';
import { updatePasswordSchema } from './update-password';

describe('updatePasswordSchema', () => {
    it('accepts valid current and new passwords', () => {
        const result = updatePasswordSchema.safeParse({
            password: 'currentpass123',
            confirmPassword: 'currentpass123',
            newPassword: 'newpass456',
        });

        expect(result.success).toBe(true);
    });

    it('rejects short new password', () => {
        const result = updatePasswordSchema.safeParse({
            password: 'currentpass123',
            confirmPassword: 'currentpass123',
            newPassword: 'short',
        });

        expect(result.success).toBe(false);
    });

    it('rejects password confirmation mismatch', () => {
        const result = updatePasswordSchema.safeParse({
            password: 'currentpass123',
            confirmPassword: 'differentpass123',
            newPassword: 'newpass456',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some(issue => issue.path[0] === 'confirmPassword')).toBe(
                true
            );
        }
    });
});
