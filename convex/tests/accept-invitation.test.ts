import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestSession,
    createTestUser,
} from './test.helpers';
import { identityFor } from './test.identities';
import { TIME } from '../constants';

describe('accept invitation active organization', () => {
    test('existing user session can activate invited organization after accept', async () => {
        const t = initConvexTest();
        const suffix = Math.random().toString(36).slice(2, 12);

        const invitee = await createTestUser(t, {
            userId: `invitee-active-${suffix}`,
            email: `invitee-active-${suffix}@example.com`,
            name: `Invitee Active ${suffix}`,
            emailVerified: true,
        });
        const personalOrgId = await createTestOrganization(t, {
            name: `Personal ${suffix}`,
            slug: `personal-${suffix}`,
            description: JSON.stringify({ type: 'personal', ownerUserId: invitee.docId }),
        });
        const invitedOrgId = await createTestOrganization(t, {
            name: `Invited ${suffix}`,
            slug: `invited-${suffix}`,
        });

        await createTestMember(t, {
            organizationId: personalOrgId,
            userId: invitee.docId,
            role: 'owner',
        });

        const sessionId = await createTestSession(t, {
            userId: invitee.docId,
            activeOrganizationId: personalOrgId,
            expiresAt: Date.now() + TIME.DAY_MS,
            token: `invitee-active-session-${suffix}`,
        });

        const personalIdentity = t.withIdentity(identityFor(invitee, sessionId));
        const personalMember = await personalIdentity.query(api.organizations.getActiveMember, {});
        expect(personalMember?.organizationId).toBe(personalOrgId);

        await t.run(async ctx => {
            await ctx.db.insert('invitation', {
                organizationId: invitedOrgId,
                email: invitee.email,
                role: 'member',
                status: 'accepted',
                expiresAt: Date.now() + TIME.DAY_MS,
                createdAt: Date.now(),
                inviterId: invitee.docId,
            });
            await ctx.db.insert('member', {
                organizationId: invitedOrgId,
                userId: invitee.docId,
                role: 'member',
                createdAt: Date.now(),
            });
            await ctx.db.patch('session', sessionId, {
                activeOrganizationId: invitedOrgId,
            });
        });

        const invitedIdentity = t.withIdentity(identityFor(invitee, sessionId));
        const activeMember = await invitedIdentity.query(api.organizations.getActiveMember, {});
        const dashboardContext = await invitedIdentity.query(api.auth.getDashboardContext, {});

        expect(activeMember?.organizationId).toBe(invitedOrgId);
        expect(dashboardContext.organizationId).toBe(invitedOrgId);
    });
});
