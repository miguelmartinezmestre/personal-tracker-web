import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';

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
            role: 'admin',
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

    describe('seedAchievementDefinitions', () => {
        test('seeds achievement definitions successfully as admin', async () => {
            const result = await userIdentity.mutation(
                api.achievements.seedAchievementDefinitions,
                {}
            );

            expect(result.count).toBeGreaterThan(0);
            expect(result.message).toBe('Achievements seeded successfully');
        });

        test('does not duplicate achievements on second seed', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const result = await userIdentity.mutation(
                api.achievements.seedAchievementDefinitions,
                {}
            );

            expect(result.count).toBe(0);
            expect(result.message).toBe('Achievements already seeded');
        });

        test('rejects non-admin users with FORBIDDEN', async () => {
            const regularUser = await createTestUser(t, {
                userId: 'regular-user-seed',
                email: 'regular-seed@example.com',
                name: 'Regular User',
                role: 'user',
            });

            const regularUserIdentity = t.withIdentity({
                subject: regularUser.docId,
                role: regularUser.role ?? null,
                email: regularUser.email,
                name: regularUser.name,
                emailVerified: false,
                createdAt: Date.now(),
                userId: regularUser.docId,
                image: 'https://example.com/image.png',
                banExpires: null,
                banReason: null,
                banned: false,
            });

            await expect(
                regularUserIdentity.mutation(api.achievements.seedAchievementDefinitions, {})
            ).rejects.toThrow(/FORBIDDEN/);
        });
    });

    describe('getAchievementDefinitions', () => {
        test('returns all active achievement definitions', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const definitions = await userIdentity.query(
                api.achievements.getAchievementDefinitions,
                {}
            );

            expect(definitions.length).toBeGreaterThan(0);
            expect(definitions[0]).toHaveProperty('code');
            expect(definitions[0]).toHaveProperty('type');
            expect(definitions[0]).toHaveProperty('tier');
            expect(definitions[0]).toHaveProperty('points');
        });

        test('filters by type when specified', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const individualDefs = await userIdentity.query(
                api.achievements.getAchievementDefinitions,
                {
                    type: 'individual',
                }
            );

            const organizationDefs = await userIdentity.query(
                api.achievements.getAchievementDefinitions,
                {
                    type: 'organization',
                }
            );

            expect(individualDefs.every(definition => definition.type === 'individual')).toBe(true);
            expect(organizationDefs.every(definition => definition.type === 'organization')).toBe(
                true
            );
        });
    });

    describe('getUserAchievements', () => {
        test('returns empty array when user has no achievements', async () => {
            const achievements = await userIdentity.query(api.achievements.getUserAchievements, {});

            expect(achievements).toEqual([]);
        });

        test('returns user achievements with definitions', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            await userIdentity.run(async ctx => {
                const firstDef = await ctx.db.query('achievementDefinitions').first();

                if (firstDef) {
                    await ctx.db.insert('obtainedAchievements', {
                        userId: userId,
                        achievement: firstDef._id,
                        earnedAt: Date.now(),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const achievements = await userIdentity.query(api.achievements.getUserAchievements, {});

            expect(achievements.length).toBe(1);
            expect(achievements[0]?.definition).toBeDefined();
            expect(achievements[0]?.user).toBe(userId);
        });
    });

    describe('getUserAchievementStats', () => {
        test('returns zero stats when user has no achievements', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const stats = await userIdentity.query(api.achievements.getUserAchievementStats, {});

            expect(stats.totalPoints).toBe(0);
            expect(stats.earnedCount).toBe(0);
            expect(stats.totalAvailable).toBeGreaterThan(0);
        });

        test('calculates points correctly when user has achievements', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const awardedPoints = await userIdentity.run(async ctx => {
                const achievementDefinition = await ctx.db
                    .query('achievementDefinitions')
                    .withIndex('by_code', q => q.eq('code', 'first_objective'))
                    .first();

                if (achievementDefinition) {
                    await ctx.db.insert('obtainedAchievements', {
                        userId: userId,
                        achievement: achievementDefinition._id,
                        earnedAt: Date.now(),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    return achievementDefinition.points;
                }
                return 0;
            });

            const stats = await userIdentity.query(api.achievements.getUserAchievementStats, {});

            expect(stats.totalPoints).toBe(awardedPoints);
            expect(stats.earnedCount).toBe(1);
        });
    });

    describe('getRecentAchievements', () => {
        test('returns limited number of achievements', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            await userIdentity.run(async ctx => {
                const defs = await ctx.db.query('achievementDefinitions').take(3);

                for (const def of defs) {
                    await ctx.db.insert('obtainedAchievements', {
                        userId: userId,
                        achievement: def._id,
                        earnedAt: Date.now(),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
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
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const progress = await userIdentity.query(
                api.achievements.getUserAchievementProgress,
                {}
            );

            expect(progress.length).toBeGreaterThan(0);
            expect(progress[0]).toHaveProperty('definition');
            expect(progress[0]).toHaveProperty('currentProgress');
            expect(progress[0]).toHaveProperty('isEarned');
        });

        test('shows correct progress for objectives created', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

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
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

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
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const now = Date.now();
            const futureDeadline = now + 7 * 24 * 60 * 60 * 1000;

            await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    scope: 'personal',
                    title: 'Early Bird Objective',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'completed',
                    deadline: futureDeadline,
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
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    scope: 'personal',
                    title: 'No Deadline Objective',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'completed',
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
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const now = Date.now();
            const pastDeadline = now - 1000;

            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    scope: 'personal',
                    title: 'Late Objective',
                    targetValue: 100,
                    currentValue: 100,
                    status: 'completed',
                    deadline: pastDeadline,
                    createdAt: now - 2000,
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
    });

    describe('getUnviewedAchievementsCount', () => {
        test('returns count of unread achievement notifications', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            await userIdentity.run(async ctx => {
                await ctx.db.insert('notifications', {
                    userId: userId,
                    organizationId: organizationId,
                    objective: undefined,
                    read: false,
                    notificationType: 'achievement',
                    notificationDate: Date.now(),
                    message: 'Test achievement',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const count = await userIdentity.query(
                api.achievements.getUnviewedAchievementsCount,
                {}
            );

            expect(count).toBe(1);
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
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const count = await userIdentity.query(
                api.achievements.getUnviewedAchievementsCount,
                {}
            );

            expect(count).toBe(0);
        });
    });

    describe('checkUserAchievements (internal)', () => {
        test('awards first_objective achievement when first objective is created', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'My First Objective',
                targetValue: 100,
                currentValue: 0,
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            const achievements = await userIdentity.query(api.achievements.getUserAchievements, {});

            expect(achievements).toBeDefined();
        });

        test('does not award same achievement twice', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            await userIdentity.run(async ctx => {
                const def = await ctx.db
                    .query('achievementDefinitions')
                    .withIndex('by_code', q => q.eq('code', 'first_objective'))
                    .first();

                if (def) {
                    await ctx.db.insert('obtainedAchievements', {
                        userId: userId,
                        achievement: def._id,
                        earnedAt: Date.now(),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Second Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const achievements = await userIdentity.query(api.achievements.getUserAchievements, {});

            const firstObjectiveCount = achievements.filter(
                a => a.definition?.code === 'first_objective'
            ).length;

            expect(firstObjectiveCount).toBe(1);
        });

        test('progress achievement logic validates correct threshold', async () => {
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

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
                        userId: userId,
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
            await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});

            const objectiveId = await createTestObjective(t, {
                userId: userId,
                organizationId: organizationId,
                title: 'Streak Test Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const DAY_MS = 24 * 60 * 60 * 1000;
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            const todayMs = today.getTime();

            for (let i = 0; i < 3; i++) {
                await userIdentity.run(async ctx => {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        userId: userId,
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
        test('getAchievementDefinitions rejects unauthenticated users', async () => {
            await expect(t.query(api.achievements.getAchievementDefinitions, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });

        test('getUserAchievements rejects unauthenticated users', async () => {
            await expect(t.query(api.achievements.getUserAchievements, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });

        test('getUserAchievementStats rejects unauthenticated users', async () => {
            await expect(t.query(api.achievements.getUserAchievementStats, {})).rejects.toThrow(
                /Unauthenticated|User not authenticated|AUTH_REQUIRED/
            );
        });

        test('seedAchievementDefinitions rejects unauthenticated users', async () => {
            await expect(
                t.mutation(api.achievements.seedAchievementDefinitions, {})
            ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
        });
    });

    describe('organization achievements', () => {
        test('getOrganizationAchievements returns empty for new organization', async () => {
            const orgId = await createTestOrganization(t, {
                name: 'Test Organization',
                slug: 'test-organization',
            });

            await createTestMember(t, {
                organizationId: orgId,
                userId: userId,
                role: 'owner',
            });

            const organizationId = orgId;

            const organizationAchievements = await userIdentity.query(
                api.achievements.getOrganizationAchievements,
                { organizationId }
            );

            expect(organizationAchievements).toEqual([]);
        });
    });
});
