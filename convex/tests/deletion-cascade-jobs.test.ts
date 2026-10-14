import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    createTestSession,
} from './test.helpers';

describe('organization deletion cascade', () => {
    const t = initConvexTest();

    beforeEach(() => vi.useFakeTimers());
    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('removes categories and memberships owned by the organization', async () => {
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
                createdAt: now,
                updatedAt: now,
            })
        );

        await t.mutation(internal.cascades.cascadeOrganizationDeletionInternal, {
            organizationId,
        });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        await t.run(async ctx => {
            expect(await ctx.db.get('organization', organizationId)).toBeNull();
            expect(await ctx.db.get('categories', categoryId)).toBeNull();
            expect(await ctx.db.get('objectives', objectiveId)).toBeNull();
            expect(await ctx.db.get('progressUpdates', progressId)).toBeNull();
        });
    });

    test('recovers sessions past stale memberships and repeats finalization for late residues', async () => {
        const user = await createTestUser(t, {
            userId: 'recovery-owner',
            email: 'recovery@example.test',
            name: 'Recovery owner',
        });
        const deletedId = await createTestOrganization(t, {
            name: 'Deleted',
            slug: 'deleted-recovery',
        });
        await createTestMember(t, { organizationId: deletedId, userId: user.docId, role: 'owner' });
        for (let index = 0; index < 25; index++) {
            const missing = await createTestOrganization(t, {
                name: 'Stale',
                slug: `stale-${index}`,
            });
            await t.run(async ctx => {
                await ctx.db.insert('member', {
                    organizationId: missing,
                    userId: user.docId,
                    role: 'member',
                    createdAt: index,
                });
                await ctx.db.delete('organization', missing);
            });
        }
        const fallbackId = await createTestOrganization(t, {
            name: 'Existing',
            slug: 'existing-fallback',
        });
        await createTestMember(t, {
            organizationId: fallbackId,
            userId: user.docId,
            role: 'member',
        });
        const sessionIds: Id<'session'>[] = [];
        for (let index = 0; index < 23; index++) {
            sessionIds.push(
                await createTestSession(t, {
                    userId: user.docId,
                    activeOrganizationId: deletedId,
                    expiresAt: Date.now() + 3600000,
                    token: `affected-${index}`,
                })
            );
        }
        await t.mutation(internal.cascades.cascadeOrganizationDeletionInternal, {
            organizationId: deletedId,
        });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        await t.run(async ctx => {
            for (const id of sessionIds) {
                expect((await ctx.db.get('session', id))?.activeOrganizationId).toBe(fallbackId);
            }
        });
        const lateSession = await createTestSession(t, {
            userId: user.docId,
            activeOrganizationId: deletedId,
            expiresAt: Date.now() + 3600000,
            token: 'late-session',
        });
        const check = await t.mutation(internal.cascades.continueOrganizationDeletionCascade, {
            organizationId: deletedId,
            phase: 'finalize',
        });
        expect(check).toEqual({ status: 'in_progress', phase: 'sessions' });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        expect(
            (await t.run(async ctx => await ctx.db.get('session', lateSession)))
                ?.activeOrganizationId
        ).toBe(fallbackId);
        await expect(
            t.mutation(internal.cascades.continueOrganizationDeletionCascade, {
                organizationId: deletedId,
                phase: 'finalize',
            })
        ).resolves.toEqual({ status: 'completed', phase: 'finalize' });
    });

    test('gives the deleting user back an active organization after Better Auth clears it', async () => {
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
        // Better Auth sets the deleting session's active organization to null before deleting.
        const actorSession = await createTestSession(t, {
            userId: actor.docId,
            activeOrganizationId: null,
            expiresAt: Date.now() + 3600000,
            token: `actor-session-${suffix}`,
        });
        await t.run(ctx => ctx.db.delete('organization', deletedId));

        await t.mutation(internal.auth.recoverSessionsAfterOrganizationDeletion, {
            organizationId: deletedId,
            actorUserId: actor.docId,
        });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        expect(
            (await t.run(ctx => ctx.db.get('session', actorSession)))?.activeOrganizationId
        ).toBe(fallbackId);
    });
});
