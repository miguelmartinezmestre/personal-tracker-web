import { describe, expect, test } from 'vitest';
import { extractErrorCode, resolveErrorMessage } from './error-messages';

describe('errors from runtime boundaries', () => {
    test.each([
        'FORBIDDEN',
        new Error('ConvexError: FORBIDDEN'),
        { data: 'FORBIDDEN' },
        { data: { code: 'FORBIDDEN' } },
        { cause: { data: { message: 'FORBIDDEN' } } },
        Object.assign(new Error('Server failure'), { data: 'FORBIDDEN' }),
    ])('extracts a structured code without losing nested data', value => {
        expect(extractErrorCode(value)).toBe('FORBIDDEN');
        expect(resolveErrorMessage(value, 'es')).toBe('No tienes permiso para hacer eso.');
    });
    test.each([null, undefined, 123, [], { message: 123 }, { data: () => 'FORBIDDEN' }])(
        'handles malformed values',
        value => {
            expect(extractErrorCode(value)).toBeUndefined();
            expect(resolveErrorMessage(value, 'en', 'Fallback')).toBe('Fallback');
        }
    );
    test('stops at cyclic third-party values', () => {
        const value: { cause?: unknown } = {};
        value.cause = value;
        expect(extractErrorCode(value)).toBeUndefined();
    });

    test.each([
        ['BANNED_USER', 'This account cannot sign in. Contact an administrator.'],
        [
            'WEAK_PASSWORD',
            'Password must include at least one uppercase letter, one lowercase letter, and one number.',
        ],
        ['INVITATION_NOT_FOUND', 'That invitation no longer exists.'],
        ['OBJECTIVE_DELETED', 'This objective is in the trash.'],
        ['OBJECTIVE_NOT_DELETED', 'This objective is not in the trash.'],
        ['OBJECTIVE_PURGE_IN_PROGRESS', 'This objective is already being permanently deleted.'],
    ])('maps current error code %s in English', (code, message) => {
        expect(resolveErrorMessage(code, 'en')).toBe(message);
    });

    test.each([
        ['BANNED_USER', 'Esta cuenta no puede iniciar sesión. Contacta con un administrador.'],
        [
            'WEAK_PASSWORD',
            'La contraseña debe incluir al menos una mayúscula, una minúscula y un número.',
        ],
        ['INVITATION_NOT_FOUND', 'Esa invitación ya no existe.'],
        ['OBJECTIVE_DELETED', 'Este objetivo está en la papelera.'],
        ['OBJECTIVE_NOT_DELETED', 'Este objetivo no está en la papelera.'],
        ['OBJECTIVE_PURGE_IN_PROGRESS', 'Este objetivo ya se está eliminando de forma permanente.'],
    ])('maps current error code %s in Spanish', (code, message) => {
        expect(resolveErrorMessage(code, 'es')).toBe(message);
    });
});
