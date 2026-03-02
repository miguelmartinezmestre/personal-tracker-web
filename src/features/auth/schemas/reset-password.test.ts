import { describe, expect, it } from 'vitest';
import { resetPasswordSchema } from './reset-password';

describe('resetPasswordSchema', () => {
  it('accepts a valid reset request', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'password123',
      confirmPassword: 'password123',
      resetPasswordKey: 'token-123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects short passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'short',
      confirmPassword: 'short',
      resetPasswordKey: 'token-123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects password mismatch', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'password123',
      confirmPassword: 'password456',
      resetPasswordKey: 'token-123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path[0] === 'confirmPassword')).toBe(true);
    }
  });
});
