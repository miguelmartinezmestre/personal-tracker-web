import { describe, expect, test } from 'vitest';
import {
    buildInvitationEmail,
    buildInvitationUrl,
    formatInvitationRole,
} from '../utils/invitationEmail';

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
});
