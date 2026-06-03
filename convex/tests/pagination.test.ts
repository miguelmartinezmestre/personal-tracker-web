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
import { DataModel, Id } from '../_generated/dataModel';
import { normalizeObjectiveListFilters } from '../domain/objectives/list';

describe('convex pagination', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let _organizationId: Id<'organization'>;

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
        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Test Organization ' + randomSuffix,
            slug: 'test-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId,
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

    test('normalizeObjectiveListFilters passes filters through', () => {
        expect(normalizeObjectiveListFilters({})).toEqual({
            status: undefined,
            categoryId: undefined,
            deadlineRange: undefined,
        });

        expect(
            normalizeObjectiveListFilters({
                status: 'active',
                categoryId: 'category_123' as Id<'categories'>,
                deadlineRange: 'today',
            })
        ).toEqual({
            status: 'active',
            categoryId: 'category_123',
            deadlineRange: 'today',
        });
    });

    test('getObjectives paginates', async () => {
        for (let i = 0; i < 15; i++) {
            await createTestObjective(t, {
                userId,
                organizationId: _organizationId,
                title: `Objective ${i}`,
                targetValue: 100,
                currentValue: 10,
            });
        }

        const page1 = await userIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 5, cursor: null },
        });
        const page2 = await userIdentity.query(api.objectives.getObjectives, {
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

    test('paginated queries recover from invalid cursors', async () => {
        for (let i = 0; i < 6; i++) {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId: _organizationId,
                title: `Objective ${i}`,
                targetValue: 100,
                currentValue: 10,
            });
            await userIdentity.mutation(api.categories.createCategory, {
                name: `Stale Cursor Category ${i}`,
                color: '#10b981',
            });
            await userIdentity.mutation(api.notifications.createNotification, {
                objective: objectiveId,
                notificationType: 'reminder',
                message: `Stale Cursor Notification ${i}`,
            });
        }

        const invalidCursor = 'not-a-valid-convex-cursor';

        const categoriesFromStaleCursor = await userIdentity.query(
            api.categories.getCategoriesByUser,
            {
                paginationOpts: { numItems: 5, cursor: invalidCursor },
            }
        );
        const objectivesFromStaleCursor = await userIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 5, cursor: invalidCursor },
        });
        const notificationsFromStaleCursor = await userIdentity.query(
            api.notifications.getNotificationsByUser,
            {
                paginationOpts: { numItems: 5, cursor: invalidCursor },
            }
        );

        expect(categoriesFromStaleCursor.page).toHaveLength(5);
        expect(objectivesFromStaleCursor.page).toHaveLength(5);
        expect(notificationsFromStaleCursor.page).toHaveLength(5);
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

    test('getObjectives with status filter', async () => {
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

        const activeResult = await userIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 50, cursor: null },
            status: 'active',
        });

        const completedResult = await userIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 50, cursor: null },
            status: 'completed',
        });

        expect(activeResult.page.every(objective => objective.status === 'active')).toBe(true);
        expect(completedResult.page.every(objective => objective.status === 'completed')).toBe(
            true
        );
        expect(activeResult.page.length).toBe(5);
        expect(completedResult.page.length).toBe(3);
    });

    test('getObjectives filters deadline ranges before pagination', async () => {
        const now = Date.now();
        const today = now + 60 * 60 * 1000;
        const nextWeek = now + 8 * 24 * 60 * 60 * 1000;

        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Due today',
            targetValue: 100,
            currentValue: 10,
            deadline: today,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Due next week',
            targetValue: 100,
            currentValue: 10,
            deadline: nextWeek,
        });

        const todayResult = await userIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 10, cursor: null },
            deadlineRange: 'today',
        });

        expect(todayResult.page.map(objective => objective.title)).toEqual(['Due today']);
    });

    test('getObjectives combines deadline range, status, and category before pagination', async () => {
        const now = Date.now();
        const dueToday = now + 60 * 60 * 1000;
        const nextWeek = now + 8 * 24 * 60 * 60 * 1000;

        const launchCategoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'Launch',
            color: '#10b981',
        });
        const financeCategoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'Finance',
            color: '#3b82f6',
        });

        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Org launch due today',
            targetValue: 100,
            currentValue: 10,
            status: 'active',
            categoryId: launchCategoryId,
            deadline: dueToday,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Org launch next week',
            targetValue: 100,
            currentValue: 10,
            status: 'active',
            categoryId: launchCategoryId,
            deadline: nextWeek,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Org finance due today',
            targetValue: 100,
            currentValue: 10,
            status: 'active',
            categoryId: financeCategoryId,
            deadline: dueToday,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Org completed launch due today',
            targetValue: 100,
            currentValue: 100,
            status: 'completed',
            categoryId: launchCategoryId,
            deadline: dueToday,
        });

        const result = await userIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 10, cursor: null },
            status: 'active',
            categoryId: launchCategoryId,
            deadlineRange: 'today',
        });

        expect(result.page.map(objective => objective.title)).toEqual(['Org launch due today']);
    });

    test('deadlineRange overdue excludes objectives without deadlines', async () => {
        const now = Date.now();

        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Overdue objective',
            targetValue: 100,
            currentValue: 10,
            deadline: now - 24 * 60 * 60 * 1000,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'No deadline objective',
            targetValue: 100,
            currentValue: 10,
        });

        const result = await userIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 10, cursor: null },
            deadlineRange: 'overdue',
        });

        expect(result.page.map(objective => objective.title)).toEqual(['Overdue objective']);
    });

    test('searchObjectivesQuery returns matching authorized objectives without cursor pages', async () => {
        const otherUser = await createTestUser(t, {
            userId: 'other-user-pagination',
            email: 'other-pagination@example.com',
            name: 'Other Pagination User',
            role: 'user',
            emailVerified: true,
        });

        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Quarterly Revenue Goal',
            targetValue: 100,
            currentValue: 10,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Weekly Fitness Goal',
            targetValue: 100,
            currentValue: 10,
        });
        await createTestObjective(t, {
            userId: otherUser.docId,
            organizationId: _organizationId,
            title: 'Private Revenue Goal',
            targetValue: 100,
            currentValue: 10,
        });

        const result = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'Revenue',
            limit: 50,
        });

        // Tenant model: search returns every matching objective in the active organization,
        // regardless of which member created it.
        expect(result.map(objective => objective.title).sort()).toEqual([
            'Private Revenue Goal',
            'Quarterly Revenue Goal',
        ]);
    });

    test('searchObjectivesQuery does not match objective descriptions', async () => {
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Plain title',
            description: 'Contains the rare-description-token',
            targetValue: 100,
            currentValue: 10,
        });

        // Search is title-only, so a description-only token must not match.
        const result = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'rare-description-token',
            limit: 50,
        });

        expect(result).toEqual([]);
    });

    test('searchObjectivesQuery matches only by objective title', async () => {
        const categoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'RareCategoryToken',
            color: '#10b981',
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Distinctive title token',
            description: 'rare-description-token',
            categoryId,
            targetValue: 100,
            currentValue: 10,
        });

        const titleResult = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'Distinctive',
            limit: 50,
        });
        const categoryResult = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'RareCategoryToken',
            limit: 50,
        });
        const descriptionResult = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'rare-description-token',
            limit: 50,
        });

        expect(titleResult.map(objective => objective.title)).toEqual(['Distinctive title token']);
        // Search is title-only: category name and description no longer match.
        expect(categoryResult).toEqual([]);
        expect(descriptionResult).toEqual([]);
    });

    test('searchObjectivesQuery applies deadlineRange before the bounded search result limit', async () => {
        const now = Date.now();
        const tomorrow = now + 24 * 60 * 60 * 1000;
        const today = now + 60 * 60 * 1000;

        for (let i = 0; i < 60; i++) {
            await createTestObjective(t, {
                userId,
                organizationId: _organizationId,
                title: `Bounded Search Contract ${i.toString().padStart(2, '0')}`,
                targetValue: 100,
                currentValue: 10,
                deadline: tomorrow,
            });
        }
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Bounded Search Contract Today Target',
            targetValue: 100,
            currentValue: 10,
            deadline: today,
        });

        const result = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'Bounded Search Contract',
            deadlineRange: 'today',
            limit: 50,
        });

        expect(result.map(objective => objective.title)).toContain(
            'Bounded Search Contract Today Target'
        );
    });

    test('searchObjectivesQuery finds matches beyond the old candidate scan window', async () => {
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Needle Objective Beyond Scan Window',
            targetValue: 100,
            currentValue: 10,
        });

        for (let i = 0; i < 510; i++) {
            await createTestObjective(t, {
                userId,
                organizationId: _organizationId,
                title: `Noise Objective ${i.toString().padStart(3, '0')}`,
                targetValue: 100,
                currentValue: 10,
            });
        }

        const result = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'Needle Objective',
            limit: 50,
        });

        expect(result.map(objective => objective.title)).toEqual([
            'Needle Objective Beyond Scan Window',
        ]);
    });

    test('searchObjectivesQuery matches only by objective title', async () => {
        const categoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'OrganizationCategoryToken',
            color: '#10b981',
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Org searchable title',
            description: 'Includes organization-description-token',
            categoryId,
            targetValue: 100,
            currentValue: 10,
        });

        const titleResult = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'searchable',
            limit: 50,
        });
        const descriptionResult = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'organization-description-token',
            limit: 50,
        });
        const categoryResult = await userIdentity.query(api.objectives.searchObjectivesQuery, {
            search: 'OrganizationCategoryToken',
            limit: 50,
        });

        expect(titleResult.map(objective => objective.title)).toEqual(['Org searchable title']);
        // Search is title-only: description and category name no longer match.
        expect(descriptionResult).toEqual([]);
        expect(categoryResult).toEqual([]);
    });
});
