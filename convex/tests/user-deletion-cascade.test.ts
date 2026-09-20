import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';

describe('user deletion cascade', () => {
    const t = initConvexTest();

    beforeEach(() => vi.useFakeTimers());
    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('reassigns shared objectives, removes orphaned data and preserves a tombstone', async () => {
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

        const sharedObjectiveId = await createTestObjective(t, {
            userId: owner.docId,
            organizationId: sharedOrganizationId,
            title: 'Shared objective',
            targetValue: 100,
            visibility: 'organization',
        });
        const orphanObjectiveId = await createTestObjective(t, {
            userId: owner.docId,
            organizationId: personalOrganizationId,
            title: 'Orphan objective',
            targetValue: 100,
            visibility: 'private',
        });
        await t.run(ctx =>
            ctx.db.insert('objectiveCollaborators', {
                objectiveId: sharedObjectiveId,
                userId: editor.docId,
                organizationId: sharedOrganizationId,
                role: 'editor',
                addedBy: owner.docId,
                createdAt: Date.now(),
            })
        );

        await t.mutation(internal.admin.cascadeUserDeletionInternal, { userId: owner.docId });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        const result = await t.run(async ctx => ({
            sharedObjective: await ctx.db.get('objectives', sharedObjectiveId),
            orphanObjective: await ctx.db.get('objectives', orphanObjectiveId),
            tombstone: await ctx.db.get('user', owner.docId),
        }));
        expect(result.sharedObjective?.ownerId).toBe(editor.docId);
        expect(result.orphanObjective).toBeNull();
        expect(result.tombstone?.deletedAt).toBeDefined();
        expect(result.tombstone?.email).toContain('@deleted.invalid');
    });
});
