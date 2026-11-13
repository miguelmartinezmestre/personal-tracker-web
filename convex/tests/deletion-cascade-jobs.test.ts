import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    createTestSession,
} from './test.helpers';
import { runInAuth } from './authTesting';

describe('organization deletion cascade', () => {
    const t = initConvexTest();

    beforeEach(() => vi.useFakeTimers());
    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('removes categories, objectives, permissions and memberships owned by the organization @REQ-EQUIPOS-008', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);

        const user = await createTestUser(t, {
            userId: `organization-delete-${suffix}`,
            email: `organization-delete-${suffix}@example.com`,
            name: 'Organization owner',
            role: 'user',
        });

        const organizationId = await createTestOrganization(t, {
            name: `Organization to delete ${suffix}`,
            slug: `organization-to-delete-${suffix}`,
        });

        await createTestMember(t, { organizationId, userId: user.docId, role: 'owner' });
        const now = Date.now();

        const categoryId = await t.run(ctx =>
            ctx.db.insert('categories', {
                userId: user.docId,
                organizationId,
                name: 'Category to delete',
                color: '#000000',
                createdAt: now,
                updatedAt: now,
            })
        );

        const objectiveId = await t.run(ctx =>
            ctx.db.insert('objectives', {
                organizationId,
                createdBy: user.docId,
                title: 'Objective to delete',
                direction: 'increase',
                memberCanView: true,
                memberCanEdit: false,
                startValue: 0,
                currentValue: 1,
                targetValue: 5,
                status: 'active',
                createdAt: now,
                updatedAt: now,
            })
        );

        const progressId = await t.run(ctx =>
            ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                organizationId,
                createdBy: user.docId,
                updatedValue: 1,
                updateDate: now,
                resultingValue: 1,
                createdAt: now,
                updatedAt: now,
            })
        );

        const permissionId = await t.run(ctx =>
            ctx.db.insert('objectivePermissions', {
                objectiveId,
                organizationId,
                userId: user.docId,
                canEdit: true,
                addedBy: user.docId,
                createdAt: now,
                updatedAt: now,
            })
        );

        await t.mutation(internal.cascades.cascadeOrganizationDeletionInternal, {
            organizationId,
        });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        expect(await runInAuth(t, ctx => ctx.db.get('organization', organizationId))).toBeNull();
        await t.run(async ctx => {
            expect(await ctx.db.get('categories', categoryId)).toBeNull();
            expect(await ctx.db.get('objectives', objectiveId)).toBeNull();
            expect(await ctx.db.get('progressUpdates', progressId)).toBeNull();
            expect(await ctx.db.get('objectivePermissions', permissionId)).toBeNull();
        });
    });

    test('gives the deleting user back an active organization after Better Auth clears it @REQ-EQUIPOS-008', async () => {
        const suffix = Math.random().toString(36).slice(2, 10);

        const actor = await createTestUser(t, {
            userId: `actor-${suffix}`,
            email: `actor-${suffix}@example.test`,
            name: 'Actor',
        });

        const deletedId = await createTestOrganization(t, {
            name: 'Deleted by actor',
            slug: `deleted-by-actor-${suffix}`,
        });

        const fallbackId = await createTestOrganization(t, {
            name: 'Kept',
            slug: `kept-${suffix}`,
        });

        await createTestMember(t, {
            organizationId: fallbackId,
            userId: actor.docId,
            role: 'owner',
        });

        const actorSession = await createTestSession(t, {
            userId: actor.docId,
            activeOrganizationId: null,
            expiresAt: Date.now() + 3600000,
            token: `actor-session-${suffix}`,
        });

        await runInAuth(t, ctx => ctx.db.delete('organization', deletedId));

        await t.mutation(internal.sessions.recoverAfterOrganizationDeletion, {
            organizationId: deletedId,
            actorUserId: actor.docId,
        });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        expect(
            (await runInAuth(t, ctx => ctx.db.get('session', actorSession)))?.activeOrganizationId
        ).toBe(fallbackId);
    });
});
