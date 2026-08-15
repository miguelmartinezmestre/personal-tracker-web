import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestNotification,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import type { DataModel, Id } from '../_generated/dataModel';
import type { TestConvexForDataModel } from 'convex-test';

describe('convex notifications', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let adminUserId: Id<'user'>;
    let objectiveId: Id<'objectives'>;
    let userOrganizationId: Id<'organization'>;
    let adminOrganizationId: Id<'organization'>;
    const DAY_MS = 24 * 60 * 60 * 1000;

    beforeEach(async () => {
        const userRandom = Math.random().toString(36).substring(2, 15);
        const userData = await createTestUser(t, {
            userId: 'test-user-notifications-' + userRandom,
            email: 'notifications-test@example.com-' + userRandom,
            name: 'Notifications Test User ' + userRandom,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        });
        userId = userData.docId;

        userOrganizationId = await createTestOrganization(t, {
            name: 'Notifications User Org ' + userRandom,
            slug: 'notifications-user-org-' + userRandom,
        });
        await createTestMember(t, { organizationId: userOrganizationId, userId, role: 'owner' });

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: userData.role ?? 'user',
            email: userData.email,
            name: userData.name,
            password: 'test-password',
            emailVerified: false,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const adminRandom = Math.random().toString(36).substring(2, 15);
        const adminData = await createTestUser(t, {
            userId: 'test-admin-notifications-' + adminRandom,
            email: 'notifications-admin@example.com-' + adminRandom,
            name: 'Notifications Admin User ' + adminRandom,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        });
        adminUserId = adminData.docId;
        adminOrganizationId = await createTestOrganization(t, {
            name: 'Notifications Admin Org ' + adminRandom,
            slug: 'notifications-admin-org-' + adminRandom,
        });
        await createTestMember(t, {
            organizationId: adminOrganizationId,
            userId: adminUserId,
            role: 'owner',
        });
        objectiveId = await createTestObjective(t, {
            userId,
            organizationId: userOrganizationId,
            title: 'Test Objective for Notifications',
            targetValue: 100,
            currentValue: 0,
        });
    });

    test('getNotificationsByUser returns own notifications ordered by date', async () => {
        await createTestNotification(t, {
            userId,
            organizationId: userOrganizationId,
            objective: objectiveId,
            notificationType: 'reminder',
            message: 'First',
            notificationDate: Date.now() - DAY_MS,
        });
        await createTestNotification(t, {
            userId,
            organizationId: userOrganizationId,
            objective: objectiveId,
            notificationType: 'reminder',
            message: 'Second',
            notificationDate: Date.now(),
        });

        const adminObjectiveId = await createTestObjective(t, {
            userId: adminUserId,
            organizationId: adminOrganizationId,
            title: 'Admin Objective',
            targetValue: 100,
            currentValue: 0,
        });
        await createTestNotification(t, {
            userId: adminUserId,
            organizationId: adminOrganizationId,
            objective: adminObjectiveId,
            notificationType: 'reminder',
            message: 'Admin notification',
        });

        const result = await userIdentity.query(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(result.page.map(notification => notification.message)).toEqual(['Second', 'First']);
        expect(result.page.every(notification => notification.userId === userId)).toBe(true);
    });

    test('getNotificationOverview caps unread badge count and reports truncation', async () => {
        const now = Date.now();
        await t.run(async ctx => {
            for (let index = 0; index < 101; index += 1) {
                await ctx.db.insert('notifications', {
                    userId,
                    organizationId: userOrganizationId,
                    objective: objectiveId,
                    read: false,
                    notificationType: 'reminder',
                    notificationDate: now + index,
                    message: `Unread ${index}`,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        });

        const overview = await userIdentity.query(api.notifications.getNotificationOverview, {});
        expect(overview.notifications).toHaveLength(20);
        expect(overview.unreadCount).toBe(100);
        expect(overview.isUnreadTruncated).toBe(true);
    });

    test('getObjectivesForNotifications returns visible deduplicated objectives and rejects oversized lists', async () => {
        const hiddenObjectiveId = await createTestObjective(t, {
            userId: adminUserId,
            organizationId: adminOrganizationId,
            title: 'Hidden Admin Objective',
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
        await expect(
            userIdentity.query(api.notifications.getObjectivesForNotifications, {
                objectiveIds: Array.from({ length: 51 }, () => objectiveId),
            })
        ).rejects.toThrow(/too many|limit|maximum|OBJECTIVE_ID_LIMIT/i);
    });

    test('setNotificationRead toggles read state', async () => {
        const notification = await createTestNotification(t, {
            userId,
            organizationId: userOrganizationId,
            objective: objectiveId,
            notificationType: 'reminder',
            message: 'Toggle',
        });

        await expect(
            userIdentity.mutation(api.notifications.setNotificationRead, {
                id: notification!._id,
                read: true,
            })
        ).resolves.toMatchObject({ read: true });
        await expect(
            userIdentity.mutation(api.notifications.setNotificationRead, {
                id: notification!._id,
                read: false,
            })
        ).resolves.toMatchObject({ read: false });
    });

    test('markAllNotificationsRead marks unread notifications in the active organization', async () => {
        const read = await createTestNotification(t, {
            userId,
            organizationId: userOrganizationId,
            objective: objectiveId,
            notificationType: 'reminder',
            message: 'Read',
        });
        await userIdentity.mutation(api.notifications.setNotificationRead, {
            id: read!._id,
            read: true,
        });
        await createTestNotification(t, {
            userId,
            organizationId: userOrganizationId,
            objective: objectiveId,
            notificationType: 'deadline',
            message: 'Unread',
        });

        await expect(
            userIdentity.mutation(api.notifications.markAllNotificationsRead, {})
        ).resolves.toMatchObject({ status: 'marking_started' });
        await t.mutation(internal.notifications.markAllReadBatch, {
            userId,
            organizationId: userOrganizationId,
        });

        const result = await userIdentity.query(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 10, cursor: null },
        });
        expect(result.page).toHaveLength(2);
        expect(result.page.every(notification => notification.read)).toBe(true);
    });

    test('deleteNotification removes the notification document', async () => {
        const notification = await createTestNotification(t, {
            userId,
            organizationId: userOrganizationId,
            objective: objectiveId,
            notificationType: 'reminder',
            message: 'To Delete',
        });

        await expect(
            userIdentity.mutation(api.notifications.deleteNotification, {
                id: notification!._id,
            })
        ).resolves.toEqual({ success: true });
        await expect(
            userIdentity.run(async ctx => ctx.db.get(notification!._id))
        ).resolves.toBeNull();
    });

    test('deadline cron creates due notifications once for eligible active objectives', async () => {
        const now = Date.now();
        for (const [title, deadline] of [
            ['Due Today', now + 3600000],
            ['Overdue', now - DAY_MS],
            ['Due Soon', now + 2 * DAY_MS],
        ] as const) {
            await createTestObjective(t, {
                userId,
                organizationId: userOrganizationId,
                title,
                targetValue: 100,
                currentValue: 50,
                status: 'active',
                deadline,
            });
        }

        const firstRun = await t.mutation(internal.notifications.runDeadlineNotificationsCron, {});
        const secondRun = await t.mutation(internal.notifications.runDeadlineNotificationsCron, {});
        const result = await userIdentity.query(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(firstRun.created).toBeGreaterThan(0);
        expect(secondRun.created).toBe(0);
        expect(result.page.length).toBe(firstRun.created);
    });

    test('deadline cron skips disabled preferences and ineligible objectives', async () => {
        const now = Date.now();
        await userIdentity.mutation(api.notificationPreferences.updateUserPreferences, {
            deadlineNotifications: false,
        });
        await userIdentity.run(async ctx => {
            for (const objective of [
                {
                    title: 'Disabled Preference',
                    status: 'active' as const,
                    deadline: now + DAY_MS,
                },
                {
                    title: 'Completed',
                    status: 'completed' as const,
                    deadline: now + DAY_MS,
                    currentValue: 100,
                },
                {
                    title: 'Deleted',
                    status: 'active' as const,
                    deadline: now + DAY_MS,
                    deletedAt: now,
                    deletedBy: userId,
                },
                {
                    title: 'No Deadline',
                    status: 'active' as const,
                },
            ]) {
                await ctx.db.insert('objectives', {
                    createdBy: userId,
                    ownerId: userId,
                    visibility: 'private',
                    organizationId: userOrganizationId,
                    targetValue: 100,
                    currentValue: objective.currentValue ?? 50,
                    createdAt: now,
                    updatedAt: now,
                    ...objective,
                });
            }
        });

        const cron = await t.mutation(internal.notifications.runDeadlineNotificationsCron, {});
        const result = await userIdentity.query(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(cron.created).toBe(0);
        expect(cron.skipped).toBeGreaterThan(0);
        expect(result.page).toEqual([]);
    });

    test('public notification functions reject unauthenticated callers', async () => {
        const notification = await createTestNotification(t, {
            userId,
            organizationId: userOrganizationId,
            objective: objectiveId,
            notificationType: 'reminder',
            message: 'Private',
        });

        await expect(
            t.query(api.notifications.getNotificationsByUser, {
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        await expect(
            t.mutation(api.notifications.setNotificationRead, {
                id: notification!._id,
                read: true,
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        await expect(t.mutation(api.notifications.markAllNotificationsRead, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated|AUTH_REQUIRED/
        );
        await expect(
            t.mutation(api.notifications.deleteNotification, {
                id: notification!._id,
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
    });
});
