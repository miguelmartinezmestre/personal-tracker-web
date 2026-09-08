import { describe, expect, test } from 'vitest';
import { validatePasswordPolicy } from '../../shared/password-policy';

describe('password policy', () => {
    test('rejects missing, short, and weak passwords', () => {
        const cases: Array<[string | undefined, string]> = [
            [undefined, 'PASSWORD_TOO_SHORT'],
            ['Short1', 'PASSWORD_TOO_SHORT'],
            ['password', 'WEAK_PASSWORD'],
        ];

        for (const [password, code] of cases) {
            expect(validatePasswordPolicy(password)).toMatchObject({ ok: false, code });
        }
    });

    test('accepts passwords with lowercase uppercase and number', () => {
        expect(validatePasswordPolicy('Password123').ok).toBe(true);
    });
});
