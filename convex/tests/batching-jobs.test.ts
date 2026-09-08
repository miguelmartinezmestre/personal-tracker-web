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
                    createdAt: now,
                    updatedAt: now,
                });
            }
            await ctx.db.patch('objectives', objectiveId, {
                deletedAt: now,
                deletedBy: userId,
                purgeToken: 'batch-purge-token',
                purgeStartedAt: now,
            });
        });

        let result = await t.mutation(internal.objectives.deleteObjectiveContinue, {
            objectiveId,
            purgeToken: 'batch-purge-token',
            phase: 'progress',
            cursor: null,
            totalProgressDeleted: 0,
            totalNotificationsDeleted: 0,
        });

        while (result.status === 'in_progress') {
            const phase = result.phase;
            if (phase !== 'collaborators' && phase !== 'progress' && phase !== 'notifications') {
                throw new Error(`Unexpected deletion phase: ${phase ?? '(none)'}`);
            }
            result = await t.mutation(internal.objectives.deleteObjectiveContinue, {
                objectiveId,
                purgeToken: 'batch-purge-token',
                phase,
                cursor: null,
                totalProgressDeleted: result.deleted.progress,
                totalNotificationsDeleted: result.deleted.notifications,
            });
        }

        expect(result).toMatchObject({
            status: 'completed',
            deleted: { progress: 51, notifications: 51 },
        });
        expect(await t.run(ctx => ctx.db.get('objectives', objectiveId))).toBeNull();
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
                    notificationType: 'reminder',
                    notificationDate: now + index,
                    message: `Reminder ${index}`,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        });

        const firstBatch = await t.mutation(internal.notifications.markAllReadBatch, {
            userId,
            organizationId,
            cursor: null,
            totalProcessed: 0,
        });
        expect(firstBatch).toMatchObject({ status: 'in_progress', totalProcessed: 100 });

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
