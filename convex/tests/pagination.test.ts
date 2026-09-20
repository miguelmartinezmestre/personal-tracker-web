import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
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
import type { FunctionArgs, FunctionReturnType } from 'convex/server';
import {
    MAX_PAGE_BYTES_READ,
    MAX_PAGE_ITEMS,
    MAX_PAGE_ROWS_READ,
    withInvalidCursorRetry,
    withPaginationLimits,
} from '../utils/pagination';

describe('pagination cost limits', () => {
    test('clamps caller-controlled page and read budgets', () => {
        expect(
            withPaginationLimits({
                numItems: 10_000,
                cursor: null,
                maximumRowsRead: 50_000,
                maximumBytesRead: 50_000_000,
            })
        ).toMatchObject({
            numItems: MAX_PAGE_ITEMS,
            maximumRowsRead: MAX_PAGE_ROWS_READ,
            maximumBytesRead: MAX_PAGE_BYTES_READ,
        });
    });

    test('rejects non-positive or fractional pagination budgets', () => {
        expect(() => withPaginationLimits({ numItems: 0, cursor: null })).toThrow();
        expect(() =>
            withPaginationLimits({ numItems: 10, cursor: null, maximumRowsRead: 1.5 })
        ).toThrow();
    });

    test('keeps server limits when replacing a malformed cursor', async () => {
        let receivedOptions: Parameters<typeof withPaginationLimits>[0] | undefined;

        await withInvalidCursorRetry(
            {
                numItems: 10_000,
                cursor: 'not-json',
                maximumRowsRead: 50_000,
                maximumBytesRead: 50_000_000,
            },
            async paginationOpts => {
                receivedOptions = paginationOpts;
                return null;
            }
        );

        expect(receivedOptions).toEqual({
            numItems: MAX_PAGE_ITEMS,
            cursor: null,
            maximumRowsRead: MAX_PAGE_ROWS_READ,
            maximumBytesRead: MAX_PAGE_BYTES_READ,
        });
    });
});

