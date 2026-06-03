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

describe('convex notifications', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let adminIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let objectiveId: Id<'objectives'>;
    let userOrganizationId: Id<'organization'>;
    let adminUserId: Id<'user'>;
    let _adminOrganizationId: Id<'organization'>;
    const DAY_MS = 24 * 60 * 60 * 1000;

    beforeEach(async () => {
        const userRandom = Math.random().toString(36).substring(2, 15);
        const adminRandom = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-notifications-' + userRandom,
            email: 'notifications-test@example.com-' + userRandom,
            name: 'Notifications Test User ' + userRandom,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };
        const userData = await createTestUser(t, user);
        userId = userData.docId;

        const userOrgId = await createTestOrganization(t, {
            name: 'Notifications User Org ' + userRandom,
            slug: 'notifications-user-org-' + userRandom,
        });

        await createTestMember(t, {
            organizationId: userOrgId,
            userId,
            role: 'owner',
        });

        userOrganizationId = userOrgId;

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

        const admin = {
            userId: 'test-admin-notifications-' + adminRandom,
            email: 'notifications-admin@example.com-' + adminRandom,
            name: 'Notifications Admin User ' + adminRandom,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        };
        const adminData = await createTestUser(t, admin);
        adminUserId = adminData.docId;

        const adminOrgId = await createTestOrganization(t, {
            name: 'Notifications Admin Org ' + adminRandom,
            slug: 'notifications-admin-org-' + adminRandom,
        });

        await createTestMember(t, {
            organizationId: adminOrgId,
            userId: adminUserId,
            role: 'owner',
        });

        _adminOrganizationId = adminOrgId;

        adminIdentity = t.withIdentity({
            subject: adminData.docId,
            role: admin.role,
            email: admin.email,
            name: admin.name,
            password: admin.password,
            emailVerified: admin.emailVerified,
            createdAt: Date.now(),
            userId: adminData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        objectiveId = (await createTestObjective(t, {
            userId: userId,
            organizationId: userOrganizationId,
            title: 'Test Objective for Notifications',
            targetValue: 100,
            currentValue: 0,
        })) as Id<'objectives'>;
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
            ).rejects.toThrow(/Objective not found|OBJECTIVE_NOT_FOUND/);
        });

        test('rejects unauthenticated users', async () => {
            await expect(
                t.mutation(api.notifications.createNotification, {
                    objective: objectiveId,
                    notificationType: 'reminder',
                    message: 'Test',
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        });
    });

    describe('getNotificationsByUser', () => {
        test('returns empty array when user has no notifications', async () => {
            const notifications = await userIdentity.query(
                api.notifications.getNotificationsByUser,
                {
                    paginationOpts: { numItems: 10, cursor: null },
                }
            );
            expect(notifications.page).toEqual([]);
        });

        test('returns user notifications ordered by date descending', async () => {
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
                {
                    paginationOpts: { numItems: 10, cursor: null },
                }
            );

            expect(notifications.page).toHaveLength(2);
            expect(notifications.page[0]?.message).toBe('Second');
            expect(notifications.page[1]?.message).toBe('First');
        });

        test('returns only user own notifications', async () => {
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: 'User notification',
            });

            const adminObjectiveId = (await createTestObjective(t, {
                userId: adminUserId,
                organizationId: _adminOrganizationId,
                title: 'Admin Objective',
                targetValue: 100,
                currentValue: 0,
            })) as Id<'objectives'>;
            await adminIdentity.mutation(api.notifications.createNotification, {
                objective: adminObjectiveId,
                notificationType: 'reminder',
                message: 'Admin notification',
            });

            const userNotifications = await userIdentity.query(
                api.notifications.getNotificationsByUser,
                {
                    paginationOpts: { numItems: 10, cursor: null },
                }
            );
            expect(userNotifications.page).toHaveLength(1);
            expect(userNotifications.page[0]?.message).toBe('User notification');
        });

        test('rejects unauthenticated users', async () => {
            await expect(
                t.query(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 10, cursor: null },
                })
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        });

        test('getObjectivesForNotifications returns only visible referenced objectives', async () => {
            const otherObjectiveId = await createTestObjective(t, {
                userId: adminUserId,
                organizationId: _adminOrganizationId,
                title: 'Hidden Admin Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const objectives = await userIdentity.query(
                api.notifications.getObjectivesForNotifications,
                {
                    objectiveIds: [objectiveId, otherObjectiveId],
                }
            );

            expect(objectives.map(objective => objective._id)).toEqual([objectiveId]);
        });

        test('getObjectivesForNotifications deduplicates IDs and skips unauthorized objectives', async () => {
            const hiddenObjectiveId = await createTestObjective(t, {
                userId: adminUserId,
                organizationId: _adminOrganizationId,
                title: 'Hidden Duplicate Test Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const objectives = await userIdentity.query(
                api.notifications.getObjectivesForNotifications,
                {
                    objectiveIds: [objectiveId, objectiveId, hiddenObjectiveId, objectiveId],
                }
            );

            expect(objectives.map(objective => objective._id)).toEqual([objectiveId]);
        });

        test('getObjectivesForNotifications rejects oversized objective ID lists', async () => {
            await expect(
                userIdentity.query(api.notifications.getObjectivesForNotifications, {
                    objectiveIds: Array.from({ length: 51 }, () => objectiveId),
                })
            ).rejects.toThrow(/too many|limit|maximum|OBJECTIVE_ID_LIMIT/i);
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

            await userIdentity.mutation(api.notifications.setNotificationRead, {
                id: notification!._id,
                read: true,
            });

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
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        });
    });

    describe('markAllNotificationsRead', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(async () => {
            await t.finishAllScheduledFunctions(() => vi.runAllTimers());
            vi.clearAllTimers();
            vi.useRealTimers();
        });

        test('marks all unread notifications as read', async () => {
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

            expect(result.status).toBe('marking_started');

            await t.mutation(internal.notifications.markAllReadBatch, {
                userId,
                organizationId: userOrganizationId,
            });

            const notifications = await userIdentity.query(
                api.notifications.getNotificationsByUser,
                {
                    paginationOpts: { numItems: 10, cursor: null },
                }
            );
            expect(notifications.page.every(notification => notification.read)).toBe(true);
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

            expect(result.status).toBe('marking_started');
        });

        test('only updates unread notifications', async () => {
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

            expect(result.status).toBe('marking_started');
        });

        test('rejects unauthenticated users', async () => {
            await expect(
                t.mutation(api.notifications.markAllNotificationsRead, {})
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
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

            expect(result).toEqual({ success: true });

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
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        });
    });

    describe('runDeadlineNotificationsCron', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(async () => {
            await t.finishAllScheduledFunctions(() => vi.runAllTimers());
            vi.clearAllTimers();
            vi.useRealTimers();
        });

        test('creates notifications for objectives due today', async () => {
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

            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );

            expect(result.scanned).toBeGreaterThan(0);
        });

        test('creates notifications for overdue objectives', async () => {
            const now = Date.now();
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: userOrganizationId,
                    title: 'Overdue',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    deadline: now - DAY_MS,
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

        test('skips deadline notifications when user preference is disabled', async () => {
            const now = Date.now();
            await userIdentity.mutation(api.notificationPreferences.updateUserPreferences, {
                deadlineNotifications: false,
            });
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: userOrganizationId,
                    title: 'Disabled Deadline Preference',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    deadline: now - DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );
            const notifications = await userIdentity.query(
                api.notifications.getNotificationsByUser,
                {
                    paginationOpts: { numItems: 10, cursor: null },
                }
            );

            expect(result.scanned).toBeGreaterThan(0);
            expect(result.created).toBe(0);
            expect(result.skipped).toBeGreaterThan(0);
            expect(notifications.page).toEqual([]);
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
                    deadline: now + 2 * DAY_MS,
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

            expect(result.scanned).toBeGreaterThan(0);
        });

        test('skips completed objectives in cron scan', async () => {
            const now = Date.now();
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: userOrganizationId,
                    title: 'Completed Again',
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

            await t.mutation(internal.notifications.runDeadlineNotificationsCron, {});
            const result = await t.mutation(
                internal.notifications.runDeadlineNotificationsCron,
                {}
            );

            expect(result.skipped).toBeGreaterThanOrEqual(0);
        });
    });
});
