import { describe, expect, test, vi } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import { identityFor } from './test_identities';
import type { Id } from '../_generated/dataModel';

async function finishRebuild(
    t: ReturnType<typeof initConvexTest>,
    organizationId: Id<'organization'>
) {
    for (let iteration = 0; iteration < 500; iteration++) {
        vi.runOnlyPendingTimers();
        await t.finishInProgressScheduledFunctions();
        const state = await t.run(
            async ctx =>
                await ctx.db
                    .query('dashboardMigrations')
                    .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                    .first()
        );
        if (state?.phase === 'ready') {
            await t.finishAllScheduledFunctions(() => vi.runAllTimers());
            return;
        }
    }
    throw new Error('The dashboard rebuild did not finish within the test execution budget');
}

describe('dashboard migration and scale', () => {
    const t = initConvexTest();

    test('backfills 1502 legacy objectives and finds candidates beyond the old prefix', async () => {
        vi.useFakeTimers();
        try {
            const user = await createTestUser(t, {
                userId: 'scale-owner',
                name: 'Owner',
                email: 'scale@example.test',
            });
            const organizationId = await createTestOrganization(t, {
                name: 'Scale',
                slug: 'dashboard-scale',
            });
            await createTestMember(t, { organizationId, userId: user.docId, role: 'owner' });
            const identity = t.withIdentity(identityFor(user));
            const now = Date.now();
            const highId = await t.run(async ctx => {
                const common = {
                    createdBy: user.docId,
                    ownerId: user.docId,
                    organizationId,
                    visibility: 'organization' as const,
                    targetValue: 100,
                    startValue: 0,
                    createdAt: now,
                    updatedAt: now,
                };
                for (let index = 0; index < 1500; index++)
                    await ctx.db.insert('objectives', {
                        ...common,
                        title: `Completed ${index}`,
                        currentValue: 100,
                        status: 'completed',
                        completedAt: now,
                    });
                await ctx.db.insert('objectives', {
                    ...common,
                    title: 'Low progress',
                    currentValue: 1,
                    status: 'active',
                });
                return await ctx.db.insert('objectives', {
                    ...common,
                    title: 'Relevant late row',
                    currentValue: 99,
                    status: 'active',
                    deadline: now + 86_400_000,
                });
            });
            await expect(identity.query(api.dashboard.getDashboardStats, {})).rejects.toThrow(
                'DASHBOARD_UPDATING'
            );
            await t.mutation(internal.dashboard.rebuildDashboard, { organizationId });
            await finishRebuild(t, organizationId);
            await expect(
                identity.query(api.dashboard.getDashboardStats, {})
            ).resolves.toMatchObject({
                totalObjectives: 1502,
                completedObjectives: 1500,
                pendingObjectives: 2,
                isTruncated: false,
            });
            const ranked = await identity.query(api.dashboard.getObjectivesWithMostProgress, {});
            expect(ranked.items[0]).toMatchObject({ id: highId, progress: 99 });
            const upcoming = await identity.query(api.dashboard.getUpcomingDeadlines, { now });
            expect(upcoming.items.map(item => item.id)).toEqual([highId]);
            await t.mutation(internal.dashboard.rebuildDashboard, { organizationId });
            await finishRebuild(t, organizationId);
            await expect(
                identity.query(api.dashboard.getDashboardStats, {})
            ).resolves.toMatchObject({ totalObjectives: 1502 });
            const namespaces = await t.run(
                async ctx =>
                    await ctx.db
                        .query('dashboardNamespaces')
                        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                        .collect()
            );
            expect(namespaces).toHaveLength(2);
            expect(namespaces.every(entry => entry.namespace.includes('/2/objectives/'))).toBe(
                true
            );
        } finally {
            vi.useRealTimers();
        }
    }, 300_000);
});
