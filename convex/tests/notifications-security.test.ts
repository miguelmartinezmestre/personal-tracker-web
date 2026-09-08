import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    createTestObjective,
    createTestNotification,
} from './test_helpers';
import type { TestConvexForDataModel } from 'convex-test';
import type { DataModel, Id } from '../_generated/dataModel';

describe('notifications security - cross-user access prevention', async () => {
    const t = initConvexTest();

    let userAIdentity: TestConvexForDataModel<DataModel>;
    let userBIdentity: TestConvexForDataModel<DataModel>;
    let adminIdentity: TestConvexForDataModel<DataModel>;

    let userAId: Id<'user'>;
    let userBId: Id<'user'>;
    let adminId: Id<'user'>;
    let sharedOrganizationId: Id<'organization'>;
    let userAObjectiveId: Id<'objectives'>;
    let userBObjectiveId: Id<'objectives'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        sharedOrganizationId = await createTestOrganization(t, {
            name: 'Shared Security Test Org ' + randomSuffix,
            slug: 'shared-security-org-' + randomSuffix,
        });

        const userA = {
            userId: 'security-user-a-' + randomSuffix,
            email: 'security-user-a@example.com-' + randomSuffix,
            name: 'Security User A ' + randomSuffix,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };
        const userAData = await createTestUser(t, userA);
        userAId = userAData.docId;

        await createTestMember(t, {
            organizationId: sharedOrganizationId,
            userId: userAId,
            role: 'member',
        });

        userAIdentity = t.withIdentity({
            subject: userAData.docId,
            role: userA.role,
            email: userA.email,
            name: userA.name,
            password: userA.password,
            emailVerified: userA.emailVerified,
            createdAt: Date.now(),
            userId: userAData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const userB = {
            userId: 'security-user-b-' + randomSuffix,
            email: 'security-user-b@example.com-' + randomSuffix,
            name: 'Security User B ' + randomSuffix,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };
        const userBData = await createTestUser(t, userB);
        userBId = userBData.docId;

        await createTestMember(t, {
            organizationId: sharedOrganizationId,
            userId: userBId,
            role: 'member',
        });

        userBIdentity = t.withIdentity({
            subject: userBData.docId,
            role: userB.role,
            email: userB.email,
            name: userB.name,
            password: userB.password,
            emailVerified: userB.emailVerified,
            createdAt: Date.now(),
            userId: userBData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const admin = {
            userId: 'security-admin-' + randomSuffix,
            email: 'security-admin@example.com-' + randomSuffix,
            name: 'Security Admin ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        };
        const adminData = await createTestUser(t, admin);
        adminId = adminData.docId;

        await createTestMember(t, {
            organizationId: sharedOrganizationId,
            userId: adminId,
            role: 'owner',
        });

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

        userAObjectiveId = await createTestObjective(t, {
            userId: userAId,
            organizationId: sharedOrganizationId,
            title: 'User A Objective',
            targetValue: 100,
            currentValue: 0,
        });

        userBObjectiveId = await createTestObjective(t, {
            userId: userBId,
            organizationId: sharedOrganizationId,
            title: 'User B Objective',
            targetValue: 100,
            currentValue: 0,
        });
    });

    describe('CRITICAL: User B cannot access User A notifications in same org', () => {
        test('user B cannot modify user A notification via setNotificationRead', async () => {
            const notificationA = await createTestNotification(t, {
                userId: userAId,
                organizationId: sharedOrganizationId,
                objective: userAObjectiveId,
                notificationType: 'reminder',
                message: 'User A Private Notification',
            });

            expect(notificationA.read).toBe(false);

            await expect(
                userBIdentity.mutation(api.notifications.setNotificationRead, {
                    id: notificationA._id,
                    read: true,
                })
            ).rejects.toThrow(/Not authorized|NOT_AUTHORIZED_NOTIFICATION|RLS/);

            const unchangedNotification = await userAIdentity.run(async ctx => {
                return await ctx.db.get('notifications', notificationA._id);
            });
            expect(unchangedNotification?.read).toBe(false);
        });

        test('user B cannot delete user A notification', async () => {
            const notificationA = await createTestNotification(t, {
                userId: userAId,
                organizationId: sharedOrganizationId,
                objective: userAObjectiveId,
                notificationType: 'reminder',
                message: 'User A Private Notification',
            });

            await expect(
                userBIdentity.mutation(api.notifications.deleteNotification, {
                    id: notificationA._id,
                })
            ).rejects.toThrow(/Not authorized|NOT_AUTHORIZED_NOTIFICATION|RLS/);

            const stillExists = await userAIdentity.run(async ctx => {
                return await ctx.db.get('notifications', notificationA._id);
            });
            expect(stillExists).not.toBeNull();
        });

        test('user B queries only return their own notifications, not user A', async () => {
            await createTestNotification(t, {
                userId: userAId,
                organizationId: sharedOrganizationId,
                objective: userAObjectiveId,
                notificationType: 'reminder',
                message: 'User A Reminder 1',
            });
            await createTestNotification(t, {
                userId: userAId,
                organizationId: sharedOrganizationId,
                objective: userAObjectiveId,
                notificationType: 'deadline',
                message: 'User A Deadline',
            });

            await createTestNotification(t, {
                userId: userBId,
                organizationId: sharedOrganizationId,
                objective: userBObjectiveId,
                notificationType: 'reminder',
                message: 'User B Reminder',
            });

            const userBNotifications = await userBIdentity.query(
                api.notifications.getNotificationsByUser,
                {
                    paginationOpts: { numItems: 10, cursor: null },
                }
            );

            expect(userBNotifications.page).toHaveLength(1);
            expect(userBNotifications.page[0]?.message).toBe('User B Reminder');
            expect(userBNotifications.page[0]?.userId).toBe(userBId);

            const containsUserANotifications = userBNotifications.page.some(
                notification => notification.userId === userAId
            );
            expect(containsUserANotifications).toBe(false);
        });
    });

    describe('Organization broadcast notifications access', () => {
        test('user B cannot modify organization notification even if they can see it', async () => {
            const orgNotification = await adminIdentity.run(async ctx => {
                const id = await ctx.db.insert('notifications', {
                    userId: adminId,
                    organizationId: sharedOrganizationId,
                    read: false,
                    notificationType: 'status',
                    notificationDate: Date.now(),
                    message: 'Organization Status Update',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return await ctx.db.get('notifications', id);
            });
            if (!orgNotification) {
                throw new Error('Expected organization notification');
            }

            await expect(
                userBIdentity.mutation(api.notifications.setNotificationRead, {
                    id: orgNotification._id,
                    read: true,
                })
            ).rejects.toThrow(/Not authorized|NOT_AUTHORIZED_NOTIFICATION|RLS/);
        });
    });

    describe('Admin access verification', () => {
        test('admin can modify any notification', async () => {
            const notificationA = await createTestNotification(t, {
                userId: userAId,
                organizationId: sharedOrganizationId,
                objective: userAObjectiveId,
                notificationType: 'reminder',
                message: 'User A For Admin Modify Test',
            });

            const updated = await adminIdentity.mutation(api.notifications.setNotificationRead, {
                id: notificationA._id,
                read: true,
            });

            expect(updated?.read).toBe(true);
        });

        test('admin can delete any notification', async () => {
            const notificationA = await createTestNotification(t, {
                userId: userAId,
                organizationId: sharedOrganizationId,
                objective: userAObjectiveId,
                notificationType: 'reminder',
                message: 'User A For Admin Delete Test',
            });

            await adminIdentity.mutation(api.notifications.deleteNotification, {
                id: notificationA._id,
            });

            const deleted = await userAIdentity.run(async ctx => {
                return await ctx.db.get('notifications', notificationA._id);
            });
            expect(deleted).toBeNull();
        });
    });

    describe('Edge cases and security boundaries', () => {
        test('personal objective notifications remain private even in org context', async () => {
            const personalObjectiveId = await createTestObjective(t, {
                userId: userAId,
                organizationId: sharedOrganizationId,
                title: 'User A Personal Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const personalNotification = await createTestNotification(t, {
                userId: userAId,
                organizationId: sharedOrganizationId,
                objective: personalObjectiveId,
                notificationType: 'reminder',
                message: 'User A Personal Reminder',
            });

            await expect(
                userBIdentity.mutation(api.notifications.setNotificationRead, {
                    id: personalNotification._id,
                    read: true,
                })
            ).rejects.toThrow(/Not authorized|NOT_AUTHORIZED_NOTIFICATION/);

            const unchanged = await userAIdentity.run(async ctx => {
                return await ctx.db.get('notifications', personalNotification._id);
            });
            expect(unchanged?.read).toBe(false);
        });

        test('notification read status changes are isolated per user', async () => {
            const notificationA = await createTestNotification(t, {
                userId: userAId,
                organizationId: sharedOrganizationId,
                objective: userAObjectiveId,
                notificationType: 'reminder',
                message: 'User A Isolation Test',
            });

            const notificationB = await createTestNotification(t, {
                userId: userBId,
                organizationId: sharedOrganizationId,
                objective: userBObjectiveId,
                notificationType: 'reminder',
                message: 'User B Isolation Test',
            });

            await userAIdentity.mutation(api.notifications.setNotificationRead, {
                id: notificationA._id,
                read: true,
            });

            const notificationBStatus = await userBIdentity.run(async ctx => {
                return await ctx.db.get('notifications', notificationB._id);
            });
            expect(notificationBStatus?.read).toBe(false);
        });
    });
});
