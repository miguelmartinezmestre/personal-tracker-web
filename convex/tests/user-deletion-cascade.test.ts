import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test.helpers';

describe('user deletion cascade', () => {
    const t = initConvexTest();

    beforeEach(() => vi.useFakeTimers());
    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('removes memberships, deletes personal orgs and preserves a tombstone', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        const owner = await createTestUser(t, {
            userId: `deleted-owner-${suffix}`,
            email: `deleted-owner-${suffix}@example.com`,
            name: 'Deleted owner',
        });
        const editor = await createTestUser(t, {
            userId: `successor-${suffix}`,
            email: `successor-${suffix}@example.com`,
            name: 'Successor',
        });
        const sharedOrganizationId = await createTestOrganization(t, {
            name: `Shared organization ${suffix}`,
            slug: `shared-organization-${suffix}`,
        });
        const personalOrganizationId = await createTestOrganization(t, {
            name: `Personal organization ${suffix}`,
            slug: `personal-organization-${suffix}`,
            description: JSON.stringify({ type: 'personal', ownerUserId: owner.docId }),
        });

        await createTestMember(t, {
            organizationId: sharedOrganizationId,
            userId: owner.docId,
            role: 'owner',
        });
        await createTestMember(t, {
            organizationId: sharedOrganizationId,
            userId: editor.docId,
            role: 'member',
        });
        await createTestMember(t, {
            organizationId: personalOrganizationId,
            userId: owner.docId,
            role: 'owner',
        });

        await t.mutation(internal.cascades.cascadeUserDeletionInternal, { userId: owner.docId });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        const result = await t.run(async ctx => ({
            personalOrganization: await ctx.db.get('organization', personalOrganizationId),
            sharedOrganization: await ctx.db.get('organization', sharedOrganizationId),
            ownerMembership: await ctx.db
                .query('member')
                .withIndex('by_organizationId_and_userId', q =>
                    q.eq('organizationId', sharedOrganizationId).eq('userId', owner.docId)
                )
                .first(),
            successorMembership: await ctx.db
                .query('member')
                .withIndex('by_organizationId_and_userId', q =>
                    q.eq('organizationId', sharedOrganizationId).eq('userId', editor.docId)
                )
                .first(),
            tombstone: await ctx.db.get('user', owner.docId),
        }));
        expect(result.personalOrganization).toBeNull();
        expect(result.sharedOrganization).not.toBeNull();
        expect(result.ownerMembership).toBeNull();
        expect(result.successorMembership?.role).toBe('owner');
        expect(result.tombstone?.deletedAt).toBeDefined();
        expect(result.tombstone?.email).toContain('@deleted.invalid');
    });
});
