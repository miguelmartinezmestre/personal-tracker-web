import { describe, expect, test } from 'vitest';
import { extractErrorCode, getErrorLocale } from './error-messages';

describe('extractErrorCode', () => {
    test('extracts a code through supported error wrapper fields', () => {
        expect(extractErrorCode({ data: { message: 'ConvexError: AUTH_REQUIRED' } })).toBe(
            'AUTH_REQUIRED'
        );
    });
});

test('error toasts follow the page language, not only the locale cookie', () => {
    document.cookie = 'locale=; max-age=0';
    document.documentElement.lang = 'es';
    expect(getErrorLocale()).toBe('es');
    document.documentElement.lang = 'en';
    expect(getErrorLocale()).toBe('en');
});
