import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';

describe('batched jobs', () => {
    const t = initConvexTest();
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        vi.useFakeTimers();
        const suffix = Math.random().toString(36).slice(2, 10);
        const user = await createTestUser(t, {
            userId: `batch-user-${suffix}`,
            email: `batch-user-${suffix}@example.com`,
            name: 'Batch user',
            role: 'user',
        });
        userId = user.docId;
        organizationId = await createTestOrganization(t, {
            name: `Batch organization ${suffix}`,
            slug: `batch-organization-${suffix}`,
        });
        await createTestMember(t, { organizationId, userId, role: 'owner' });
    });

    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    test('purges progress and notifications across the objective batch boundary', async () => {
        const objectiveId = await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Objective with related data',
            targetValue: 100,
        });

        await t.run(async ctx => {
            const now = Date.now();
            for (let index = 0; index < 51; index++) {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    createdBy: userId,
                    organizationId,
                    updatedValue: index + 1,
                    updateDate: now + index,
                    createdAt: now,
                    updatedAt: now,
                });
                await ctx.db.insert('notifications', {
                    userId,
                    organizationId,
                    objective: objectiveId,
                    read: false,
                    notificationType: 'progress',
                    notificationDate: now + index,
                    message: `Progress ${index}`,
                });
            }
            await ctx.db.patch('objectives', objectiveId, {
                deletedAt: now,
                deletedBy: userId,
                purgeToken: 'batch-purge-token',
            });
        });

        await t.mutation(internal.objectives.deleteObjectiveContinue, {
            objectiveId,
            purgeToken: 'batch-purge-token',
            phase: 'progress',
        });
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        const remaining = await t.run(async ctx => ({
            objective: await ctx.db.get('objectives', objectiveId),
            progress: await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective_date', q => q.eq('objective', objectiveId))
                .collect(),
            notifications: await ctx.db
                .query('notifications')
                .withIndex('by_objective_type_date', q => q.eq('objective', objectiveId))
                .collect(),
        }));
        expect(remaining).toEqual({ objective: null, progress: [], notifications: [] });
    });

    test('marks unread notifications across the batch boundary', async () => {
        const objectiveId = await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Objective with notifications',
            targetValue: 100,
        });

        await t.run(async ctx => {
            const now = Date.now();
            for (let index = 0; index < 101; index++) {
                await ctx.db.insert('notifications', {
                    userId,
                    organizationId,
                    objective: objectiveId,
                    read: false,
                    notificationType: 'deadline',
                    notificationDate: now + index,
                    message: `Reminder ${index}`,
                });
            }
        });

        await t.mutation(internal.notifications.markAllReadBatch, {
            userId,
            organizationId,
        });

        await t.finishAllScheduledFunctions(() => vi.runAllTimers());

        const unread = await t.run(ctx =>
            ctx.db
                .query('notifications')
                .withIndex('by_user_organization_read', q =>
                    q.eq('userId', userId).eq('organizationId', organizationId).eq('read', false)
                )
                .collect()
        );
        expect(unread).toHaveLength(0);
    });
});
