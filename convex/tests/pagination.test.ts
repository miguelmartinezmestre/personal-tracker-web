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

    test('getCategoriesByUser paginates', async () => {
        for (let i = 0; i < 15; i++) {
            await userIdentity.mutation(api.categories.createCategory, {
                name: `Category ${i}`,
                color: '#10b981',
            });
        }

        const page1 = await userIdentity.query(api.categories.getCategoriesByUser, {
            paginationOpts: { numItems: 5, cursor: null },
        });
        const page2 = await userIdentity.query(api.categories.getCategoriesByUser, {
            paginationOpts: { numItems: 5, cursor: page1.continueCursor },
        });

        expect(page1.page.length).toBe(5);
        expect(page2.page.length).toBe(5);
        expect(page1.continueCursor).not.toBeNull();
        expect(page1.isDone).toBe(false);
    });

    test('getAuditLogs paginates', async () => {
        await userIdentity.run(async ctx => {
            const now = Date.now();
            for (let i = 0; i < 15; i++) {
                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId: _organizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: `obj-${i}`,
                    severity: 'info',
                    createdAt: now - i * 1000,
                });
            }
        });

        const page1 = await userIdentity.query(api.auditLogs.getAuditLogs, {
            paginationOpts: { numItems: 5, cursor: null },
        });
        const page2 = await userIdentity.query(api.auditLogs.getAuditLogs, {
            paginationOpts: { numItems: 5, cursor: page1.continueCursor },
        });

        expect(page1.page.length).toBe(5);
        expect(page2.page.length).toBe(5);
        expect(page1.continueCursor).not.toBeNull();
        expect(page1.isDone).toBe(false);
    });

    test('getObjectivesByUser with status filter', async () => {
        // Create mix of active and completed objectives
        for (let i = 0; i < 5; i++) {
            await createTestObjective(t, {
                userId,
                organizationId: _organizationId,
                title: `Active ${i}`,
                targetValue: 100,
                currentValue: 10,
                status: 'active',
            });
        }
        for (let i = 0; i < 3; i++) {
            await createTestObjective(t, {
                userId,
                organizationId: _organizationId,
                title: `Completed ${i}`,
                targetValue: 100,
                currentValue: 100,
                status: 'completed',
            });
        }

        const activeResult = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 50, cursor: null },
            status: 'active',
        });

        const completedResult = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 50, cursor: null },
            status: 'completed',
        });

        expect(activeResult.page.every(o => o.status === 'active')).toBe(true);
        expect(completedResult.page.every(o => o.status === 'completed')).toBe(true);
        expect(activeResult.page.length).toBe(5);
        expect(completedResult.page.length).toBe(3);
    });
});
