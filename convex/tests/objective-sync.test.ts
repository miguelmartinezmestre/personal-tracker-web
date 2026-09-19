import { describe, expect, test } from 'vitest';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestOrganization, createTestUser } from './test_helpers';

describe('objective progress reconciliation', () => {
    test.each([
        { state: 'soft-deleted', patch: { deletedAt: Date.now() } },
        { state: 'being purged', patch: { purgeToken: 'pending-purge' } },
    ])('does not reconcile or notify for an objective that is $state', async ({ patch }) => {
        const t = initConvexTest();
        const suffix = Math.random().toString(36).slice(2);
        const user = await createTestUser(t, {
            userId: `stale-objective-sync-${suffix}`,
            email: `stale-objective-sync-${suffix}@example.com`,
            name: 'Stale Objective Sync User',
        });
        const organizationId = await createTestOrganization(t, {
            name: `Stale Objective Sync Org ${suffix}`,
            slug: `stale-objective-sync-org-${suffix}`,
        });
        const now = Date.now();
        const objectiveId = await t.run(async ctx =>
            ctx.db.insert('objectives', {
                createdBy: user.docId,
                ownerId: user.docId,
                visibility: 'private',
                organizationId,
                title: 'Logically absent objective',
                targetValue: 100,
                currentValue: 100,
                startValue: 0,
                status: 'active',
                earlyBirdCompleted: false,
                createdAt: now,
                updatedAt: now,
                ...patch,
            })
        );

        const result = await t.mutation(
            internal.jobs.objectives.syncObjectiveFromProgress.syncObjectiveFromProgress,
            { objectiveId }
        );
        const state = await t.run(async ctx => ({
            objective: await ctx.db.get('objectives', objectiveId),
            notifications: await ctx.db
                .query('notifications')
                .withIndex('by_user_organization_date', q =>
                    q.eq('userId', user.docId).eq('organizationId', organizationId)
                )
                .collect(),
        }));

        expect(result).toMatchObject({ found: false, completedNow: false, reopened: false });
        expect(state.objective?.status).toBe('active');
        expect(state.notifications).toEqual([]);
    });
});
