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
});
