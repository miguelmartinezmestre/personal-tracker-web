import { describe, expect, test } from 'vitest';
import { wrapDatabaseReader } from 'convex-helpers/server/rowLevelSecurity';
import { initConvexTest } from './test.helper';
import { createTestOrganization, createTestUser } from './test.helpers';
import { createRlsRules } from '../rls/policies';
import { TIME } from '../constants';

const rlsConfig = { defaultPolicy: 'deny' as const };

describe('RLS auth and organization tables', () => {
    test('expired invitations do not grant RLS access to the invitation or related records', async () => {
        const t = initConvexTest();
        const suffix = Math.random().toString(36).slice(2, 12);
        const invitee = await createTestUser(t, {
            userId: `rls-expired-invitee-${suffix}`,
            email: `rls-expired-invitee-${suffix}@example.com`,
            name: `RLS Expired Invitee ${suffix}`,
            role: 'user',
        });
        const inviter = await createTestUser(t, {
            userId: `rls-expired-inviter-${suffix}`,
            email: `rls-expired-inviter-${suffix}@example.com`,
            name: `RLS Expired Inviter ${suffix}`,
            role: 'user',
        });
        const organizationId = await createTestOrganization(t, {
            name: `RLS Expired Invitation Org ${suffix}`,
            slug: `rls-expired-invitation-org-${suffix}`,
        });
        const invitationId = await t.run(async ctx =>
            ctx.db.insert('invitation', {
                organizationId,
                email: invitee.email,
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() - TIME.DAY_MS,
                createdAt: Date.now() - TIME.DAY_MS * 2,
                inviterId: inviter.docId,
            })
        );

        const [invitation, organization, invitationSender] = await t.run(async ctx => {
            const rules = createRlsRules({
                userId: invitee.docId,
                role: invitee.role ?? 'user',
                memberRole: null,
                ctx,
                organizationId: null,
                email: invitee.email,
            });
            const rlsDb = wrapDatabaseReader(ctx, ctx.db, rules, rlsConfig);

            return await Promise.all([
                rlsDb.get('invitation', invitationId),
                rlsDb.get('organization', organizationId),
                rlsDb.get('user', inviter.docId),
            ]);
        });

        expect(invitation).toBeNull();
        expect(organization).toBeNull();
        expect(invitationSender).toBeNull();
    });
});
