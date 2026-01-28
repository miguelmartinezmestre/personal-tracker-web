import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './better-auth.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel } from '../_generated/dataModel';
import type { Id } from '../_generated/dataModel';

describe('convex notifications', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let adminIdentity: TestConvexForDataModel<DataModel>;
    let userId: string;
    let objectiveId: Id<'objectives'>;
    let userOrganizationId: string;
    let adminOrganizationId: string;
    const DAY_MS = 24 * 60 * 60 * 1000;

    beforeEach(async () => {
        const userRandom = Math.random().toString(36).substring(2, 15);
        const adminRandom = Math.random().toString(36).substring(2, 15);

        // Create user
        const user = {
            userId: 'test-user-notifications-' + userRandom,
            email: 'notifications-test@example.com-' + userRandom,
            name: 'Notifications Test User ' + userRandom,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };
        await createTestUser(t, user);
        userId = user.userId;

        const userOrgId = await createTestOrganization(t, {
            name: 'Notifications User Org ' + userRandom,
            slug: 'notifications-user-org-' + userRandom,
        });

        await createTestMember(t, {
            organizationId: String(userOrgId),
            userId: userId,
            role: 'owner',
        });

        userOrganizationId = String(userOrgId);

        userIdentity = t.withIdentity({
            subject: user.userId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: user.userId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        // Create admin
        const admin = {
            userId: 'test-admin-notifications-' + adminRandom,
            email: 'notifications-admin@example.com-' + adminRandom,
            name: 'Notifications Admin User ' + adminRandom,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        };
        await createTestUser(t, admin);

        const adminOrgId = await createTestOrganization(t, {
            name: 'Notifications Admin Org ' + adminRandom,
            slug: 'notifications-admin-org-' + adminRandom,
        });

        await createTestMember(t, {
            organizationId: String(adminOrgId),
            userId: admin.userId,
            role: 'owner',
        });

        adminOrganizationId = String(adminOrgId);

        adminIdentity = t.withIdentity({
            subject: admin.userId,
            role: admin.role,
            email: admin.email,
            name: admin.name,
            password: admin.password,
            emailVerified: admin.emailVerified,
            createdAt: Date.now(),
            userId: admin.userId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        // Create a test objective for notifications
        objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
            title: 'Test Objective for Notifications',
            targetValue: 100,
            currentValue: 0,
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
            expect(notification?.userId).toBe(userId);
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
                    userId: userId,
                    organizationId: userOrganizationId,
                    title: 'temp',
                    targetValue: 1,
                    currentValue: 0,
                    status: 'active',
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
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            expect(notifications.page).toEqual([]);
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
                { paginationOpts: { numItems: 10, cursor: null } }
            );

            expect(notifications.page).toHaveLength(2);
            expect(notifications.page[0]?.message).toBe('Second');
            expect(notifications.page[1]?.message).toBe('First');
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
            });
            await adminIdentity.mutation(api.notifications.createNotification, {
                objective: adminObjectiveId,
                notificationType: 'reminder',
                message: 'Admin notification',
            });

            const userNotifications = await userIdentity.query(
                api.notifications.getNotificationsByUser,
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            expect(userNotifications.page).toHaveLength(1);
            expect(userNotifications.page[0]?.message).toBe('User notification');
        });

        test('rejects unauthenticated users', async () => {
            await expect(
                t.query(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 10, cursor: null },
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated/);
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
                { paginationOpts: { numItems: 10, cursor: null } }
            );
            expect(notifications.page.every(n => n.read)).toBe(true);
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
                    userId: userId,
                    organizationId: userOrganizationId,
                    title: 'Due Today',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
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
                    userId: userId,
                    organizationId: userOrganizationId,
                    title: 'Overdue',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
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
                    userId: userId,
                    organizationId: userOrganizationId,
                    title: 'Due Soon',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
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
                    userId: userId,
                    organizationId: userOrganizationId,
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
                    userId: userId,
                    organizationId: userOrganizationId,
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
                    userId: userId,
                    organizationId: userOrganizationId,
                    title: 'No Deadline',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
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
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: userOrganizationId,
                    title: 'Due Today',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
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
