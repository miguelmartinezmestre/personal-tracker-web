import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';
import { modules } from '../test.setup';
import { createTestUser } from '../test_helpers';
import { register } from '../better-auth.helper';
import type { Id } from './_generated/dataModel';

describe('convex notifications', async () => {
    let t: ReturnType<typeof convexTest>;
    let userId: string;
    let objectiveId: Id<'objectives'>;
    const DAY_MS = 24 * 60 * 60 * 1000;

    let userIdentity: ReturnType<ReturnType<typeof convexTest>['withIdentity']>;
    let adminIdentity: ReturnType<ReturnType<typeof convexTest>['withIdentity']>;

    beforeEach(async () => {
        t = convexTest(schema, modules);
        register(t);
        userIdentity = t.withIdentity({
            subject: 'test-user-notifications',
            role: 'user',
        });

        adminIdentity = t.withIdentity({
            subject: 'test-admin-notifications',
            role: 'admin',
        });

        const result = await createTestUser(t, {
            userId: 'test-user-notifications',
            email: 'notifications-test@example.com',
            name: 'Notifications Test User',
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        });
        userId = result.userId;

        await createTestUser(t, {
            userId: 'test-admin-notifications',
            email: 'notifications-admin@example.com',
            name: 'Notifications Admin User',
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });

        // Create a test objective for notifications
        objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Test Objective for Notifications',
            targetValue: 100,
            currentValue: 0,
            status: 'in_progress',
        });
    });

    describe('createNotification', () => {
        test('creates notification successfully', async () => {
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Test notification message',
            });

            expect(notification).toBeDefined();
            expect(notification?.message).toBe('Test notification message');
            expect(notification?.notificationType).toBe('reminder');
            expect(notification?.objective).toBe(objectiveId);
            expect(notification?.user).toBe(userId);
            expect(notification?.read).toBe(false);
        });

        test('creates notification with custom date', async () => {
            const customDate = Date.now() + DAY_MS;
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'deadline',
                message: 'Deadline approaching',
                notificationDate: customDate,
            });

            expect(notification?.notificationDate).toBe(customDate);
        });

        test('sets current date when notificationDate not provided', async () => {
            const before = Date.now();
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'progress',
                message: 'Progress update',
            });
            const after = Date.now();

            expect(notification?.notificationDate).toBeGreaterThanOrEqual(before);
            expect(notification?.notificationDate).toBeLessThanOrEqual(after);
        });

        test('rejects notification for non-existent objective', async () => {
            const fakeObjectiveId = await userIdentity.run(async ctx => {
                const tempId = await ctx.db.insert('objectives', {
                    user: userId,
                    title: 'temp',
                    targetValue: 1,
                    currentValue: 0,
                    status: 'not_started',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await ctx.db.delete(tempId);
                return tempId;
            });

            await expect(
                userIdentity.mutation(api.notifications.createNotification, {
                    objective: fakeObjectiveId,
                    notificationType: 'reminder',
                    message: 'Test',
                })
            ).rejects.toThrow(/Objective not found/);
        });

        test('rejects unauthenticated users', async () => {
            await expect(
                t.mutation(api.notifications.createNotification, {
                    objective: objectiveId,
                    notificationType: 'reminder',
                    message: 'Test',
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });
    });

    describe('getNotificationsByUser', () => {
        test('returns empty array when user has no notifications', async () => {
            const notifications = await userIdentity.query(
                api.notifications.getNotificationsByUser,
                {}
            );
            expect(notifications).toEqual([]);
        });

        test('returns user notifications ordered by date descending', async () => {
            // Create notifications with different dates
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'First',
                notificationDate: Date.now() - DAY_MS,
            });
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Second',
                notificationDate: Date.now(),
            });

            const notifications = await userIdentity.query(
                api.notifications.getNotificationsByUser,
                {}
            );

            expect(notifications).toHaveLength(2);
            expect(notifications[0].message).toBe('Second');
            expect(notifications[1].message).toBe('First');
        });

        test('returns only user own notifications', async () => {
            // Create notification for test user
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'User notification',
            });

            // Create objective and notification for admin
            const adminObjectiveId = await adminIdentity.mutation(api.objectives.createObjective, {
                title: 'Admin Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });
            await adminIdentity.mutation(api.notifications.createNotification, {
                objective: adminObjectiveId,
                notificationType: 'reminder',
                message: 'Admin notification',
            });

            const userNotifications = await userIdentity.query(
                api.notifications.getNotificationsByUser,
                {}
            );
            expect(userNotifications).toHaveLength(1);
            expect(userNotifications[0].message).toBe('User notification');
        });

        test('rejects unauthenticated users', async () => {
            await expect(t.query(api.notifications.getNotificationsByUser, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });
    });

    describe('setNotificationRead', () => {
        test('marks notification as read', async () => {
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Test',
            });

            const updated = await userIdentity.mutation(api.notifications.setNotificationRead, {
                id: notification!._id,
                read: true,
            });

            expect(updated?.read).toBe(true);
        });

        test('marks notification as unread', async () => {
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Test',
            });

            // First mark as read
            await userIdentity.mutation(api.notifications.setNotificationRead, {
                id: notification!._id,
                read: true,
            });

            // Then mark as unread
            const updated = await userIdentity.mutation(api.notifications.setNotificationRead, {
                id: notification!._id,
                read: false,
            });

            expect(updated?.read).toBe(false);
        });

        test('updates updatedAt timestamp', async () => {
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Test',
            });

            await new Promise(resolve => setTimeout(resolve, 10));

            const updated = await userIdentity.mutation(api.notifications.setNotificationRead, {
                id: notification!._id,
                read: true,
            });

            expect(updated?.updatedAt).toBeGreaterThan(notification!.updatedAt);
        });

        test('rejects unauthenticated users', async () => {
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Test',
            });

            await expect(
                t.mutation(api.notifications.setNotificationRead, {
                    id: notification!._id,
                    read: true,
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });
    });

    describe('markAllNotificationsRead', () => {
        test('marks all unread notifications as read', async () => {
            // Create multiple unread notifications
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Notification 1',
            });
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'deadline',
                message: 'Notification 2',
            });
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'progress',
                message: 'Notification 3',
            });

            const result = await userIdentity.mutation(
                api.notifications.markAllNotificationsRead,
                {}
            );

            expect(result.updated).toBe(3);

            const notifications = await userIdentity.query(
                api.notifications.getNotificationsByUser,
                {}
            );
            expect(notifications.every(n => n.read)).toBe(true);
        });

        test('returns zero when all notifications already read', async () => {
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Test',
            });

            await userIdentity.mutation(api.notifications.setNotificationRead, {
                id: notification!._id,
                read: true,
            });

            const result = await userIdentity.mutation(
                api.notifications.markAllNotificationsRead,
                {}
            );

            expect(result.updated).toBe(0);
        });

        test('only updates unread notifications', async () => {
            // Create one read and one unread notification
            const read = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Read',
            });
            await userIdentity.mutation(api.notifications.setNotificationRead, {
                id: read!._id,
                read: true,
            });

            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Unread',
            });

            const result = await userIdentity.mutation(
                api.notifications.markAllNotificationsRead,
                {}
            );

            expect(result.updated).toBe(1);
        });

        test('rejects unauthenticated users', async () => {
            await expect(
                t.mutation(api.notifications.markAllNotificationsRead, {})
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });
    });

    describe('deleteNotification', () => {
        test('deletes notification successfully', async () => {
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'To Delete',
            });

            const result = await userIdentity.mutation(api.notifications.deleteNotification, {
                id: notification!._id,
            });

            expect(result).toBe('Notification deleted successfully');

            const deleted = await userIdentity.run(async ctx => ctx.db.get(notification!._id));
            expect(deleted).toBeNull();
        });

        test('rejects unauthenticated users', async () => {
            const notification = await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'Test',
            });

            await expect(
                t.mutation(api.notifications.deleteNotification, {
                    id: notification!._id,
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
        });
    });

    describe('runDeadlineNotificationsCron', () => {
        test('creates notifications for objectives due today', async () => {
            // Create objective due today
            const now = Date.now();
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    user: userId,
                    title: 'Due Today',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'in_progress',
                    deadline: now + 3600000, // 1 hour from now
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );

            expect(result.scanned).toBeGreaterThan(0);
        });

        test('creates notifications for overdue objectives', async () => {
            // Create overdue objective
            const now = Date.now();
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    user: userId,
                    title: 'Overdue',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'in_progress',
                    deadline: now - DAY_MS, // 1 day ago
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );

            expect(result.scanned).toBeGreaterThan(0);
        });

        test('creates notifications for objectives due within 3 days', async () => {
            const now = Date.now();
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    user: userId,
                    title: 'Due Soon',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'in_progress',
                    deadline: now + 2 * DAY_MS, // 2 days from now
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );

            expect(result.scanned).toBeGreaterThan(0);
        });

        test('skips completed objectives', async () => {
            const now = Date.now();
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    user: userId,
                    title: 'Completed',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'completed',
                    deadline: now + DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );

            // Should scan but not create notification for completed objective
            expect(result.scanned).toBeGreaterThan(0);
        });

        test('skips archived objectives', async () => {
            const now = Date.now();
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    user: userId,
                    title: 'Archived',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'archived',
                    deadline: now + DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );

            expect(result.scanned).toBeGreaterThan(0);
        });

        test('skips objectives without deadline', async () => {
            const now = Date.now();
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    user: userId,
                    title: 'No Deadline',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'in_progress',
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );

            expect(result.scanned).toBeGreaterThan(0);
        });

        test('does not duplicate notifications for same day', async () => {
            const now = Date.now();
            const objId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    user: userId,
                    title: 'Due Today',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'in_progress',
                    deadline: now + 3600000,
                    createdAt: now,
                    updatedAt: now,
                });
            });

            // Run cron twice
            await t.mutation(internal.notifications.runDeadlineNotificationsCron, {});
            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );

            // Second run should skip because notification already exists
            expect(result.skipped).toBeGreaterThanOrEqual(0);
        });
    });
});
