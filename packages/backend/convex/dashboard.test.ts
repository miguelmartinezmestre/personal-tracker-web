import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { modules } from '../test.setup';
import { createTestUser } from '../test_helpers';
import { register } from '../better-auth.helper';

describe('convex dashboard', async () => {
    let t: ReturnType<typeof convexTest>;
    let userIdentity: ReturnType<ReturnType<typeof convexTest>['withIdentity']>;

    beforeEach(async () => {
        t = convexTest(schema, modules);
        register(t);
        userIdentity = t.withIdentity({
            subject: 'test-user-dashboard',
            role: 'admin',
        });

        await createTestUser(t, {
            userId: 'test-user-dashboard',
            email: 'dashboard-test@example.com',
            name: 'Dashboard Test User',
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });
    });

    describe('getDashboardStats', () => {
        test('returns zero stats for new user with no objectives', async () => {
            const stats = await userIdentity.query(api.dashboard.getDashboardStats, {});

            expect(stats.totalObjectives).toBe(0);
            expect(stats.completedObjectives).toBe(0);
            expect(stats.pendingObjectives).toBe(0);
            expect(stats.pausedObjectives).toBe(0);
            expect(stats.archivedObjectives).toBe(0);
        });

        test('calculates correct stats with multiple objectives', async () => {
            // Create objectives with different statuses
            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'In Progress Objective 1',
                targetValue: 100,
                currentValue: 50,
                status: 'in_progress',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'In Progress Objective 2',
                targetValue: 100,
                currentValue: 25,
                status: 'in_progress',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Completed Objective',
                targetValue: 100,
                currentValue: 100,
                status: 'completed',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Paused Objective',
                targetValue: 100,
                currentValue: 30,
                status: 'paused',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Archived Objective',
                targetValue: 100,
                currentValue: 80,
                status: 'archived',
            });

            const stats = await userIdentity.query(api.dashboard.getDashboardStats, {});

            expect(stats.totalObjectives).toBe(5);
            expect(stats.completedObjectives).toBe(1);
            expect(stats.pendingObjectives).toBe(2);
            expect(stats.pausedObjectives).toBe(1);
            expect(stats.archivedObjectives).toBe(1);
        });
    });

    describe('getMonthlyProgress', () => {
        test('returns empty counts when no progress updates exist', async () => {
            const monthlyProgress = await userIdentity.query(api.dashboard.getMonthlyProgress, {});

            expect(monthlyProgress).toHaveLength(6); // Last 6 months
            expect(monthlyProgress.every(m => m.count === 0)).toBe(true);
            expect(monthlyProgress.every(m => m.month && m.monthKey)).toBe(true);
        });

        test('counts progress updates correctly by month', async () => {
            // Create an objective first
            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Monthly Progress Test',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            const now = new Date();
            const currentMonth = new Date(now.getFullYear(), now.getMonth(), 15);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

            // Create 3 updates in current month
            for (let i = 0; i < 3; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        updatedValue: 5,
                        updateDate: currentMonth.getTime() + i * 1000,
                        comment: `Current month update ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            // Create 2 updates in last month
            for (let i = 0; i < 2; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        updatedValue: 5,
                        updateDate: lastMonth.getTime() + i * 1000,
                        comment: `Last month update ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            const monthlyProgress = await userIdentity.query(api.dashboard.getMonthlyProgress, {});

            // Find current month and last month in results
            // Use the same date objects to ensure correct year handling
            const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

            const currentMonthData = monthlyProgress.find(m => m.monthKey === currentMonthKey);
            const lastMonthData = monthlyProgress.find(m => m.monthKey === lastMonthKey);

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

            expect(topProgress).toEqual([]);
        });

        test('sorts objectives by progress percentage', async () => {
            // Create objectives with different progress levels
            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Low Progress',
                targetValue: 100,
                currentValue: 20,
                status: 'in_progress',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'High Progress',
                targetValue: 100,
                currentValue: 90,
                status: 'in_progress',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Medium Progress',
                targetValue: 100,
                currentValue: 50,
                status: 'in_progress',
            });

            const topProgress = await userIdentity.query(
                api.dashboard.getObjectivesWithMostProgress,
                {}
            );

            expect(topProgress).toHaveLength(3);
            expect(topProgress[0]?.objective).toBe('High Progress');
            expect(topProgress[0]?.progress).toBe(90);
            expect(topProgress[1]?.objective).toBe('Medium Progress');
            expect(topProgress[1]?.progress).toBe(50);
            expect(topProgress[2]?.objective).toBe('Low Progress');
            expect(topProgress[2]?.progress).toBe(20);
        });

        test('excludes archived objectives', async () => {
            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Active High Progress',
                targetValue: 100,
                currentValue: 95,
                status: 'in_progress',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Archived High Progress',
                targetValue: 100,
                currentValue: 98,
                status: 'archived',
            });

            const topProgress = await userIdentity.query(
                api.dashboard.getObjectivesWithMostProgress,
                {}
            );

            expect(topProgress).toHaveLength(1);
            expect(topProgress[0]?.objective).toBe('Active High Progress');
        });

        test('limits results to top 5', async () => {
            // Create 7 objectives
            for (let i = 1; i <= 7; i++) {
                await userIdentity.mutation(api.objectives.createObjective, {
                    title: `Objective ${i}`,
                    targetValue: 100,
                    currentValue: i * 10,
                    status: 'in_progress',
                });
            }

            const topProgress = await userIdentity.query(
                api.dashboard.getObjectivesWithMostProgress,
                {}
            );

            expect(topProgress).toHaveLength(5);
            // Should be sorted by descending progress
            expect(topProgress[0]?.progress).toBe(70);
            expect(topProgress[4]?.progress).toBe(30);
        });
    });

    describe('getUpcomingDeadlines', () => {
        test('returns empty array when no objectives have deadlines', async () => {
            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'No Deadline',
                targetValue: 100,
                currentValue: 50,
                status: 'in_progress',
            });

            const upcoming = await userIdentity.query(api.dashboard.getUpcomingDeadlines, {});

            expect(upcoming).toEqual([]);
        });

        test('returns objectives with deadlines in next 7 days', async () => {
            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;

            // Deadline in 3 days (should be included)
            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Deadline in 3 days',
                targetValue: 100,
                currentValue: 60,
                status: 'in_progress',
                deadline: now + 3 * DAY_MS,
            });

            // Deadline in 6 days (should be included)
            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Deadline in 6 days',
                targetValue: 100,
                currentValue: 40,
                status: 'in_progress',
                deadline: now + 6 * DAY_MS,
            });

            // Deadline in 10 days (should NOT be included)
            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Deadline in 10 days',
                targetValue: 100,
                currentValue: 30,
                status: 'in_progress',
                deadline: now + 10 * DAY_MS,
            });

            const upcoming = await userIdentity.query(api.dashboard.getUpcomingDeadlines, {});

            expect(upcoming).toHaveLength(2);
            expect(upcoming[0]?.title).toBe('Deadline in 3 days');
            expect(upcoming[0]?.daysRemaining).toBe(3);
            expect(upcoming[1]?.title).toBe('Deadline in 6 days');
            expect(upcoming[1]?.daysRemaining).toBe(6);
        });

        test('excludes completed and archived objectives', async () => {
            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Active with deadline',
                targetValue: 100,
                currentValue: 50,
                status: 'in_progress',
                deadline: now + 5 * DAY_MS,
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Completed with deadline',
                targetValue: 100,
                currentValue: 100,
                status: 'completed',
                deadline: now + 4 * DAY_MS,
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Archived with deadline',
                targetValue: 100,
                currentValue: 50,
                status: 'archived',
                deadline: now + 3 * DAY_MS,
            });

            const upcoming = await userIdentity.query(api.dashboard.getUpcomingDeadlines, {});

            expect(upcoming).toHaveLength(1);
            expect(upcoming[0]?.title).toBe('Active with deadline');
        });

        test('sorts deadlines by date ascending', async () => {
            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Deadline 5 days',
                targetValue: 100,
                currentValue: 50,
                status: 'in_progress',
                deadline: now + 5 * DAY_MS,
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Deadline 2 days',
                targetValue: 100,
                currentValue: 50,
                status: 'in_progress',
                deadline: now + 2 * DAY_MS,
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Deadline 7 days',
                targetValue: 100,
                currentValue: 50,
                status: 'in_progress',
                deadline: now + 7 * DAY_MS,
            });

            const upcoming = await userIdentity.query(api.dashboard.getUpcomingDeadlines, {});

            expect(upcoming).toHaveLength(3);
            expect(upcoming[0]?.title).toBe('Deadline 2 days');
            expect(upcoming[1]?.title).toBe('Deadline 5 days');
            expect(upcoming[2]?.title).toBe('Deadline 7 days');
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
            const objectiveId = await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Recent Activity Test',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;

            // Create 5 updates within last 30 days
            for (let i = 0; i < 5; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        updatedValue: 5,
                        updateDate: now - i * DAY_MS,
                        comment: `Recent update ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            // Create 2 updates older than 30 days (should not be counted)
            for (let i = 0; i < 2; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
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
            // These objectives are created within the test, so they're recent
            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Recently Created 1',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Recently Created 2',
                targetValue: 100,
                currentValue: 0,
                status: 'in_progress',
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Recently Completed',
                targetValue: 100,
                currentValue: 100,
                status: 'completed',
            });

            const activity = await userIdentity.query(api.dashboard.getRecentActivity, {});

            expect(activity.objectivesCreatedCount).toBe(3);
            expect(activity.objectivesCompletedCount).toBe(1);
        });
    });

    describe('authentication', () => {
        test('getDashboardStats rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getDashboardStats, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });

        test('getMonthlyProgress rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getMonthlyProgress, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });

        test('getObjectivesWithMostProgress rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getObjectivesWithMostProgress, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });

        test('getUpcomingDeadlines rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getUpcomingDeadlines, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });

        test('getRecentActivity rejects unauthenticated users', async () => {
            await expect(t.query(api.dashboard.getRecentActivity, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated/
            );
        });
    });
});
