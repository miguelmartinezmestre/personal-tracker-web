import { describe, expect, test } from 'vitest';
import { extractErrorCode } from './error-messages';

describe('extractErrorCode', () => {
    test('extracts a code through supported error wrapper fields', () => {
        expect(extractErrorCode({ data: { message: 'ConvexError: AUTH_REQUIRED' } })).toBe(
            'AUTH_REQUIRED'
        );
    });

    test('ignores unsupported object shapes and cyclic causes', () => {
        expect(extractErrorCode(['AUTH_REQUIRED'])).toBeUndefined();

        const cyclicError: { cause?: unknown } = {};
        cyclicError.cause = cyclicError;
        expect(extractErrorCode(cyclicError)).toBeUndefined();
    });
});
