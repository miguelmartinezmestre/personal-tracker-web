import { describe, expect, test } from 'vitest';
import { validatePasswordPolicy } from '../../shared/password-policy';

describe('password policy', () => {
    test('rejects non-string passwords', () => {
        const result = validatePasswordPolicy(undefined);

        expect(result).toMatchObject({ ok: false, code: 'PASSWORD_TOO_SHORT' });
    });

    test('rejects passwords shorter than eight characters', () => {
        const result = validatePasswordPolicy('Short1');

        expect(result).toMatchObject({ ok: false, code: 'PASSWORD_TOO_SHORT' });
    });

    test('rejects weak passwords with eight or more characters', () => {
        const result = validatePasswordPolicy('password');

        expect(result).toMatchObject({ ok: false, code: 'WEAK_PASSWORD' });
    });

    test('accepts passwords with lowercase uppercase and number', () => {
        const result = validatePasswordPolicy('Password123');

        expect(result.ok).toBe(true);
    });
});
