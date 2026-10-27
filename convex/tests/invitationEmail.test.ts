import { describe, expect, test } from 'vitest';
import { buildInvitationEmail } from '../features/email/templates';

describe('invitation email helpers', () => {
    test('builds the invitation email in Spanish with a translated role @REQ-EQUIPOS-002 @REQ-NF-007', () => {
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
});
