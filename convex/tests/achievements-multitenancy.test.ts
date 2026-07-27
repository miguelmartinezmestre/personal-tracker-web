import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { calculateUserStreak } from '../domain/achievements/calculations';
import { TIME } from '../utils/constants';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestObjective,
    createTestOrganization,
    createTestUser,
} from './test_helpers';
import { identityFor } from './test_identities';

describe('achievements multi-tenancy', () => {
    const t = initConvexTest();
    let userId: Id<'user'>;
    let outsiderId: Id<'user'>;
    let firstOrganizationId: Id<'organization'>;
    let secondOrganizationId: Id<'organization'>;
    let userIdentity: ReturnType<typeof t.withIdentity>;

    beforeEach(async () => {
        const suffix = Math.random().toString(36).slice(2, 10);
        const user = await createTestUser(t, {
            userId: `achievement-user-${suffix}`,
            email: `achievement-user-${suffix}@example.com`,
            name: 'Achievement user',
            role: 'globalAdmin',
        });
        const outsider = await createTestUser(t, {
            userId: `achievement-outsider-${suffix}`,
            email: `achievement-outsider-${suffix}@example.com`,
            name: 'Achievement outsider',
            role: 'user',
        });
        userId = user.docId;
        outsiderId = outsider.docId;
        firstOrganizationId = await createTestOrganization(t, {
            name: `First achievement organization ${suffix}`,
            slug: `first-achievement-organization-${suffix}`,
        });
        secondOrganizationId = await createTestOrganization(t, {
            name: `Second achievement organization ${suffix}`,
            slug: `second-achievement-organization-${suffix}`,
        });
        await createTestMember(t, {
            organizationId: firstOrganizationId,
            userId,
            role: 'owner',
        });
        await createTestMember(t, {
            organizationId: secondOrganizationId,
            userId,
            role: 'member',
        });
        userIdentity = t.withIdentity(identityFor(user));
        await userIdentity.mutation(api.achievements.seedAchievementDefinitions, {});
    });

    test('aggregates an individual achievement across organizations', async () => {
        for (let index = 0; index < 3; index++) {
            await createTestObjective(t, {
                userId,
                organizationId: firstOrganizationId,
                title: `First organization objective ${index}`,
                targetValue: 100,
            });
        }
        for (let index = 0; index < 2; index++) {
            await createTestObjective(t, {
                userId,
                organizationId: secondOrganizationId,
                title: `Second organization objective ${index}`,
                targetValue: 100,
            });
        }

        await t.mutation(internal.achievements.checkUserAchievements, {
            userId,
            organizationId: firstOrganizationId,
            trigger: 'objective_created',
        });

        const progress = await userIdentity.query(api.achievements.getUserAchievementProgress, {});
        expect(
            progress.find(item => item.definition.code === 'objectives_created_5')
        ).toMatchObject({
            currentProgress: 5,
            isEarned: true,
        });
    });

    test('rejects a streak calculation for a non-member', async () => {
        await expect(
            t.run(ctx => calculateUserStreak(ctx, outsiderId, firstOrganizationId))
        ).rejects.toThrow(/FORBIDDEN|not a member/i);
    });

    test('does not mix streak activity from different organizations', async () => {
        const firstObjectiveId = await createTestObjective(t, {
            userId,
            organizationId: firstOrganizationId,
            title: 'First organization streak',
            targetValue: 100,
        });
        const secondObjectiveId = await createTestObjective(t, {
            userId,
            organizationId: secondOrganizationId,
            title: 'Second organization streak',
            targetValue: 100,
        });
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        await t.run(async ctx => {
            for (let index = 0; index < 2; index++) {
                await ctx.db.insert('progressUpdates', {
                    objective: firstObjectiveId,
                    createdBy: userId,
                    organizationId: firstOrganizationId,
                    updatedValue: index + 1,
                    updateDate: today.getTime() - index * TIME.DAY_MS,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
            for (let index = 0; index < 4; index++) {
                await ctx.db.insert('progressUpdates', {
                    objective: secondObjectiveId,
                    createdBy: userId,
                    organizationId: secondOrganizationId,
                    updatedValue: index + 1,
                    updateDate: today.getTime() - index * TIME.DAY_MS,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
        });

        expect(await t.run(ctx => calculateUserStreak(ctx, userId, firstOrganizationId))).toBe(2);
        expect(await t.run(ctx => calculateUserStreak(ctx, userId, secondOrganizationId))).toBe(4);
    });
});
