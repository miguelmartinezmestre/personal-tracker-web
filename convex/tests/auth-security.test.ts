import { describe, expect, test } from 'vitest';
import { getSafeCallbackPath } from '../features/auth/redirects';

describe('safe auth callbacks @INH-AUT-06', () => {
    test('accepts an internal callback path', () => {
        expect(getSafeCallbackPath('/dashboard/objectives?status=active')).toBe(
            '/dashboard/objectives?status=active'
        );
    });

    test.each(['https://evil.example/path', '//evil.example/path'])(
        'rejects unsafe callback %s',
        value => {
            expect(getSafeCallbackPath(value)).toBe('/dashboard/home');
        }
    );
});
