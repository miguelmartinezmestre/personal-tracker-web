import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
    createTestSession,
} from './test_helpers';

describe('organization deletion cascade', () => {
    const t = initConvexTest();

    beforeEach(() => vi.useFakeTimers());
    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('removes application data owned by the organization', async () => {
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
        const objectiveId = await createTestObjective(t, {
            userId: user.docId,
            organizationId,
            title: 'Objective to delete',
            targetValue: 10,
        });
        const categoryId = await t.run(ctx =>
            ctx.db.insert('categories', {
                userId: user.docId,
                organizationId,
                name: 'Category to delete',
                color: '#000000',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            })
        );

        await t.mutation(internal.admin.cascadeOrganizationDeletionInternal, {
            organizationId,
        });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        await t.run(async ctx => {
            expect(await ctx.db.get('objectives', objectiveId)).toBeNull();
            expect(await ctx.db.get('categories', categoryId)).toBeNull();
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
        await t.mutation(internal.admin.cascadeOrganizationDeletionInternal, {
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
        const check = await t.mutation(internal.admin.continueOrganizationDeletionCascade, {
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
            t.mutation(internal.admin.continueOrganizationDeletionCascade, {
                organizationId: deletedId,
                phase: 'finalize',
            })
        ).resolves.toEqual({ status: 'completed', phase: 'finalize' });
    });
});
