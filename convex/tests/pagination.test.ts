import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    createTestObjective,
} from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel } from '../_generated/dataModel';

describe('convex pagination', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: string;
    let _organizationId: string;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-pagination-' + randomSuffix,
            email: 'pagination@example.com-' + randomSuffix,
            name: 'Pagination User ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
            emailVerified: true,
        };

        const userData = await createTestUser(t, user);
        userId = user.userId;

        const orgId = await createTestOrganization(t, {
            name: 'Test Organization ' + randomSuffix,
            slug: 'test-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId: userId,
            role: 'owner',
        });

        _organizationId = orgId;

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

    test('getObjectivesByUser paginates', async () => {
        for (let i = 0; i < 15; i++) {
            await createTestObjective(t, {
                userId,
                organizationId: _organizationId,
                title: `Objective ${i}`,
                targetValue: 100,
                currentValue: 10,
            });
        }

        const page1 = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 5, cursor: null },
        });
        const page2 = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 5, cursor: page1.continueCursor },
        });

        expect(page1.page.length).toBe(5);
        expect(page2.page.length).toBe(5);
        expect(page1.continueCursor).not.toBeNull();
    });

    test('getUpdateProgressByObjectiveId paginates', async () => {
        const objectiveId = await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Pagination Objective',
            targetValue: 100,
            currentValue: 10,
        });

        for (let i = 0; i < 12; i++) {
            await userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: objectiveId,
                updatedValue: i + 1,
                updateDate: Date.now() + i * 1000,
            });
        }

        const page1 = await userIdentity.query(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId,
            paginationOpts: { numItems: 5, cursor: null },
        });
        const page2 = await userIdentity.query(api.update_progress.getUpdateProgressByObjectiveId, {
            objectiveId,
            paginationOpts: { numItems: 5, cursor: page1.continueCursor },
        });

        expect(page1.page.length).toBe(5);
        expect(page2.page.length).toBe(5);
        expect(page1.continueCursor).not.toBeNull();
    });

    test('getNotificationsByUser paginates', async () => {
        const objectiveId = await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Notifications Objective',
            targetValue: 100,
            currentValue: 10,
        });

        for (let i = 0; i < 12; i++) {
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: `Notification ${i}`,
            });
        }

        const page1 = await userIdentity.query(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 5, cursor: null },
        });
        const page2 = await userIdentity.query(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 5, cursor: page1.continueCursor },
        });

        expect(page1.page.length).toBe(5);
        expect(page2.page.length).toBe(5);
        expect(page1.continueCursor).not.toBeNull();
    });
});
