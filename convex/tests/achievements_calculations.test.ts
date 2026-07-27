import { beforeEach, describe, expect, test } from 'vitest';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import type { DataModel, Id } from '../_generated/dataModel';
import type { TestConvexForDataModel } from 'convex-test';
import {
    calculateGlobalUserStreak,
    calculateOrganizationStreak,
    calculateUserStreak,
} from '../domain/achievements/calculations';
import { TIME } from '../utils/constants';

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
        organizationId = await createTestOrganization(t, {
            name: 'Calcs Org ' + randomSuffix,
            slug: 'calcs-org-' + randomSuffix,
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

    async function createObjective(ownerId = userId) {
        return await userIdentity.run(async ctx => {
            return await ctx.db.insert('objectives', {
                createdBy: ownerId,
                ownerId,
                visibility: 'private',
                organizationId,
                title: 'Streak Objective',
                targetValue: 100,
                currentValue: 0,
                status: 'active',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });
    }

    async function addProgress(objectiveId: Id<'objectives'>, updateDate: number, actor = userId) {
        await userIdentity.run(async ctx => {
            await ctx.db.insert('progressUpdates', {
                objective: objectiveId,
                createdBy: actor,
                organizationId,
                updatedValue: 10,
                updateDate,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        });
    }

    function noonToday() {
        const today = new Date();
        return Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12);
    }

    test('calculateUserStreak returns zero when there is no qualifying progress', async () => {
        await expect(
            userIdentity.run(ctx => calculateUserStreak(ctx, userId, organizationId))
        ).resolves.toBe(0);

        await createObjective();
        await expect(
            userIdentity.run(ctx => calculateUserStreak(ctx, userId, organizationId))
        ).resolves.toBe(0);
    });

    test('calculateUserStreak handles current activity and stale activity boundaries', async () => {
        const objectiveId = await createObjective();
        const today = noonToday();

        await addProgress(objectiveId, today);
        await expect(
            userIdentity.run(ctx => calculateUserStreak(ctx, userId, organizationId))
        ).resolves.toBe(1);

        await addProgress(objectiveId, today - DAY_MS);
        await expect(
            userIdentity.run(ctx => calculateUserStreak(ctx, userId, organizationId))
        ).resolves.toBe(2);

        await addProgress(objectiveId, today - 4 * DAY_MS);
        await expect(
            userIdentity.run(ctx => calculateUserStreak(ctx, userId, organizationId))
        ).resolves.toBe(2);
    });

    test('calculateUserStreak ignores updates from a future UTC day', async () => {
        const objectiveId = await createObjective();
        const now = Date.now();

        await addProgress(objectiveId, now + 2 * DAY_MS);
        await addProgress(objectiveId, now);

        await expect(
            userIdentity.run(ctx => calculateUserStreak(ctx, userId, organizationId))
        ).resolves.toBe(1);
    });

    test('calculateUserStreak deduplicates same-day updates and aggregates objectives', async () => {
        const firstObjectiveId = await createObjective();
        const secondObjectiveId = await createObjective();
        const today = noonToday();

        await addProgress(firstObjectiveId, today);
        await addProgress(firstObjectiveId, today + 3600000);
        await addProgress(secondObjectiveId, today - DAY_MS);

        await expect(
            userIdentity.run(ctx => calculateUserStreak(ctx, userId, organizationId))
        ).resolves.toBe(2);
    });

    test('calculateUserStreak streams enough updates to avoid old scan-window truncation', async () => {
        const objectiveId = await createObjective();
        const today = noonToday();
        const days = 30;

        await userIdentity.run(async ctx => {
            for (let day = 0; day < days; day++) {
                const dayStart = today - day * DAY_MS;
                for (let update = 0; update < 40; update++) {
                    await ctx.db.insert('progressUpdates', {
                        objective: objectiveId,
                        createdBy: userId,
                        organizationId,
                        updatedValue: update,
                        updateDate: dayStart + update * 1000,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            }
        });

        await expect(
            userIdentity.run(ctx => calculateUserStreak(ctx, userId, organizationId))
        ).resolves.toBe(days);
    });

    test('calculateUserStreak stops at the first day gap', async () => {
        const objectiveId = await createObjective();
        const today = noonToday();

        await addProgress(objectiveId, today);
        await addProgress(objectiveId, today - DAY_MS);
        await addProgress(objectiveId, today - 3 * DAY_MS);

        await expect(
            userIdentity.run(ctx => calculateUserStreak(ctx, userId, organizationId))
        ).resolves.toBe(2);
    });

    test('calculateGlobalUserStreak joins consecutive activity across organizations', async () => {
        const firstObjectiveId = await createObjective();
        const secondOrganizationId = await createTestOrganization(t, {
            name: `Second streak org ${Math.random()}`,
            slug: `second-streak-${Math.random().toString(36).slice(2)}`,
        });
        await createTestMember(t, {
            organizationId: secondOrganizationId,
            userId,
            role: 'member',
        });
        const secondObjectiveId = await userIdentity.run(ctx =>
            ctx.db.insert('objectives', {
                createdBy: userId,
                ownerId: userId,
                visibility: 'private',
                organizationId: secondOrganizationId,
                title: 'Cross-organization streak objective',
                targetValue: 100,
                currentValue: 0,
                status: 'active',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            })
        );
        const today = noonToday();

        await addProgress(firstObjectiveId, today);
        await userIdentity.run(ctx =>
            ctx.db.insert('progressUpdates', {
                objective: secondObjectiveId,
                createdBy: userId,
                organizationId: secondOrganizationId,
                updatedValue: 10,
                updateDate: today - DAY_MS,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            })
        );

        await expect(userIdentity.run(ctx => calculateGlobalUserStreak(ctx, userId))).resolves.toBe(
            2
        );
    });

    test('calculateOrganizationStreak returns zero when the organization has no progress', async () => {
        await expect(
            userIdentity.run(ctx => calculateOrganizationStreak(ctx, organizationId))
        ).resolves.toBe(0);
    });

    test('calculateOrganizationStreak aggregates progress from multiple members', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const user2 = await createTestUser(t, {
            userId: 'test-user-calcs2-' + randomSuffix,
            email: 'calcs2-test@example.com-' + randomSuffix,
            name: 'Calcs2 Test User',
            password: 'test-password',
            role: 'member',
            emailVerified: false,
        });
        await createTestMember(t, {
            organizationId,
            userId: user2.docId,
            role: 'member',
        });

        const firstObjectiveId = await createObjective(userId);
        const secondObjectiveId = await createObjective(user2.docId);
        const today = noonToday();

        await addProgress(firstObjectiveId, today, userId);
        await addProgress(secondObjectiveId, today - DAY_MS, user2.docId);

        await expect(
            userIdentity.run(ctx => calculateOrganizationStreak(ctx, organizationId))
        ).resolves.toBe(2);
    });

    test('calculateOrganizationStreak counts a seven-day organization streak', async () => {
        const objectiveId = await createObjective();
        const today = noonToday();

        for (let i = 0; i < 7; i++) {
            await addProgress(objectiveId, today - i * DAY_MS);
        }

        await expect(
            userIdentity.run(ctx => calculateOrganizationStreak(ctx, organizationId))
        ).resolves.toBe(7);
    });
});
