import { beforeEach, describe, expect, test } from 'vitest';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, createTestMember } from './test_helpers';
import { TestConvexForDataModel } from 'convex-test';
import { DataModel } from '../_generated/dataModel';
import {
    calculateUserStreak,
    calculateOrganizationStreak,
} from '../domain/achievements/calculations';
import { TIME } from '../utils/constants';
import { Id } from '../_generated/dataModel';

describe('achievements calculations', async () => {
    const t = initConvexTest();
    let userIdentity: TestConvexForDataModel<DataModel>;
    let userId: Id<'user'>;
    let organizationId: Id<'organization'>;
    const DAY_MS = TIME.DAY_MS;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const userData = await createTestUser(t, {
            userId: 'test-user-calcs-' + randomSuffix,
            email: 'calcs-test@example.com-' + randomSuffix,
            name: 'Calcs Test User ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: false,
        });
        userId = userData.docId;

        const orgId = await createTestOrganization(t, {
            name: 'Calcs Org ' + randomSuffix,
            slug: 'calcs-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId: orgId,
            userId,
            role: 'owner',
        });

        organizationId = orgId;

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

    describe('calculateUserStreak', () => {
        test('returns 0 when user has no objectives', async () => {
            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
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
                return calculateUserStreak(ctx, userId, organizationId);
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
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Today update',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
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
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 10,
                    updateDate: yesterday.getTime(),
                    comment: 'Yesterday update',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
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
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 10,
                    updateDate: twoDaysAgo.getTime(),
                    comment: 'Two days ago update',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
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
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Update 1',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 20,
                    updateDate: today.getTime() + 3600000,
                    comment: 'Update 2',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 30,
                    updateDate: today.getTime() + 7200000,
                    comment: 'Update 3',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
            });

            expect(streak).toBe(1);
        });

        test('counts the full streak even with thousands of same-window updates', async () => {
            // 40 updates/day over 30 consecutive days = 1200 updates. A fixed
            // .take(1000) would truncate to the most recent ~25 days; streaming
            // until the first day-gap must still report the full 30-day streak.
            const objectiveId = await userIdentity.run(async ctx => {
                return ctx.db.insert('objectives', {
                    userId: userId,
                    organizationId: organizationId,
                    title: 'High volume objective',
                    targetValue: 100,
                    currentValue: 0,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const today = new Date();
            today.setHours(12, 0, 0, 0);
            const days = 30;
            const updatesPerDay = 40;

            await userIdentity.run(async ctx => {
                for (let day = 0; day < days; day++) {
                    const dayStart = today.getTime() - day * DAY_MS;
                    for (let j = 0; j < updatesPerDay; j++) {
                        await ctx.db.insert('progressUpdates', {
                            objective: objectiveId,
                            userId: userId,
                            organizationId: organizationId,
                            updatedValue: j,
                            updateDate: dayStart + j * 1000,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        });
                    }
                }
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
            });

            expect(streak).toBe(days);
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
                        userId: userId,
                        organizationId: organizationId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
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
                        userId: userId,
                        organizationId: organizationId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
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
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Today',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 20,
                    updateDate: today.getTime() - DAY_MS,
                    comment: 'Yesterday',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId,
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 30,
                    updateDate: today.getTime() - 3 * DAY_MS,
                    comment: '3 days ago (gap)',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
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
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'Obj1 today',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId2,
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 20,
                    updateDate: today.getTime() - DAY_MS,
                    comment: 'Obj2 yesterday',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
            });

            expect(streak).toBe(2);
        });
    });

    describe('calculateUserStreak', () => {
        test('returns 0 when user has no objectives', async () => {
            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
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
                        userId: userId,
                        organizationId: organizationId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateUserStreak(ctx, userId, organizationId);
            });

            expect(streak).toBe(5);
        });
    });

    describe('calculateOrganizationStreak', () => {
        test('returns 0 when org has no org-scoped objectives', async () => {
            const streak = await userIdentity.run(async ctx => {
                return calculateOrganizationStreak(ctx, organizationId);
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

            const user2Data = await createTestUser(t, user2);

            await createTestMember(t, {
                organizationId: organizationId,
                userId: user2Data.docId,
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
                    userId: user2Data.docId,
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
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 10,
                    updateDate: today.getTime(),
                    comment: 'User1 today',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                await ctx.db.insert('progressUpdates', {
                    objective: objectiveId2,
                    userId: userId,
                    organizationId: organizationId,
                    updatedValue: 20,
                    updateDate: today.getTime() - DAY_MS,
                    comment: 'User2 yesterday',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateOrganizationStreak(ctx, organizationId);
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
                        userId: userId,
                        organizationId: organizationId,
                        updatedValue: (i + 1) * 10,
                        updateDate: today.getTime() - i * DAY_MS,
                        comment: `Day ${i + 1}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            });

            const streak = await userIdentity.run(async ctx => {
                return calculateOrganizationStreak(ctx, organizationId);
            });

            expect(streak).toBe(7);
        });
    });
});
