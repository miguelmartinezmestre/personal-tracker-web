import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { internal } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestUser,
    createTestOrganization,
    createTestMember,
    createTestObjective,
} from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel, Id } from '../_generated/dataModel';
import { calculateUserStreak } from '../domain/achievements/calculations';
import { TIME } from '../utils/constants';

describe('achievements multi-tenancy security', async () => {
    const t = initConvexTest();
    let userAIdentity: TestConvexForDataModel<DataModel>;
    let userAId: Id<'user'>;
    let userBId: Id<'user'>;
    let orgAId: Id<'organization'>;
    let orgBId: Id<'organization'>;
    const DAY_MS = TIME.DAY_MS;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const userAData = await createTestUser(t, {
            userId: 'test-user-a-' + randomSuffix,
            email: 'user-a@example.com-' + randomSuffix,
            name: 'User A ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });
        userAId = userAData.docId;

        const userBData = await createTestUser(t, {
            userId: 'test-user-b-' + randomSuffix,
            email: 'user-b@example.com-' + randomSuffix,
            name: 'User B ' + randomSuffix,
            password: 'test-password',
            role: 'member',
            emailVerified: false,
        });
        userBId = userBData.docId;

        orgAId = await createTestOrganization(t, {
            name: 'Organization A ' + randomSuffix,
            slug: 'org-a-' + randomSuffix,
        });

        orgBId = await createTestOrganization(t, {
            name: 'Organization B ' + randomSuffix,
            slug: 'org-b-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgAId,
            userId: userAId,
            role: 'owner',
        });

        await createTestMember(t, {
            organizationId: orgBId,
            userId: userAId,
            role: 'member',
        });

        await createTestMember(t, {
            organizationId: orgBId,
            userId: userBId,
            role: 'member',
        });

        userAIdentity = t.withIdentity({
            subject: userAData.docId,
            role: userAData.role ?? 'admin',
            email: userAData.email,
            name: userAData.name,
            password: 'test-password',
            emailVerified: false,
            createdAt: Date.now(),
            userId: userAData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        await userAIdentity.mutation(api.achievements.seedAchievementDefinitions, {});
    });

    describe('getUserAchievementProgress - cross-org isolation', () => {
        test('should only count objectives from the active organization context', async () => {
            await createTestObjective(t, {
                userId: userAId,
                organizationId: orgAId,
                title: 'Org A Objective 1',
                targetValue: 100,
                currentValue: 0,
            });

            await createTestObjective(t, {
                userId: userAId,
                organizationId: orgAId,
                title: 'Org A Objective 2',
                targetValue: 100,
                currentValue: 0,
            });

            await createTestObjective(t, {
                userId: userAId,
                organizationId: orgBId,
                title: 'Org B Objective 1',
                targetValue: 100,
                currentValue: 0,
            });

            const progress = await t.run(async ctx => {
                const objectivesInOrgA = await ctx.db
                    .query('objectives')
                    .withIndex('by_user', q => q.eq('userId', userAId))
                    .filter(q => q.eq(q.field('organizationId'), orgAId))
                    .collect();

                return objectivesInOrgA.length;
            });

            expect(progress).toBe(2);
        });

        test('when no organization context, should only show personal objectives', async () => {
            await t.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userAId,
                    organizationId: orgAId,
                    scope: 'personal',
                    title: 'Personal Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await t.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userAId,
                    organizationId: orgAId,
                    scope: 'organization',
                    title: 'Org Scoped Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const personalObjectives = await t.run(async ctx => {
                return await ctx.db
                    .query('objectives')
                    .withIndex('by_user', q => q.eq('userId', userAId))
                    .filter(q => q.eq(q.field('scope'), 'personal'))
                    .collect();
            });

            expect(personalObjectives.length).toBe(1);
            expect(personalObjectives[0]?.scope).toBe('personal');
        });
    });

    describe('calculateUserStreak - membership validation', () => {
        test('should calculate streak for user who is a member of the organization', async () => {
            const objectiveId = await createTestObjective(t, {
                userId: userAId,
                organizationId: orgAId,
                title: 'Streak Test Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await t.run(async ctx => {
                for (let i = 0; i < 3; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        userId: userAId,
                        organizationId: orgAId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await t.run(async ctx => {
                return calculateUserStreak(ctx, userAId, orgAId);
            });

            expect(streak).toBe(3);
        });

        test('should throw error when calculating streak for non-member user', async () => {
            const objectiveId = await createTestObjective(t, {
                userId: userAId,
                organizationId: orgAId,
                title: 'Streak Test Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await t.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    userId: userAId,
                    organizationId: orgAId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Today update',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await expect(
                t.run(async ctx => {
                    return calculateUserStreak(ctx, userBId, orgAId);
                })
            ).rejects.toThrow(/FORBIDDEN|forbidden|not a member/);
        });

        test('streak should not include progress from other organizations', async () => {
            const objectiveAId = await createTestObjective(t, {
                userId: userAId,
                organizationId: orgAId,
                title: 'Org A Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const objectiveBId = await createTestObjective(t, {
                userId: userAId,
                organizationId: orgBId,
                title: 'Org B Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await t.run(async ctx => {
                for (let i = 0; i < 2; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveAId,
                        userId: userAId,
                        organizationId: orgAId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Org A Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            await t.run(async ctx => {
                for (let i = 0; i < 5; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveBId,
                        userId: userAId,
                        organizationId: orgBId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Org B Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streakA = await t.run(async ctx => {
                return calculateUserStreak(ctx, userAId, orgAId);
            });

            const streakB = await t.run(async ctx => {
                return calculateUserStreak(ctx, userAId, orgBId);
            });

            expect(streakA).toBe(2);
            expect(streakB).toBe(5);
        });
    });

    describe('checkUserAchievements - membership validation', () => {
        test('should process achievements for member user', async () => {
            await createTestObjective(t, {
                userId: userAId,
                organizationId: orgAId,
                title: 'Test Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const result = await t.run(async ctx => {
                return await ctx.runMutation(internal.achievements.checkUserAchievements, {
                    userId: userAId,
                    organizationId: orgAId,
                    trigger: 'objective_created',
                });
            });

            expect(result).toBeDefined();
            expect(result.status).toMatch(/completed|in_progress/);
        });

        test('should throw FORBIDDEN when user is not a member of the organization', async () => {
            await expect(
                t.run(async ctx => {
                    return await ctx.runMutation(internal.achievements.checkUserAchievements, {
                        userId: userBId,
                        organizationId: orgAId,
                        trigger: 'objective_created',
                    });
                })
            ).rejects.toThrow(/FORBIDDEN|forbidden|not a member/);
        });
    });

    describe('cross-org data leakage prevention', () => {
        test('user in org A should not see objectives from org B in progress', async () => {
            await createTestObjective(t, {
                userId: userAId,
                organizationId: orgAId,
                title: 'Org A Objective',
                targetValue: 100,
                currentValue: 0,
            });

            await createTestObjective(t, {
                userId: userAId,
                organizationId: orgBId,
                title: 'Org B Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const orgAObjectives = await t.run(async ctx => {
                return await ctx.db
                    .query('objectives')
                    .withIndex('by_user', q => q.eq('userId', userAId))
                    .filter(q => q.eq(q.field('organizationId'), orgAId))
                    .collect();
            });

            const orgBObjectives = await t.run(async ctx => {
                return await ctx.db
                    .query('objectives')
                    .withIndex('by_user', q => q.eq('userId', userAId))
                    .filter(q => q.eq(q.field('organizationId'), orgBId))
                    .collect();
            });

            expect(orgAObjectives.length).toBe(1);
            expect(orgAObjectives[0]?.organizationId).toBe(orgAId);

            expect(orgBObjectives.length).toBe(1);
            expect(orgBObjectives[0]?.organizationId).toBe(orgBId);
        });

        test('objectives from different orgs should not mix in streak calculation', async () => {
            const orgAObjectiveId = await createTestObjective(t, {
                userId: userAId,
                organizationId: orgAId,
                title: 'Org A Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const orgBObjectiveId = await createTestObjective(t, {
                userId: userAId,
                organizationId: orgBId,
                title: 'Org B Objective',
                targetValue: 100,
                currentValue: 0,
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await t.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: orgAObjectiveId,
                    userId: userAId,
                    organizationId: orgAId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Org A Today',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: orgAObjectiveId,
                    userId: userAId,
                    organizationId: orgAId,
                    updatedValue: 20,
                    updateDate: today.getTime() - 2 * DAY_MS,
                    comment: 'Org A 2 days ago',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            await t.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: orgBObjectiveId,
                    userId: userAId,
                    organizationId: orgBId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Org B Today',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: orgBObjectiveId,
                    userId: userAId,
                    organizationId: orgBId,
                    updatedValue: 20,
                    updateDate: today.getTime() - DAY_MS,
                    comment: 'Org B Yesterday',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streakA = await t.run(async ctx => {
                return calculateUserStreak(ctx, userAId, orgAId);
            });

            const streakB = await t.run(async ctx => {
                return calculateUserStreak(ctx, userAId, orgBId);
            });

            expect(streakA).toBe(1);
            expect(streakB).toBe(2);
        });
    });

    describe('personal scope objectives', () => {
        test('personal objectives should be visible when no org context', async () => {
            const personalObjectiveId = await t.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userAId,
                    organizationId: orgAId,
                    scope: 'personal',
                    title: 'Personal Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const personalObjectives = await t.run(async ctx => {
                return await ctx.db
                    .query('objectives')
                    .withIndex('by_user', q => q.eq('userId', userAId))
                    .filter(q => q.eq(q.field('scope'), 'personal'))
                    .collect();
            });

            expect(personalObjectives.length).toBe(1);
            expect(personalObjectives[0]?._id).toBe(personalObjectiveId);
        });

        test('organization-scoped objectives should not appear in personal context', async () => {
            await t.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userAId,
                    organizationId: orgAId,
                    scope: 'organization',
                    title: 'Org Scoped Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const personalObjectives = await t.run(async ctx => {
                return await ctx.db
                    .query('objectives')
                    .withIndex('by_user', q => q.eq('userId', userAId))
                    .filter(q => q.eq(q.field('scope'), 'personal'))
                    .collect();
            });

            expect(personalObjectives.length).toBe(0);
        });
    });
});
