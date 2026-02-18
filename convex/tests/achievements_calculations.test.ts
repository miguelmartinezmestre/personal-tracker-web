import { beforeEach, describe, expect, test } from 'vitest';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel } from '../_generated/dataModel';
import {
    calculateUserStreak,
    calculateUserStreakInternal,
    calculateOrganizationStreak,
} from '../achievements_utils/calculations';
import { TIME } from '../utils/constants';

describe('achievements calculations', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: string;
    let organizationId: string;
    const DAY_MS = TIME.DAY_MS;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const user = {
            userId: 'test-user-calcs-' + randomSuffix,
            email: 'calcs-test@example.com-' + randomSuffix,
            name: 'Calcs Test User ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        };

        await createTestUser(t, user);
        userId = user.userId;

        const orgId = await createTestOrganization(t, {
            name: 'Calcs Org ' + randomSuffix,
            slug: 'calcs-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
        });

        organizationId = String(orgId);

        userIdentity = t.withIdentity({
            subject: user.userId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: user.userId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    describe('calculateUserStreak', () => {
        test('returns 0 when user has no objectives', async () => {
            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(0);
        });

        test('returns 0 when objectives exist but no progress updates', async () => {
            await userIdentity.run(async ctx => {
                await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Test Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(0);
        });

        test('returns 1 for single day of activity today', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Test Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return id;
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await userIdentity.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Today update',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(1);
        });

        test('returns 1 for activity yesterday (streak continues)', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Test Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return id;
            });

            const yesterday = new Date();
            yesterday.setHours(12, 0, 0, 0);
            yesterday.setTime(yesterday.getTime() - DAY_MS);

            await userIdentity.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    updatedValue: 10,
                    updateDate: yesterday.getTime(),
                    comment: 'Yesterday update',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(1);
        });

        test('returns 0 when last activity is 2+ days ago (streak broken)', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Test Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return id;
            });

            const twoDaysAgo = new Date();
            twoDaysAgo.setHours(12, 0, 0, 0);
            twoDaysAgo.setTime(twoDaysAgo.getTime() - 2 * DAY_MS);

            await userIdentity.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    updatedValue: 10,
                    updateDate: twoDaysAgo.getTime(),
                    comment: 'Two days ago update',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(0);
        });

        test('counts multiple updates on same day as 1', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Test Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return id;
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await userIdentity.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Update 1',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    updatedValue: 20,
                    updateDate: today.getTime() + 3600000,
                    comment: 'Update 2',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    updatedValue: 30,
                    updateDate: today.getTime() + 7200000,
                    comment: 'Update 3',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(1);
        });

        test('returns correct streak for 3 consecutive days', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Test Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return id;
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await userIdentity.run(async ctx => {
                for (let i = 0; i < 3; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(3);
        });

        test('returns correct streak for 7 consecutive days', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Test Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return id;
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await userIdentity.run(async ctx => {
                for (let i = 0; i < 7; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(7);
        });

        test('breaks streak on gap in days', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Test Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return id;
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await userIdentity.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Today',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    updatedValue: 20,
                    updateDate: today.getTime() - DAY_MS,
                    comment: 'Yesterday',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    updatedValue: 30,
                    updateDate: today.getTime() - 3 * DAY_MS,
                    comment: '3 days ago (gap)',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(2);
        });

        test('aggregates updates from multiple objectives', async () => {
            const objectiveId1 = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Objective 1',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const objectiveId2 = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Objective 2',
                    targetValue: 50,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await userIdentity.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId1,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Obj1 today',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId2,
                    updatedValue: 20,
                    updateDate: today.getTime() - DAY_MS,
                    comment: 'Obj2 yesterday',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId);
            });

            expect(streak).toBe(2);
        });
    });

    describe('calculateUserStreakInternal', () => {
        test('returns 0 when user has no objectives', async () => {
            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreakInternal(ctx, userId);
            });

            expect(streak).toBe(0);
        });

        test('returns correct streak with mutation context', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                const id = await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Test Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return id;
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await userIdentity.run(async ctx => {
                for (let i = 0; i < 5; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreakInternal(ctx, userId);
            });

            expect(streak).toBe(5);
        });
    });

    describe('calculateOrganizationStreak', () => {
        test('returns 0 when no member IDs provided', async () => {
            const streak = await userIdentity.run(async ctx => {
                return calculateOrganizationStreak(ctx, []);
            });

            expect(streak).toBe(0);
        });

        test('returns 0 when members have no objectives', async () => {
            const streak = await userIdentity.run(async ctx => {
                return calculateOrganizationStreak(ctx, [userId]);
            });

            expect(streak).toBe(0);
        });

        test('aggregates streak from multiple members', async () => {
            const randomSuffix = Math.random().toString(36).substring(2, 15);
            const user2 = {
                userId: 'test-user-calcs2-' + randomSuffix,
                email: 'calcs2-test@example.com-' + randomSuffix,
                name: 'Calcs2 Test User',
                password: 'test-password',
                role: 'member',
                emailVerified: false,
            };

            await createTestUser(t, user2);

            await createTestMember(t, {
                organizationId: organizationId,
                userId: user2.userId,
                role: 'member',
            });

            const objectiveId1 = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'User1 Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const objectiveId2 = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: user2.userId,
                    organizationId: organizationId,
                    title: 'User2 Objective',
                    targetValue: 50,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await userIdentity.run(async ctx => {
                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId1,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'User1 today',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId2,
                    updatedValue: 20,
                    updateDate: today.getTime() - DAY_MS,
                    comment: 'User2 yesterday',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateOrganizationStreak(ctx, [userId, user2.userId]);
            });

            expect(streak).toBe(2);
        });

        test('returns correct streak for organization with 7 day streak', async () => {
            const objectiveId = await userIdentity.run(async ctx => {
                return await ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'Org Objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);

            await userIdentity.run(async ctx => {
                for (let i = 0; i < 7; i++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateOrganizationStreak(ctx, [userId]);
            });

            expect(streak).toBe(7);
        });
    });
});
