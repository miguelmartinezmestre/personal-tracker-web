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
import { normalizeObjectiveListFilters } from '../utils/objectiveList';

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

    test('normalizeObjectiveListFilters removes UI sentinel values', () => {
        expect(
            normalizeObjectiveListFilters({
                category: 'all',
            })
        ).toEqual({
            status: undefined,
            category: undefined,
            deadlineRange: undefined,
        });

        expect(
            normalizeObjectiveListFilters({
                status: 'active',
                category: 'Launch',
                deadlineRange: 'today',
            })
        ).toEqual({
            status: 'active',
            category: 'Launch',
            deadlineRange: 'today',
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

    test('getObjectivesByUser filters deadline ranges before pagination', async () => {
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

        const todayResult = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 10, cursor: null },
            deadlineRange: 'today',
        });

        expect(todayResult.page.map(o => o.title)).toEqual(['Due today']);
    });

    test('getOrganizationObjectives combines deadline range, status, and category before pagination', async () => {
        const now = Date.now();
        const dueToday = now + 60 * 60 * 1000;
        const nextWeek = now + 8 * 24 * 60 * 60 * 1000;

        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            scope: 'organization',
            title: 'Org launch due today',
            targetValue: 100,
            currentValue: 10,
            status: 'active',
            category: 'Launch',
            deadline: dueToday,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            scope: 'organization',
            title: 'Org launch next week',
            targetValue: 100,
            currentValue: 10,
            status: 'active',
            category: 'Launch',
            deadline: nextWeek,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            scope: 'organization',
            title: 'Org finance due today',
            targetValue: 100,
            currentValue: 10,
            status: 'active',
            category: 'Finance',
            deadline: dueToday,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            scope: 'organization',
            title: 'Org completed launch due today',
            targetValue: 100,
            currentValue: 100,
            status: 'completed',
            category: 'Launch',
            deadline: dueToday,
        });

        const result = await userIdentity.query(api.objectives.getOrganizationObjectives, {
            paginationOpts: { numItems: 10, cursor: null },
            status: 'active',
            category: 'Launch',
            deadlineRange: 'today',
        });

        expect(result.page.map(o => o.title)).toEqual(['Org launch due today']);
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

        const result = await userIdentity.query(api.objectives.getObjectivesByUser, {
            paginationOpts: { numItems: 10, cursor: null },
            deadlineRange: 'overdue',
        });

        expect(result.page.map(o => o.title)).toEqual(['Overdue objective']);
    });

    test('searchObjectivesByUser returns matching authorized objectives without cursor pages', async () => {
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

        const result = await userIdentity.query(api.objectives.searchObjectivesByUser, {
            search: 'Revenue',
            limit: 50,
        });

        expect(result.map(o => o.title)).toEqual(['Quarterly Revenue Goal']);
    });

    test('searchObjectivesByUser matches objective descriptions', async () => {
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Plain title',
            description: 'Contains the rare-description-token',
            targetValue: 100,
            currentValue: 10,
        });

        const result = await userIdentity.query(api.objectives.searchObjectivesByUser, {
            search: 'rare-description-token',
            limit: 50,
        });

        expect(result.map(o => o.title)).toEqual(['Plain title']);
    });

    test('searchObjectivesByUser matches objective categories', async () => {
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            title: 'Category-only match title',
            category: 'RareCategoryToken',
            targetValue: 100,
            currentValue: 10,
        });

        const result = await userIdentity.query(api.objectives.searchObjectivesByUser, {
            search: 'RareCategoryToken',
            limit: 50,
        });

        expect(result.map(o => o.title)).toEqual(['Category-only match title']);
    });

    test('searchObjectivesByUser applies deadlineRange before the bounded search result limit', async () => {
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

        const result = await userIdentity.query(api.objectives.searchObjectivesByUser, {
            search: 'Bounded Search Contract',
            deadlineRange: 'today',
            limit: 50,
        });

        expect(result.map(o => o.title)).toContain('Bounded Search Contract Today Target');
    });

    test('searchOrganizationObjectives matches title, description, and category for organization objectives', async () => {
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            scope: 'organization',
            title: 'Org searchable title',
            description: 'Includes organization-description-token',
            category: 'OrganizationCategoryToken',
            targetValue: 100,
            currentValue: 10,
        });
        await createTestObjective(t, {
            userId,
            organizationId: _organizationId,
            scope: 'personal',
            title: 'Personal organization-description-token',
            targetValue: 100,
            currentValue: 10,
        });

        const descriptionResult = await userIdentity.query(
            api.objectives.searchOrganizationObjectives,
            {
                search: 'organization-description-token',
                limit: 50,
            }
        );
        const categoryResult = await userIdentity.query(
            api.objectives.searchOrganizationObjectives,
            {
                search: 'OrganizationCategoryToken',
                limit: 50,
            }
        );

        expect(descriptionResult.map(o => o.title)).toEqual(['Org searchable title']);
        expect(categoryResult.map(o => o.title)).toEqual(['Org searchable title']);
    });
});
