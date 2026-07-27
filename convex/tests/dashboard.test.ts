import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import type { DataModel, Id } from '../_generated/dataModel';
import type { TestConvexForDataModel } from 'convex-test';

describe('convex dashboard', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const userData = await createTestUser(t, {
            userId: 'test-user-dashboard-' + randomSuffix,
            email: 'dashboard-test@example.com-' + randomSuffix,
            name: 'Dashboard Test User ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        });
        userId = userData.docId;

        organizationId = await createTestOrganization(t, {
            name: 'Dashboard Org ' + randomSuffix,
            slug: 'dashboard-org-' + randomSuffix,
        });
        await createTestMember(t, { organizationId, userId, role: 'owner' });

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: userData.role ?? 'globalAdmin',
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
    });

    test('getDashboardStats returns zeroes and counts active vs completed objectives', async () => {
        await expect(
            userIdentity.query(api.dashboard.getDashboardStats, {})
        ).resolves.toMatchObject({
            totalObjectives: 0,
            completedObjectives: 0,
            pendingObjectives: 0,
        });

        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Active 1',
            targetValue: 100,
            currentValue: 25,
            status: 'active',
        });
        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Active 2',
            targetValue: 100,
            currentValue: 50,
            status: 'active',
        });
        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Completed',
            targetValue: 100,
            currentValue: 100,
            status: 'completed',
        });

        await expect(
            userIdentity.query(api.dashboard.getDashboardStats, {})
        ).resolves.toMatchObject({
            totalObjectives: 3,
            completedObjectives: 1,
            pendingObjectives: 2,
        });
    });

    test('getMonthlyProgress returns six buckets and counts updates by month', async () => {
        const objectiveId = await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Monthly Progress Test',
            targetValue: 100,
            currentValue: 0,
        });
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 15);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

        await userIdentity.run(async ctx => {
            for (const updateDate of [
                currentMonth.getTime(),
                currentMonth.getTime() + 1000,
                currentMonth.getTime() + 2000,
                lastMonth.getTime(),
                lastMonth.getTime() + 1000,
            ]) {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    createdBy: userId,
                    organizationId,
                    updatedValue: 5,
                    updateDate,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
        });

        const result = await userIdentity.query(api.dashboard.getMonthlyProgress, {
            now: now.getTime(),
        });
        const currentMonthKey = `${currentMonth.getFullYear()}-${`${currentMonth.getMonth() + 1}`.padStart(2, '0')}`;
        const lastMonthKey = `${lastMonth.getFullYear()}-${`${lastMonth.getMonth() + 1}`.padStart(2, '0')}`;

        expect(result.items).toHaveLength(6);
        expect(result.isTruncated).toBe(false);
        expect(result.items.find(month => month.monthKey === currentMonthKey)?.count).toBe(3);
        expect(result.items.find(month => month.monthKey === lastMonthKey)?.count).toBe(2);
    });

    test('getObjectivesWithMostProgress sorts active objectives and limits to top five', async () => {
        await userIdentity.run(async ctx => {
            for (let i = 1; i <= 7; i++) {
                await ctx.db.insert('objectives', {
                    createdBy: userId,
                    ownerId: userId,
                    visibility: 'private',
                    organizationId,
                    title: `Objective ${i}`,
                    targetValue: 100,
                    currentValue: i * 10,
                    startValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
            await ctx.db.insert('objectives', {
                createdBy: userId,
                ownerId: userId,
                visibility: 'private',
                organizationId,
                title: 'Completed High Progress',
                targetValue: 100,
                currentValue: 100,
                startValue: 0,
                status: 'completed',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });

        const result = await userIdentity.query(api.dashboard.getObjectivesWithMostProgress, {});

        expect(result.items).toHaveLength(5);
        expect(result.items.map(item => item.progress)).toEqual([70, 60, 50, 40, 30]);
        expect(result.items.some(item => item.objective === 'Completed High Progress')).toBe(false);
    });

    test('getUpcomingDeadlines filters active objectives inside the next seven days and sorts them', async () => {
        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;

        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Deadline in 5 days',
            targetValue: 100,
            currentValue: 50,
            status: 'active',
            deadline: now + 5 * DAY_MS,
        });
        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Deadline in 2 days',
            targetValue: 100,
            currentValue: 50,
            status: 'active',
            deadline: now + 2 * DAY_MS,
        });
        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Deadline in 10 days',
            targetValue: 100,
            currentValue: 50,
            status: 'active',
            deadline: now + 10 * DAY_MS,
        });
        await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Completed with deadline',
            targetValue: 100,
            currentValue: 100,
            status: 'completed',
            deadline: now + DAY_MS,
        });

        const result = await userIdentity.query(api.dashboard.getUpcomingDeadlines, { now });

        expect(result.items.map(item => item.title)).toEqual([
            'Deadline in 2 days',
            'Deadline in 5 days',
        ]);
        expect(result.isTruncated).toBe(false);
    });

    test('getRecentActivity counts recent updates and objective changes only', async () => {
        const objectiveId = await createTestObjective(t, {
            userId,
            organizationId,
            title: 'Recent Activity Test',
            targetValue: 100,
            currentValue: 0,
        });
        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;

        await userIdentity.run(async ctx => {
            await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                createdBy: userId,
                organizationId,
                updatedValue: 5,
                updateDate: now,
                createdAt: now,
                updatedAt: now,
            });
            await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                createdBy: userId,
                organizationId,
                updatedValue: 5,
                updateDate: now - 40 * DAY_MS,
                createdAt: now - 40 * DAY_MS,
                updatedAt: now - 40 * DAY_MS,
            });
            await ctx.db.insert('objectives', {
                createdBy: userId,
                ownerId: userId,
                visibility: 'private',
                organizationId,
                title: 'Recently Completed',
                targetValue: 100,
                currentValue: 100,
                status: 'completed',
                completedAt: now,
                createdAt: now,
                updatedAt: now,
            });
            await ctx.db.insert('objectives', {
                createdBy: userId,
                ownerId: userId,
                visibility: 'private',
                organizationId,
                title: 'Old completion edited recently',
                targetValue: 100,
                currentValue: 100,
                status: 'completed',
                completedAt: now - 60 * DAY_MS,
                createdAt: now - 90 * DAY_MS,
                updatedAt: now,
            });
        });

        const activity = await userIdentity.query(api.dashboard.getRecentActivity, { now });

        expect(activity).toMatchObject({
            progressUpdatesCount: 1,
            objectivesCreatedCount: 2,
            objectivesCompletedCount: 1,
            periodDays: 30,
        });
    });

    test('getRecentActivity reports truncation per metric', async () => {
        const now = Date.now();
        const objectiveId = await userIdentity.run(ctx =>
            ctx.db.insert('objectives', {
                createdBy: userId,
                ownerId: userId,
                visibility: 'private',
                organizationId,
                title: 'Old objective with recent activity',
                targetValue: 1_000,
                currentValue: 0,
                status: 'active',
                createdAt: now - 60 * 24 * 60 * 60 * 1000,
                updatedAt: now,
            })
        );
        await userIdentity.run(async ctx => {
            for (let index = 0; index < 101; index++) {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    createdBy: userId,
                    organizationId,
                    updatedValue: index,
                    updateDate: now - index,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        });

        const activity = await userIdentity.query(api.dashboard.getRecentActivity, { now });

        expect(activity).toMatchObject({
            progressUpdatesCount: 100,
            objectivesCreatedCount: 0,
            objectivesCompletedCount: 0,
            progressUpdatesTruncated: true,
            objectivesCreatedTruncated: false,
            objectivesCompletedTruncated: false,
            isTruncated: true,
        });
    });

    test('dashboard queries reject unauthenticated users', async () => {
        const now = Date.now();
        await expect(t.query(api.dashboard.getDashboardStats, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated|AUTH_REQUIRED/
        );
        await expect(t.query(api.dashboard.getMonthlyProgress, { now })).rejects.toThrow(
            /Unauthenticated|User not authenticated|AUTH_REQUIRED/
        );
        await expect(t.query(api.dashboard.getObjectivesWithMostProgress, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated|AUTH_REQUIRED/
        );
        await expect(t.query(api.dashboard.getUpcomingDeadlines, { now })).rejects.toThrow(
            /Unauthenticated|User not authenticated|AUTH_REQUIRED/
        );
        await expect(t.query(api.dashboard.getRecentActivity, { now })).rejects.toThrow(
            /Unauthenticated|User not authenticated|AUTH_REQUIRED/
        );
    });
});
