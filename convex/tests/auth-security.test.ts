import { describe, expect, test } from 'vitest';
import { isSetupSecretLengthValid, isSetupSecretValid } from '../env';
import {
    getAuthRouteRedirect,
    getInvitationCallbackPath,
    getInvitationIdFromCallbackPath,
    getSafeCallbackPath,
} from '../utils';

describe('safe auth callbacks', () => {
    test.each([
        ['/dashboard/home', '/dashboard/home'],
        ['/dashboard/objectives?status=active', '/dashboard/objectives?status=active'],
        ['/invitations/invite_123', '/invitations/invite_123'],
    ])('accepts internal callback path %s', (value, expected) => {
        expect(getSafeCallbackPath(value)).toBe(expected);
    });

    test.each([null, undefined, '', '   '])('falls back for an empty callback: %s', value => {
        expect(getSafeCallbackPath(value)).toBe('/dashboard/home');
    });

    test.each([
        'https://evil.example/path',
        '//evil.example/path',
        '/\\evil.example/path',
        '\\evil.example/path',
        'javascript:alert(1)',
    ])('rejects unsafe callback %s', value => {
        expect(getSafeCallbackPath(value)).toBe('/dashboard/home');
    });
});

describe('auth route redirects', () => {
    test('does not redirect an auth route based only on a session cookie', () => {
        expect(
            getAuthRouteRedirect({
                pathname: '/login',
                search: '?callbackUrl=%2Fdashboard%2Fhome',
                hasSessionCookie: true,
            })
        ).toBeNull();
    });

    test('keeps dashboard routes protected and preserves a safe callback', () => {
        expect(
            getAuthRouteRedirect({
                pathname: '/dashboard/objectives',
                search: '?status=active',
                hasSessionCookie: false,
            })
        ).toBe('/login?callbackUrl=%2Fdashboard%2Fobjectives%3Fstatus%3Dactive');
    });
});

describe('organization invitation security', () => {
    test('builds an internal verification callback that resumes the invitation', () => {
        expect(getInvitationCallbackPath('invite/id?external=https://evil.example')).toBe(
            '/invitations/invite%2Fid%3Fexternal%3Dhttps%3A%2F%2Fevil.example'
        );
    });

    test('extracts only an invitation ID from an internal invitation callback', () => {
        expect(getInvitationIdFromCallbackPath('/invitations/invite_123')).toBe('invite_123');
        expect(getInvitationIdFromCallbackPath('/dashboard/home')).toBeNull();
        expect(
            getInvitationIdFromCallbackPath('https://evil.example/invitations/invite_123')
        ).toBeNull();
        expect(getInvitationIdFromCallbackPath('/invitations/')).toBeNull();
    });
});

describe('bootstrap setup secret', () => {
    const configuredSecret = 'a'.repeat(32);

    test('accepts only the exact configured value', () => {
        expect(isSetupSecretValid(configuredSecret, configuredSecret)).toBe(true);
        expect(isSetupSecretValid(configuredSecret, null)).toBe(false);
        expect(isSetupSecretValid(configuredSecret, `${configuredSecret}x`)).toBe(false);
        expect(isSetupSecretValid(configuredSecret, 'b'.repeat(32))).toBe(false);
        expect(isSetupSecretValid(configuredSecret, 'a'.repeat(257))).toBe(false);
        expect(isSetupSecretValid('a'.repeat(257), 'a'.repeat(257))).toBe(false);
    });

    test('keeps the secret optional when none is configured for localhost', () => {
        expect(isSetupSecretValid(undefined, undefined)).toBe(true);
    });

    test('allows an empty local value but enforces the configured length bounds', () => {
        expect(isSetupSecretLengthValid('')).toBe(true);
        expect(isSetupSecretLengthValid('a'.repeat(31))).toBe(false);
        expect(isSetupSecretLengthValid('a'.repeat(32))).toBe(true);
        expect(isSetupSecretLengthValid('a'.repeat(256))).toBe(true);
        expect(isSetupSecretLengthValid('a'.repeat(257))).toBe(false);
    });
});