describe('convex pagination', () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const userData = await createTestUser(t, {
            userId: 'test-user-pagination-' + randomSuffix,
            email: 'pagination@example.com-' + randomSuffix,
            name: 'Pagination User ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: true,
        });
        userId = userData.docId;

        organizationId = await createTestOrganization(t, {
            name: 'Test Organization ' + randomSuffix,
            slug: 'test-org-' + randomSuffix,
        });
        await createTestMember(t, { organizationId, userId, role: 'owner' });

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: userData.role ?? 'globalAdmin',
            email: userData.email,
            name: userData.name,
            password: 'test-password',
            emailVerified: true,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    async function collectSearchResults(
        args: Omit<FunctionArgs<typeof api.objectives.searchObjectivesPaginated>, 'paginationOpts'>
    ): Promise<FunctionReturnType<typeof api.objectives.searchObjectivesPaginated>['page']> {
        const matches: FunctionReturnType<typeof api.objectives.searchObjectivesPaginated>['page'] =
            [];
        let cursor: string | null = null;

        for (let segment = 0; segment < 30; segment++) {
            const result: FunctionReturnType<typeof api.objectives.searchObjectivesPaginated> =
                await userIdentity.query(api.objectives.searchObjectivesPaginated, {
                    ...args,
                    paginationOpts: { numItems: 50, cursor },
                });
            if (!result.needsContinuation) {
                matches.push(...result.page);
            }
            if (result.isDone) {
                return matches;
            }
            cursor = result.continueCursor;
        }

        throw new Error('Objective search did not finish within the test segment budget');
    }

    test('core paginated queries return bounded pages and continuation cursors', async () => {
        const objectiveId = await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Pagination Objective',
            targetValue: 100,
            currentValue: 10,
        });

        for (let i = 0; i < 15; i++) {
            await createTestObjective(t, {
                userId,
                organizationId,
                title: `Objective ${i}`,
                targetValue: 100,
                currentValue: 10,
            });
            await userIdentity.mutation(api.categories.createCategory, {
                name: `Category ${i}`,
                color: '#10b981',
            });
            await createTestNotification(t, {
                userId,
                organizationId,
                objective: objectiveId,
                notificationType: 'deadline',
                message: `Notification ${i}`,
            });
        }

        for (let i = 0; i < 12; i++) {
            await userIdentity.mutation(api.update_progress.createUpdateProgress, {
                objective: objectiveId,
                updatedValue: i + 1,
                updateDate: Date.now() + i * 1000,
            });
        }

        await userIdentity.run(async ctx => {
            const now = Date.now();
            for (let i = 0; i < 15; i++) {
                await ctx.db.insert('auditLogs', {
                    userId,
                    organizationId,
                    action: 'objective.created',
                    resourceType: 'objective',
                    resourceId: `obj-${i}`,
                    createdAt: now - i * 1000,
                });
            }
        });

        const queries = [
            () =>
                userIdentity.query(api.objectives.getObjectives, {
                    paginationOpts: { numItems: 5, cursor: null },
                }),
            () =>
                userIdentity.query(api.update_progress.getUpdateProgressByObjectiveId, {
                    objectiveId,
                    paginationOpts: { numItems: 5, cursor: null },
                }),
            () =>
                userIdentity.query(api.notifications.getNotificationsByUser, {
                    paginationOpts: { numItems: 5, cursor: null },
                }),
            () =>
                userIdentity.query(api.categories.getCategoriesByUser, {
                    paginationOpts: { numItems: 5, cursor: null },
                }),
            () =>
                userIdentity.query(api.auditLogs.getAuditLogs, {
                    paginationOpts: { numItems: 5, cursor: null },
                }),
        ];

        for (const query of queries) {
            const page = await query();
            expect(page.page).toHaveLength(5);
            expect(page.continueCursor).not.toBeNull();
            expect(page.isDone).toBe(false);
        }
    });

    test('paginated queries recover from invalid cursors', async () => {
        for (let i = 0; i < 6; i++) {
            const objectiveId = await createTestObjective(t, {
                userId,
                organizationId,
                title: `Objective ${i}`,
                targetValue: 100,
                currentValue: 10,
            });
            await userIdentity.mutation(api.categories.createCategory, {
                name: `Stale Cursor Category ${i}`,
                color: '#10b981',
            });
            await createTestNotification(t, {
                userId,
                organizationId,
                objective: objectiveId,
                notificationType: 'deadline',
                message: `Stale Cursor Notification ${i}`,
            });
        }

        const invalidCursor = 'not-a-valid-convex-cursor';
        const categories = await userIdentity.query(api.categories.getCategoriesByUser, {
            paginationOpts: { numItems: 5, cursor: invalidCursor },
        });
        const objectives = await userIdentity.query(api.objectives.getObjectives, {
            paginationOpts: { numItems: 5, cursor: invalidCursor },
        });
        const notifications = await userIdentity.query(api.notifications.getNotificationsByUser, {
            paginationOpts: { numItems: 5, cursor: invalidCursor },
        });

        expect(categories.page).toHaveLength(5);
        expect(objectives.page).toHaveLength(5);
        expect(notifications.page).toHaveLength(5);
    });

    test('getObjectives applies status, category, and deadline filters before pagination', async () => {
        const now = Date.now();
        const today = new Date(now);
        const startOfToday = Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
        );
        const dueToday = startOfToday + 12 * 60 * 60 * 1000;
        const nextWeek = now + 8 * 24 * 60 * 60 * 1000;
        const launchCategoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'Launch',
            color: '#10b981',
        });
        const financeCategoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'Finance',
            color: '#3b82f6',
        });

        for (const objective of [
            {
                title: 'Org launch due today',
                status: 'active' as const,
                categoryId: launchCategoryId,
                deadline: dueToday,
            },
            {
                title: 'Org launch next week',
                status: 'active' as const,
                categoryId: launchCategoryId,
                deadline: nextWeek,
            },
            {
                title: 'Org finance due today',
                status: 'active' as const,
                categoryId: financeCategoryId,
                deadline: dueToday,
            },
            {
                title: 'Org completed launch due today',
                status: 'completed' as const,
                categoryId: launchCategoryId,
                deadline: dueToday,
                currentValue: 100,
            },
        ]) {
            await createTestObjective(t, {
                userId,
                organizationId,
                targetValue: 100,
                currentValue: objective.currentValue ?? 10,
                ...objective,
            });
        }

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
            organizationId,
            title: 'Overdue objective',
            targetValue: 100,
            currentValue: 10,
            deadline: now - 24 * 60 * 60 * 1000,
        });
        await createTestObjective(t, {
            userId,
            organizationId,
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

    test('searchObjectivesPaginated returns matching active-organization objectives', async () => {
        const otherUser = await createTestUser(t, {
            userId: 'other-user-pagination',
            email: 'other-pagination@example.com',
            name: 'Other Pagination User',
            role: 'user',
            emailVerified: true,
        });

        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Quarterly Revenue Goal',
            targetValue: 100,
            currentValue: 10,
        });
        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Weekly Fitness Goal',
            targetValue: 100,
            currentValue: 10,
        });
        await createTestObjective(t, {
            userId: otherUser.docId,
            organizationId,
            title: 'Private Revenue Goal',
            targetValue: 100,
            currentValue: 10,
        });

        const result = await collectSearchResults({
            search: 'Revenue',
        });

        expect(result.map(objective => objective.title).sort()).toEqual([
            'Private Revenue Goal',
            'Quarterly Revenue Goal',
        ]);
    });

    test('searchObjectivesPaginated matches titles only', async () => {
        const categoryId = await userIdentity.mutation(api.categories.createCategory, {
            name: 'RareCategoryToken',
            color: '#10b981',
        });
        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Distinctive title token',
            description: 'rare-description-token',
            categoryId,
            targetValue: 100,
            currentValue: 10,
        });

        const titleResult = await collectSearchResults({
            search: 'Distinctive',
        });
        const categoryResult = await collectSearchResults({
            search: 'RareCategoryToken',
        });
        const descriptionResult = await collectSearchResults({
            search: 'rare-description-token',
        });

        expect(titleResult.map(objective => objective.title)).toEqual(['Distinctive title token']);
        expect(categoryResult).toEqual([]);
        expect(descriptionResult).toEqual([]);
    });

    test('searchObjectivesPaginated applies deadlineRange before returning matches', async () => {
        const now = Date.now();
        const date = new Date(now);
        const startOfToday = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        const tomorrow = startOfToday + 36 * 60 * 60 * 1000;
        const today = startOfToday + 12 * 60 * 60 * 1000;

        for (let i = 0; i < 60; i++) {
            await createTestObjective(t, {
                userId,
                organizationId,
                title: `Bounded Search Contract ${i.toString().padStart(2, '0')}`,
                targetValue: 100,
                currentValue: 10,
                deadline: tomorrow,
            });
        }
        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Bounded Search Contract Today Target',
            targetValue: 100,
            currentValue: 10,
            deadline: today,
        });

        const result = await collectSearchResults({
            search: 'Bounded Search Contract',
            deadlineRange: 'today',
        });

        expect(result.map(objective => objective.title)).toContain(
            'Bounded Search Contract Today Target'
        );
    });

    test('searchObjectivesPaginated finds matches beyond the old candidate scan window', async () => {
        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Needle Objective Beyond Scan Window',
            targetValue: 100,
            currentValue: 10,
        });

        for (let i = 0; i < 510; i++) {
            await createTestObjective(t, {
                userId,
                organizationId,
                title: `Noise Objective ${i.toString().padStart(3, '0')}`,
                targetValue: 100,
                currentValue: 10,
            });
        }

        const result = await collectSearchResults({
            search: 'Needle Objective',
        });

        expect(result.map(objective => objective.title)).toContain(
            'Needle Objective Beyond Scan Window'
        );
    });
});
