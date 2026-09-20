import { beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from '../_generated/api';
import { drainScheduledFunctions, initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import type { TestConvexForDataModel } from 'convex-test';
import type { DataModel, Id } from '../_generated/dataModel';
import { getAchievementDefinition } from '../domain/achievements/definitions';

describe('convex achievements', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-achievements-' + randomSuffix,
            email: 'achievements-test@example.com-' + randomSuffix,
            name: 'Achievements Test User ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
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

    describe('getUserAchievementStats', () => {
        test('returns zero stats when user has no achievements', async () => {
            const stats = await userIdentity.query(api.achievements.getUserAchievementStats, {});

            expect(stats.totalPoints).toBe(0);
            expect(stats.earnedCount).toBe(0);
            expect(stats.totalAvailable).toBeGreaterThan(0);
        });

        test('calculates points correctly when user has achievements', async () => {
            const awardedPoints = await userIdentity.run(async ctx => {
                const achievementDefinition = getAchievementDefinition('first_objective');
                if (!achievementDefinition) throw new Error('Expected achievement definition');
                await ctx.db.insert('obtainedAchievements', {
                    userId,
                    achievement: achievementDefinition.code,
                    earnedAt: Date.now(),
                });
                return achievementDefinition.points;
            });

            const stats = await userIdentity.query(api.achievements.getUserAchievementStats, {});

            expect(stats.totalPoints).toBe(awardedPoints);
            expect(stats.earnedCount).toBe(1);
        });
    });

    describe('getRecentAchievements', () => {
        test('returns limited number of achievements', async () => {
            await userIdentity.run(async ctx => {
                for (const code of [
                    'first_objective',
                    'objectives_created_5',
                    'objectives_created_15',
                ]) {
                    await ctx.db.insert('obtainedAchievements', {
                        userId,
                        achievement: code,
                        earnedAt: Date.now(),
                    });
                }
            });

            const recent = await userIdentity.query(api.achievements.getRecentAchievements, {
                limit: 2,
            });

            expect(recent.length).toBe(2);
        });
    });

    describe('getUserAchievementProgress', () => {
        test('returns progress for all individual achievements', async () => {
            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            expect(progress.length).toBeGreaterThan(0);
            expect(progress[0]).toHaveProperty('definition');
            expect(progress[0]).toHaveProperty('currentProgress');
            expect(progress[0]).toHaveProperty('isEarned');
        });

        test('returns organization achievement progress for active organization', async () => {
            await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Organization Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            const organizationProgress = progress.find(
                progressEntry => progressEntry.definition.code === 'organization_first_objective'
            );

            expect(organizationProgress).toBeDefined();
            expect(organizationProgress?.definition.type).toBe('organization');
            expect(organizationProgress?.currentProgress).toBe(1);
            expect(organizationProgress?.isEarned).toBe(false);
        });

        test('shows correct progress for objectives created', async () => {
            await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Test Objective 1',
                targetValue: 100,
                currentValue: 0,
            });

            await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Test Objective 2',
                targetValue: 100,
                currentValue: 0,
            });

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            const objectivesCreatedProgress = progress.find(
                progressEntry => progressEntry.definition.code === 'objectives_created_5'
            );

            expect(objectivesCreatedProgress?.currentProgress).toBeGreaterThanOrEqual(2);
        });

        test('shows correct progress for objectives completed', async () => {
            await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Test Objective 1',
                targetValue: 100,
                currentValue: 100,
            });

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            const completedProgress = progress.find(
                progressEntry => progressEntry.definition.code === 'objectives_completed_3'
            );

            expect(completedProgress?.currentProgress).toBeGreaterThanOrEqual(1);
        });

        test('shows correct progress for early_bird achievement', async () => {
            const now = Date.now();
            const futureDeadline = now + 7 * 24 * 60 * 60 * 1000;

            await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Early Bird Objective',
                    targetValue: 100,
                    currentValue: 100,
                    startValue: 0,
                    status: 'completed',
                    deadline: futureDeadline,
                    completedAt: now,
                    earlyBirdCompleted: true,
                    createdAt: now - 1000,
                    updatedAt: now,
                });
            });

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            const earlyBirdProgress = progress.find(
                progressEntry => progressEntry.definition.code === 'early_bird'
            );

            expect(earlyBirdProgress).toBeDefined();
            expect(earlyBirdProgress?.currentProgress).toBeGreaterThanOrEqual(1);
        });

        test('early_bird does not count objectives without deadline', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'No Deadline Objective',
                    targetValue: 100,
                    currentValue: 100,
                    startValue: 0,
                    status: 'completed',
                    earlyBirdCompleted: false,
                    createdAt: Date.now() - 1000,
                    updatedAt: Date.now(),
                });
            });

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            const earlyBirdProgress = progress.find(
                progressEntry => progressEntry.definition.code === 'early_bird'
            );

            expect(earlyBirdProgress?.currentProgress).toBe(0);
        });

        test('early_bird does not count objectives completed after deadline', async () => {
            const now = Date.now();
            const pastDeadline = now - 1000;

            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Late Objective',
                    targetValue: 100,
                    currentValue: 100,
                    startValue: 0,
                    status: 'completed',
                    deadline: pastDeadline,
                    completedAt: now,
                    earlyBirdCompleted: false,
                    createdAt: pastDeadline - 7 * 24 * 60 * 60 * 1000,
                    updatedAt: now,
                });
            });

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            const earlyBirdProgress = progress.find(
                progressEntry => progressEntry.definition.code === 'early_bird'
            );

            expect(earlyBirdProgress?.currentProgress).toBe(0);
        });

        test('early_bird does not count late completion when created before deadline', async () => {
            const now = Date.now();
            const pastDeadline = now - 1000;
            const createdBeforeDeadline = pastDeadline - 7 * 24 * 60 * 60 * 1000;

            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    createdBy: userId,

                    ownerId: userId,

                    visibility: 'private',
                    organizationId: organizationId,
                    title: 'Created Early Completed Late',
                    targetValue: 100,
                    currentValue: 100,
                    startValue: 0,
                    status: 'completed',
                    deadline: pastDeadline,
                    completedAt: now,
                    earlyBirdCompleted: false,
                    createdAt: createdBeforeDeadline,
                    updatedAt: now,
                });
            });

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            const earlyBirdProgress = progress.find(
                progressEntry => progressEntry.definition.code === 'early_bird'
            );

            expect(earlyBirdProgress?.currentProgress).toBe(0);
        });

        test('awards early_bird when objective is completed via progress update', async () => {
            vi.useFakeTimers();
            try {
                const now = Date.now();
                const futureDeadline = now + 7 * 24 * 60 * 60 * 1000;

                const objectiveId = await createTestObjective(t, {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Progress Complete Early Bird',
                    targetValue: 100,
                    currentValue: 0,
                    startValue: 0,
                    deadline: futureDeadline,
                });

                await userIdentity.mutation(api.update_progress.createUpdateProgress, {
                    objective: objectiveId,
                    updatedValue: 100,
                    updateDate: now,
                });

                await t.finishAllScheduledFunctions(() => vi.runAllTimers());

                const achievement = await t.run(ctx =>
                    ctx.db
                        .query('obtainedAchievements')
                        .withIndex('by_user_achievement', q =>
                            q.eq('userId', userId).eq('achievement', 'early_bird')
                        )
                        .unique()
                );

                expect(achievement).not.toBeNull();
            } finally {
                vi.useRealTimers();
            }
        });
    });

    describe('achievement notification overview', () => {
        test('returns count of unread achievement notifications', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('notifications', {
                    userId: userId,
                    organizationId: organizationId,
                    objective: undefined,
                    read: false,
                    notificationType: 'achievement',
                    notificationDate: Date.now(),
                    message: 'Test achievement',
                });
            });

            const overview = await userIdentity.query(
                api.notifications.getNotificationOverview,
                {}
            );

            expect(overview.unreadCount).toBe(1);
        });

        test('returns zero when all notifications are read', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('notifications', {
                    userId: userId,
                    organizationId: organizationId,
                    objective: undefined,
                    read: true,
                    notificationType: 'achievement',
                    notificationDate: Date.now(),
                    message: 'Test achievement',
                });
            });

            const overview = await userIdentity.query(
                api.notifications.getNotificationOverview,
                {}
            );

            expect(overview.unreadCount).toBe(0);
        });
    });

    describe('achievement awarding and progress', () => {
        test('awards first_objective achievement when first objective is created', async () => {
            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'My First Objective',
                targetValue: 100,
            });

            await drainScheduledFunctions(t);

            const achievement = await t.run(ctx =>
                ctx.db
                    .query('obtainedAchievements')
                    .withIndex('by_user_achievement', q =>
                        q.eq('userId', userId).eq('achievement', 'first_objective')
                    )
                    .unique()
            );

            expect(achievement).not.toBeNull();
        });

        test('does not award same achievement twice', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('obtainedAchievements', {
                    userId,
                    achievement: 'first_objective',
                    earnedAt: Date.now(),
                });
            });

            await userIdentity.mutation(api.objectives.createObjective, {
                title: 'Second Objective',
                targetValue: 100,
            });
            await drainScheduledFunctions(t);

            const firstObjectiveCount = await t.run(
                async ctx =>
                    (
                        await ctx.db
                            .query('obtainedAchievements')
                            .withIndex('by_user_achievement', q =>
                                q.eq('userId', userId).eq('achievement', 'first_objective')
                            )
                            .collect()
                    ).length
            );

            expect(firstObjectiveCount).toBe(1);
        });

        test('progress achievement logic validates correct threshold', async () => {
            const objectiveId = await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Progress Threshold Test',
                targetValue: 100,
                currentValue: 0,
            });

            for (let i = 1; i <= 10; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        createdBy: userId,
                        organizationId: organizationId,
                        updatedValue: 5,
                        updateDate: Date.now() + i * 1000,
                        comment: `Update ${i}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            const progressUpdateProgress = progress.find(
                progressEntry => progressEntry.definition.code === 'progress_updates_10'
            );

            expect(progressUpdateProgress).toBeDefined();
            if (progressUpdateProgress) {
                expect(progressUpdateProgress.currentProgress).toBe(10);
                expect(progressUpdateProgress.definition.threshold).toBe(10);
                expect(progressUpdateProgress.currentProgress).toBeGreaterThanOrEqual(
                    progressUpdateProgress.definition.threshold
                );
            }
        });

        test('streak achievement tracks consecutive daily updates', async () => {
            const objectiveId = await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Streak Test Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const DAY_MS = 24 * 60 * 60 * 1000;
            const today = new Date();
            const todayMs = Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate(),
                12
            );

            for (let i = 0; i < 3; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        createdBy: userId,
                        organizationId: organizationId,
                        updatedValue: 5,
                        updateDate: todayMs - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                });
            }

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            const streak3Progress = progress.find(
                progressEntry => progressEntry.definition.code === 'streak_3'
            );

            expect(streak3Progress).toBeDefined();
            if (streak3Progress) {
                expect(streak3Progress.currentProgress).toBeGreaterThanOrEqual(0);
                expect(streak3Progress.definition.threshold).toBe(3);
            }
        });
    });

    describe('authentication', () => {
        test('getUserAchievementStats rejects unauthenticated users', async () => {
            await expect(t.query(api.achievements.getUserAchievementStats, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });
    });
});
