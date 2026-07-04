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

describe('convex dashboard', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-dashboard-' + randomSuffix,
            email: 'dashboard-test@example.com-' + randomSuffix,
            name: 'Dashboard Test User ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        };

        const userData = await createTestUser(t, user);
        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Dashboard Org ' + randomSuffix,
            slug: 'dashboard-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

        organizationId = orgId;

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

    describe('getDashboardStats', () => {
        test('returns zero stats for new user with no objectives', async () => {
            const stats = await userIdentity.query(api.dashboard.getDashboardStats, {});

            expect(stats.totalObjectives).toBe(0);
            expect(stats.completedObjectives).toBe(0);
            expect(stats.pendingObjectives).toBe(0);
        });

        test('calculates correct stats with multiple objectives', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'In Progress Objective 1',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'In Progress Objective 2',
                    targetValue: 100,
                    currentValue: 25,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Completed Objective',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'completed',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const stats = await userIdentity.query(api.dashboard.getDashboardStats, {});

            expect(stats.totalObjectives).toBe(3);
            expect(stats.completedObjectives).toBe(1);
            expect(stats.pendingObjectives).toBe(2);
        });
    });

    describe('getMonthlyProgress', () => {
        test('returns empty counts when no progress updates exist', async () => {
            const monthlyProgress = await userIdentity.query(api.dashboard.getMonthlyProgress, {});

            expect(monthlyProgress.items).toHaveLength(6);
            expect(monthlyProgress.isTruncated).toBe(false);
            expect(monthlyProgress.items.every(monthEntry => monthEntry.count === 0)).toBe(true);
            expect(
                monthlyProgress.items.every(monthEntry => monthEntry.month && monthEntry.monthKey)
            ).toBe(true);
        });

        test('counts progress updates correctly by month', async () => {
            const objectiveId = await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Monthly Progress Test',
                targetValue: 100,
                currentValue: 0,
            });

            const now = new Date();
            const currentMonth = new Date(now.getFullYear(), now.getMonth(), 15);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

            for (let i = 0; i < 3; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        createdBy: userId,
                        organizationId: organizationId,
                        updatedValue: 5,
                        updateDate: currentMonth.getTime() + i * 1000,
                        comment: `Current month update ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            for (let i = 0; i < 2; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        createdBy: userId,
                        organizationId: organizationId,
                        updatedValue: 5,
                        updateDate: lastMonth.getTime() + i * 1000,
                        comment: `Last month update ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            const monthlyProgress = await userIdentity.query(api.dashboard.getMonthlyProgress, {});

            const currentMonthKey = `${currentMonth.getFullYear()}-${`${currentMonth.getMonth() + 1}`.padStart(2, '0')}`;
            const lastMonthKey = `${lastMonth.getFullYear()}-${`${lastMonth.getMonth() + 1}`.padStart(2, '0')}`;

            const currentMonthData = monthlyProgress.items.find(
                monthEntry => monthEntry.monthKey === currentMonthKey
            );
            const lastMonthData = monthlyProgress.items.find(
                monthEntry => monthEntry.monthKey === lastMonthKey
            );

            expect(currentMonthData?.count).toBe(3);
            expect(lastMonthData?.count).toBe(2);
        });
    });

    describe('getObjectivesWithMostProgress', () => {
        test('returns empty array when no objectives exist', async () => {
            const topProgress = await userIdentity.query(
                api.dashboard.getObjectivesWithMostProgress,
                {}
            );

            expect(topProgress).toEqual({ items: [], isTruncated: false });
        });

        test('sorts objectives by progress percentage', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Low Progress',
                    targetValue: 100,
                    currentValue: 20,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'High Progress',
                    targetValue: 100,
                    currentValue: 90,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Medium Progress',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const topProgress = await userIdentity.query(
                api.dashboard.getObjectivesWithMostProgress,
                {}
            );

            expect(topProgress.items).toHaveLength(3);
            expect(topProgress.isTruncated).toBe(false);
            expect(topProgress.items[0]?.objective).toBe('High Progress');
            expect(topProgress.items[0]?.progress).toBe(90);
            expect(topProgress.items[1]?.objective).toBe('Medium Progress');
            expect(topProgress.items[1]?.progress).toBe(50);
            expect(topProgress.items[2]?.objective).toBe('Low Progress');
            expect(topProgress.items[2]?.progress).toBe(20);
        });

        test('includes completed objectives in ranking', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Active High Progress',
                    targetValue: 100,
                    currentValue: 95,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Completed High Progress',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'completed',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const topProgress = await userIdentity.query(
                api.dashboard.getObjectivesWithMostProgress,
                {}
            );

            expect(topProgress.items).toHaveLength(1);
            expect(topProgress.items[0]?.objective).toBe('Active High Progress');
        });

        test('limits results to top 5', async () => {
            for (let i = 1; i <= 7; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('objectives', {
                        createdBy: userId,

                        ownerId: userId,

                        visibility: 'private',
                        organizationId: organizationId,
                        title: `Objective ${i}`,
                        targetValue: 100,
                        currentValue: i * 10,
                        status: 'active',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            const topProgress = await userIdentity.query(
                api.dashboard.getObjectivesWithMostProgress,
                {}
            );

            expect(topProgress.items).toHaveLength(5);
            expect(topProgress.items[0]?.progress).toBe(70);
            expect(topProgress.items[4]?.progress).toBe(30);
        });
    });

    describe('getUpcomingDeadlines', () => {
        test('returns empty array when no objectives have deadlines', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'No Deadline',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const upcoming = await userIdentity.query(api.dashboard.getUpcomingDeadlines, {});

            expect(upcoming).toEqual({ items: [], isTruncated: false });
        });

        test('returns objectives with deadlines in next 7 days', async () => {
            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;

            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Deadline in 3 days',
                    targetValue: 100,
                    currentValue: 60,
                    status: 'active',
                    deadline: now + 3 * DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Deadline in 6 days',
                    targetValue: 100,
                    currentValue: 40,
                    status: 'active',
                    deadline: now + 6 * DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Deadline in 10 days',
                    targetValue: 100,
                    currentValue: 30,
                    status: 'active',
                    deadline: now + 10 * DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const upcoming = await userIdentity.query(api.dashboard.getUpcomingDeadlines, {});

            expect(upcoming.items).toHaveLength(2);
            expect(upcoming.isTruncated).toBe(false);
            expect(upcoming.items[0]?.title).toBe('Deadline in 3 days');
            expect(upcoming.items[0]?.daysRemaining).toBe(3);
            expect(upcoming.items[1]?.title).toBe('Deadline in 6 days');
            expect(upcoming.items[1]?.daysRemaining).toBe(6);
        });

        test('excludes completed objectives', async () => {
            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;

            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Active with deadline',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    deadline: now + 5 * DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Completed with deadline',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'completed',
                    deadline: now + 4 * DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const upcoming = await userIdentity.query(api.dashboard.getUpcomingDeadlines, {});

            expect(upcoming.items).toHaveLength(1);
            expect(upcoming.items[0]?.title).toBe('Active with deadline');
        });

        test('sorts deadlines by date ascending', async () => {
            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;

            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Deadline 5 days',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    deadline: now + 5 * DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Deadline 2 days',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    deadline: now + 2 * DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Deadline 7 days',
                    targetValue: 100,
                    currentValue: 50,
                    status: 'active',
                    deadline: now + 7 * DAY_MS,
                    createdAt: now,
                    updatedAt: now,
                });
            });

            const upcoming = await userIdentity.query(api.dashboard.getUpcomingDeadlines, {});

            expect(upcoming.items).toHaveLength(3);
            expect(upcoming.items[0]?.title).toBe('Deadline 2 days');
            expect(upcoming.items[1]?.title).toBe('Deadline 5 days');
            expect(upcoming.items[2]?.title).toBe('Deadline 7 days');
        });
    });

    describe('getRecentActivity', () => {
        test('returns zero counts when no recent activity', async () => {
            const activity = await userIdentity.query(api.dashboard.getRecentActivity, {});

            expect(activity.progressUpdatesCount).toBe(0);
            expect(activity.objectivesCreatedCount).toBe(0);
            expect(activity.objectivesCompletedCount).toBe(0);
            expect(activity.periodDays).toBe(30);
        });

        test('counts recent progress updates correctly', async () => {
            const objectiveId = await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Recent Activity Test',
                targetValue: 100,
                currentValue: 0,
            });

            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;

            for (let i = 0; i < 5; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        createdBy: userId,
                        organizationId: organizationId,
                        updatedValue: 5,
                        updateDate: now - i * DAY_MS,
                        comment: `Recent update ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            for (let i = 0; i < 2; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        createdBy: userId,
                        organizationId: organizationId,
                        updatedValue: 5,
                        updateDate: now - (40 + i) * DAY_MS,
                        comment: `Old update ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            const activity = await userIdentity.query(api.dashboard.getRecentActivity, {});

            expect(activity.progressUpdatesCount).toBe(5);
        });

        test('counts recently created and completed objectives', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Recently Created 1',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Recently Created 2',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Recently Completed',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'completed',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const activity = await userIdentity.query(api.dashboard.getRecentActivity, {});

            expect(activity.objectivesCreatedCount).toBe(3);
            expect(activity.objectivesCompletedCount).toBe(1);
        });
    });

    describe('authentication', () => {
        test('getDashboardStats rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getDashboardStats, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });

        test('getMonthlyProgress rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getMonthlyProgress, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });

        test('getObjectivesWithMostProgress rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getObjectivesWithMostProgress, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });

        test('getUpcomingDeadlines rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getUpcomingDeadlines, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });

        test('getRecentActivity rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getRecentActivity, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });
    });
});
