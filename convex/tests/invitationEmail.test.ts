import { describe, expect, test } from 'vitest';
import {
    buildInvitationEmail,
    buildInvitationUrl,
    buildPasswordResetEmail,
    buildVerificationEmail,
    formatInvitationRole,
    resolveEmailLocale,
} from '../utils';

describe('invitation email helpers', () => {
    test('builds the public invitation URL from the app site URL', () => {
        expect(buildInvitationUrl('https://app.example.com', 'invite_123')).toBe(
            'https://app.example.com/invitations/invite_123'
        );
    });

    test('formats missing and multiple roles', () => {
        expect(formatInvitationRole(null)).toBe('member');
        expect(formatInvitationRole(['admin', 'member'])).toBe('admin, member');
    });

    test('builds a transactional invitation email payload', () => {
        expect(
            buildInvitationEmail({
                siteUrl: 'https://app.example.com',
                invitationId: 'invite_123',
                inviteeEmail: 'person@example.com',
                organizationName: 'Acme',
                inviterName: 'Maria',
                role: 'admin',
            })
        ).toEqual({
            to: 'person@example.com',
            subject: 'You have been invited to join Acme',
            text: [
                'Maria invited you to join Acme as admin.',
                '',
                'Accept the invitation here: https://app.example.com/invitations/invite_123',
                '',
                'If you were not expecting this invitation, you can ignore this email.',
            ].join('\n'),
        });
    });

    test('builds the invitation email in Spanish with a translated role', () => {
        const email = buildInvitationEmail({
            siteUrl: 'https://app.example.com',
            invitationId: 'invite_123',
            inviteeEmail: 'person@example.com',
            organizationName: 'Acme',
            inviterName: 'Maria',
            role: 'member',
            locale: 'es',
        });
        expect(email.subject).toBe('Te han invitado a unirte a Acme');
        expect(email.text).toContain('Maria te ha invitado a unirte a Acme como miembro.');
        expect(email.text).toContain('https://app.example.com/invitations/invite_123');
    });

    test('localizes the password reset and verification emails', () => {
        const url = 'https://app.example.com/api/auth/reset-password/token';
        expect(buildPasswordResetEmail({ to: 'a@example.com', url, locale: 'es' })).toMatchObject({
            subject: 'Restablece tu contraseña',
        });
        expect(buildVerificationEmail({ to: 'a@example.com', url, locale: 'en' })).toMatchObject({
            subject: 'Verify your email address',
        });
        expect(buildVerificationEmail({ to: 'a@example.com', url, locale: 'es' }).text).toContain(
            url
        );
    });

    test('takes the email language from the locale cookie, then the platform default', () => {
        const withCookie = new Request('https://app.example.com', {
            headers: { cookie: 'theme=dark; locale=es; other=1' },
        });
        expect(resolveEmailLocale(withCookie, 'en')).toBe('es');
        expect(resolveEmailLocale(new Request('https://app.example.com'), 'es')).toBe('es');
        expect(resolveEmailLocale(undefined, undefined)).toBe('en');
        expect(
            resolveEmailLocale(
                new Request('https://app.example.com', { headers: { cookie: 'locale=fr' } }),
                null
            )
        ).toBe('en');
    });
});
