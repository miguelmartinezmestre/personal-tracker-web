import { describe, expect, test } from 'vitest';
import { resolveOrganizationIdAfterAccept } from './accept-invitation';

describe('resolveOrganizationIdAfterAccept', () => {
    test('prefers known organization id', () => {
        expect(
            resolveOrganizationIdAfterAccept(
                {
                    member: { organizationId: 'member-org' },
                    invitation: { organizationId: 'invitation-org' },
                },
                'known-org'
            )
        ).toBe('known-org');
    });

    test('falls back to member then invitation', () => {
        expect(
            resolveOrganizationIdAfterAccept({
                member: { organizationId: 'member-org' },
                invitation: { organizationId: 'invitation-org' },
            })
        ).toBe('member-org');

        expect(
            resolveOrganizationIdAfterAccept({
                invitation: { organizationId: 'invitation-org' },
            })
        ).toBe('invitation-org');
    });

    test('throws when organization id is missing', () => {
        expect(() => resolveOrganizationIdAfterAccept({})).toThrow(
            /Missing organization id after accepting invitation/
        );
    });
});
