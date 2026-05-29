import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    createTestObjective,
} from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';
import {
    calculateUserStreak,
    calculateOrganizationStreak,
} from '../domain/achievements/calculations';

describe('CRITICAL: Batching jobs with large datasets', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const random = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-batch-user-' + random,
            email: 'batch-test@example.com-' + random,
            name: 'Batch Test User ' + random,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };
        const userData = await createTestUser(t, user);
        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Batch Test Org ' + random,
            slug: 'batch-test-org-' + random,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

        organizationId = orgId;

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(async () => {
        await t.finishAllScheduledFunctions(() => vi.runAllTimers());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe('deleteObjectiveContinue batching', () => {
        test('should delete all progress updates when >50 exist (batch size)', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Test Objective with Many Updates',
                targetValue: 1000,
                currentValue: 0,
            });

            const updateCount = 55;
            const updateIds: Id<'progressUpdates'>[] = [];

            await t.run(async ctx => {
                for (let i = 0; i < updateCount; i++) {
                    const id = await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        userId,
                        updatedValue: i + 1,
                        updateDate: Date.now() + i,
                        comment: `Update ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    updateIds.push(id);
                }
            });

            const initialCount = await t.run(async ctx => {
                const updates = await ctx.db
                    .query('progressUpdates')
                    .withIndex('by_objective', q => q.eq('objective', objectiveId))
                    .collect();
                return updates.length;
            });
            expect(initialCount).toBe(updateCount);

            const result = await t.mutation(internal.objectives.deleteObjectiveContinue, {
                objectiveId,
                phase: 'progress',
                cursor: null,
                totalProgressDeleted: 0,
                totalNotificationsDeleted: 0,
            });

            expect(result.status).toMatch(/in_progress|completed/);

            let attempts = 0;
            let currentResult = result;
            while (currentResult.status === 'in_progress' && attempts < 10) {
                currentResult = await t.mutation(internal.objectives.deleteObjectiveContinue, {
                    objectiveId,
                    phase: currentResult.phase as 'progress' | 'notifications',
                    cursor: null,
                    totalProgressDeleted: currentResult.deleted.progress,
                    totalNotificationsDeleted: currentResult.deleted.notifications,
                });
                attempts++;
            }

            expect(attempts).toBeLessThan(10);

            expect(currentResult.status).toBe('completed');

            const finalCount = await t.run(async ctx => {
                const updates = await ctx.db
                    .query('progressUpdates')
                    .withIndex('by_objective', q => q.eq('objective', objectiveId))
                    .collect();
                return updates.length;
            });
            expect(finalCount).toBe(0);

            const objective = await t.run(async ctx => ctx.db.get(objectiveId));
            expect(objective).toBeNull();
        });

        test('should delete all notifications when >50 exist', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Test Objective with Many Notifications',
                targetValue: 100,
                currentValue: 0,
            });

            const notificationCount = 55;

            await t.run(async ctx => {
                for (let i = 0; i < notificationCount; i++) {
                    await ctx.db.insert('notifications', {
                        userId,
                        organizationId,
                        objective: objectiveId,
                        read: false,
                        notificationType: 'reminder',
                        notificationDate: Date.now() + i,
                        message: `Notification ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const initialCount = await t.run(async ctx => {
                const notifs = await ctx.db
                    .query('notifications')
                    .withIndex('by_objective', q => q.eq('objective', objectiveId))
                    .collect();
                return notifs.length;
            });
            expect(initialCount).toBe(notificationCount);

            const result = await t.mutation(internal.objectives.deleteObjectiveContinue, {
                objectiveId,
                phase: 'notifications',
                cursor: null,
                totalProgressDeleted: 0,
                totalNotificationsDeleted: 0,
            });

            let attempts = 0;
            let currentResult = result;
            while (currentResult.status === 'in_progress' && attempts < 10) {
                currentResult = await t.mutation(internal.objectives.deleteObjectiveContinue, {
                    objectiveId,
                    phase: 'notifications',
                    cursor: null,
                    totalProgressDeleted: 0,
                    totalNotificationsDeleted: currentResult.deleted.notifications,
                });
                attempts++;
            }

            expect(attempts).toBeLessThan(10);
            expect(currentResult.status).toBe('completed');

            const finalCount = await t.run(async ctx => {
                const notifs = await ctx.db
                    .query('notifications')
                    .withIndex('by_objective', q => q.eq('objective', objectiveId))
                    .collect();
                return notifs.length;
            });
            expect(finalCount).toBe(0);
        });

        test('should handle mixed progress updates and notifications', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Mixed Test Objective',
                targetValue: 100,
                currentValue: 0,
            });

            await t.run(async ctx => {
                for (let i = 0; i < 60; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        userId,
                        updatedValue: i + 1,
                        updateDate: Date.now() + i,
                        comment: `Update ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
                for (let i = 0; i < 60; i++) {
                    await ctx.db.insert('notifications', {
                        userId,
                        organizationId,
                        objective: objectiveId,
                        read: false,
                        notificationType: 'progress',
                        notificationDate: Date.now() + i,
                        message: `Progress ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            let currentResult: {
                status: string;
                phase?: string;
                deleted: { progress: number; notifications: number };
            } = {
                status: 'in_progress',
                phase: 'progress',
                deleted: { progress: 0, notifications: 0 },
            };

            let attempts = 0;
            while (currentResult.status === 'in_progress' && attempts < 20) {
                currentResult = await t.mutation(internal.objectives.deleteObjectiveContinue, {
                    objectiveId,
                    phase: currentResult.phase === 'notifications' ? 'notifications' : 'progress',
                    cursor: null,
                    totalProgressDeleted: currentResult.deleted.progress,
                    totalNotificationsDeleted: currentResult.deleted.notifications,
                });
                attempts++;
            }

            expect(attempts).toBeLessThan(20);
            expect(currentResult.status).toBe('completed');
            expect(currentResult.deleted.progress).toBe(60);
            expect(currentResult.deleted.notifications).toBe(60);

            const objective = await t.run(async ctx => ctx.db.get(objectiveId));
            expect(objective).toBeNull();
        });

        test('should be idempotent when continuation runs after objective deletion', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Idempotent Delete Objective',
                targetValue: 100,
                currentValue: 0,
            });

            let currentResult: {
                status: string;
                phase?: string;
                deleted: { progress: number; notifications: number };
            } = {
                status: 'in_progress',
                phase: 'progress',
                deleted: { progress: 0, notifications: 0 },
            };

            let attempts = 0;
            while (currentResult.status === 'in_progress' && attempts < 10) {
                currentResult = await t.mutation(internal.objectives.deleteObjectiveContinue, {
                    objectiveId,
                    phase: currentResult.phase === 'notifications' ? 'notifications' : 'progress',
                    cursor: null,
                    totalProgressDeleted: currentResult.deleted.progress,
                    totalNotificationsDeleted: currentResult.deleted.notifications,
                });
                attempts++;
            }

            expect(currentResult.status).toBe('completed');

            const secondResult = await t.mutation(internal.objectives.deleteObjectiveContinue, {
                objectiveId,
                phase: 'notifications',
                cursor: null,
                totalProgressDeleted: currentResult.deleted.progress,
                totalNotificationsDeleted: currentResult.deleted.notifications,
            });

            expect(secondResult.status).toBe('completed');
            expect(secondResult.noOp).toBe(true);
            expect(secondResult.deleted).toEqual(currentResult.deleted);
        });
    });

    describe('markAllReadBatch batching', () => {
        test('should mark all notifications as read when >100 exist', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Test Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const notificationCount = 105;
            const notificationIds: Id<'notifications'>[] = [];

            await t.run(async ctx => {
                for (let i = 0; i < notificationCount; i++) {
                    const id = await ctx.db.insert('notifications', {
                        userId,
                        organizationId,
                        objective: objectiveId,
                        read: false,
                        notificationType: 'reminder',
                        notificationDate: Date.now() + i,
                        message: `Notification ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    notificationIds.push(id);
                }
            });

            const initialUnread = await t.run(async ctx => {
                const notifs = await ctx.db
                    .query('notifications')
                    .withIndex('by_user_read', q => q.eq('userId', userId).eq('read', false))
                    .collect();
                return notifs.length;
            });
            expect(initialUnread).toBe(notificationCount);

            let currentResult: {
                status: string;
                processedInBatch: number;
                totalProcessed: number;
            } = await t.mutation(internal.notifications.markAllReadBatch, {
                userId,
                organizationId,
                cursor: null,
                totalProcessed: 0,
            });

            let attempts = 0;
            while (currentResult.status === 'in_progress' && attempts < 10) {
                currentResult = await t.mutation(internal.notifications.markAllReadBatch, {
                    userId,
                    organizationId,
                    cursor: null,
                    totalProcessed: currentResult.totalProcessed,
                });
                attempts++;
            }

            expect(attempts).toBeLessThan(10);
            expect(currentResult.status).toBe('completed');
            expect(currentResult.totalProcessed).toBe(notificationCount);

            const finalUnread = await t.run(async ctx => {
                const notifs = await ctx.db
                    .query('notifications')
                    .withIndex('by_user_read', q => q.eq('userId', userId).eq('read', false))
                    .collect();
                return notifs.length;
            });
            expect(finalUnread).toBe(0);

            const allNotifications = await t.run(async ctx => {
                const notifs = await ctx.db
                    .query('notifications')
                    .withIndex('by_user_date', q => q.eq('userId', userId))
                    .collect();
                return notifs;
            });
            expect(allNotifications.length).toBe(notificationCount);
            expect(allNotifications.every(notification => notification.read)).toBe(true);
        });

        test('should handle already-read notifications without infinite loop', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Test Objective',
                targetValue: 100,
                currentValue: 0,
            });

            await t.run(async ctx => {
                for (let i = 0; i < 50; i++) {
                    await ctx.db.insert('notifications', {
                        userId,
                        organizationId,
                        objective: objectiveId,
                        read: true,
                        notificationType: 'reminder',
                        notificationDate: Date.now() + i,
                        message: `Read notification ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const result = await t.mutation(internal.notifications.markAllReadBatch, {
                userId,
                organizationId,
                cursor: null,
                totalProcessed: 0,
            });

            expect(result.status).toBe('completed');
            expect(result.totalProcessed).toBe(0);
        });
    });

    describe('calculateUserStreak pagination', () => {
        test('should calculate streak correctly with >100 objectives', async () => {
            const objectiveCount = 105;
            const objectiveIds: Id<'objectives'>[] = [];

            await t.run(async ctx => {
                for (let i = 0; i < objectiveCount; i++) {
                    const id = await ctx.db.insert('objectives', {
                        userId,
                        organizationId,
                        scope: 'personal',
                        title: `Objective ${i}`,
                        targetValue: 100,
                        currentValue: 0,
                        status: 'active',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    objectiveIds.push(id);
                }
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await t.run(async ctx => {
                for (let i = 0; i < 50; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveIds[i],
                        userId,
                        updatedValue: 50,
                        updateDate: today.getTime(),
                        comment: 'Progress',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await t.run(async ctx => {
                return calculateUserStreak({ db: ctx.db }, userId, organizationId);
            });

            expect(streak).toBe(1);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            await t.run(async ctx => {
                for (let i = 50; i < 100; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveIds[i],
                        userId,
                        updatedValue: 50,
                        updateDate: yesterday.getTime(),
                        comment: 'Progress yesterday',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak2 = await t.run(async ctx => {
                return calculateUserStreak({ db: ctx.db }, userId, organizationId);
            });

            expect(streak2).toBe(2);
        });

        test('should handle objectives with many progress updates each', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Objective with Many Updates',
                targetValue: 1000,
                currentValue: 0,
            });

            await t.run(async ctx => {
                for (let i = 0; i < 150; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        userId,
                        updatedValue: i + 1,
                        updateDate: Date.now() - i * 24 * 60 * 60 * 1000,
                        comment: `Day ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await t.run(async ctx => {
                return calculateUserStreak({ db: ctx.db }, userId, organizationId);
            });

            expect(streak).toBeGreaterThan(0);
        });
    });

    describe('calculateOrganizationStreak pagination', () => {
        test('should calculate org streak correctly with >100 org objectives', async () => {
            const objectiveCount = 105;
            const objectiveIds: Id<'objectives'>[] = [];

            await t.run(async ctx => {
                for (let i = 0; i < objectiveCount; i++) {
                    const id = await ctx.db.insert('objectives', {
                        userId,
                        organizationId,
                        scope: 'organization',
                        title: `Org Objective ${i}`,
                        targetValue: 100,
                        currentValue: 0,
                        status: 'active',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    objectiveIds.push(id);
                }
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await t.run(async ctx => {
                for (let i = 0; i < 50; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveIds[i],
                        userId,
                        updatedValue: 50,
                        updateDate: today.getTime(),
                        comment: 'Progress',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await t.run(async ctx => {
                return calculateOrganizationStreak({ db: ctx.db }, organizationId);
            });

            expect(streak).toBe(1);
        });
    });

    describe('end-to-end deleteObjective flow', () => {
        test('should completely delete objective with 200+ related records', async () => {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: 'Large Objective',
                targetValue: 1000,
                currentValue: 0,
            });

            await t.run(async ctx => {
                for (let i = 0; i < 100; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        userId,
                        updatedValue: i + 1,
                        updateDate: Date.now() + i,
                        comment: `Update ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
                for (let i = 0; i < 100; i++) {
                    await ctx.db.insert('notifications', {
                        userId,
                        organizationId,
                        objective: objectiveId,
                        read: i % 2 === 0,
                        notificationType: 'progress',
                        notificationDate: Date.now() + i,
                        message: `Notification ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const startResult = await userIdentity.mutation(api.objectives.deleteObjective, {
                id: objectiveId,
            });
            expect(startResult.status).toBe('deletion_started');

            let currentResult: {
                status: string;
                phase?: string;
                deleted: { progress: number; notifications: number };
            } = {
                status: 'in_progress',
                phase: 'progress',
                deleted: { progress: 0, notifications: 0 },
            };

            let attempts = 0;
            while (currentResult.status === 'in_progress' && attempts < 30) {
                currentResult = await t.mutation(internal.objectives.deleteObjectiveContinue, {
                    objectiveId,
                    phase: currentResult.phase === 'notifications' ? 'notifications' : 'progress',
                    cursor: null,
                    totalProgressDeleted: currentResult.deleted.progress,
                    totalNotificationsDeleted: currentResult.deleted.notifications,
                });
                attempts++;
            }

            expect(attempts).toBeLessThan(10);
            expect(currentResult.status).toBe('completed');
            expect(currentResult.deleted.progress).toBe(100);
            expect(currentResult.deleted.notifications).toBe(100);

            const remainingProgress = await t.run(async ctx => {
                const updates = await ctx.db
                    .query('progressUpdates')
                    .withIndex('by_objective', q => q.eq('objective', objectiveId))
                    .collect();
                return updates.length;
            });
            expect(remainingProgress).toBe(0);

            const remainingNotifications = await t.run(async ctx => {
                const notifs = await ctx.db
                    .query('notifications')
                    .withIndex('by_objective', q => q.eq('objective', objectiveId))
                    .collect();
                return notifs.length;
            });
            expect(remainingNotifications).toBe(0);

            const objective = await t.run(async ctx => ctx.db.get(objectiveId));
            expect(objective).toBeNull();
        });
    });
});
